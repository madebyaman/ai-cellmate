import { Worker } from "bullmq";
import { redisConnection } from "../config";
import type {
  CsvEnrichmentJobData,
  CsvEnrichmentJobDataUnion,
  CsvEnrichmentJobResult,
} from "../types";
import { readFile } from "fs/promises";
import { Langfuse } from "langfuse";
import { fillRow } from "~/utils/fill-row";
import { combineResults, calculateResultMetrics } from "~/utils/result-combiner";
import { evaluateResultsSubjectively, needsOptimization } from "~/utils/subjective-evaluator";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseExporter } from "langfuse-vercel";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

const langfuse = new Langfuse({
  environment: process.env.NODE_ENV ?? "development",
  secretKey: process.env.LANGFUSE_SECRET_KEY ?? "",
  publicKey: process.env.LANGFUSE_PUBLIC_KEY ?? "",
  baseUrl: process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com",
});

const sdk = new NodeSDK({
  traceExporter: new LangfuseExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});

export function createCsvEnrichmentWorker(): Worker<
  CsvEnrichmentJobDataUnion,
  CsvEnrichmentJobResult,
  string
> {
  return new Worker<CsvEnrichmentJobDataUnion, CsvEnrichmentJobResult, string>(
    "csv-enrichment",
    async (job) => {
      console.log(`Processing CSV enrichment job: ${job.name}:${job.id}`);

      switch (job.name) {
        case "enrich-csv":
          return await processCsvEnrichment(job.data as CsvEnrichmentJobData);
        default:
          throw new Error(`Unknown CSV enrichment job type: ${job.name}`);
      }
    },
    { connection: redisConnection },
  );
}

async function processCsvEnrichment(
  data: CsvEnrichmentJobData,
): Promise<CsvEnrichmentJobResult> {
  sdk.start();
  const {
    csvUrl,
    csvContent,
    enrichmentPrompt = "Enhance the data in this CSV",
    userId,
  } = data;

  try {
    // Step 1: Get the CSV data
    let csvData: string;
    if (csvContent) {
      // Use provided content directly
      csvData = csvContent;
      console.log(
        `Using provided CSV content (${csvContent.length} characters)`,
      );
    } else if (csvUrl?.startsWith("file://")) {
      // Handle local file URLs
      const filePath = csvUrl.replace("file://", "");
      csvData = await readFile(filePath, "utf-8");
      console.log(`Reading CSV from file: ${filePath}`);
    } else if (csvUrl) {
      // Handle HTTP/HTTPS URLs
      const csvResponse = await fetch(csvUrl);
      if (!csvResponse.ok) {
        throw new Error(`Failed to fetch CSV: ${csvResponse.statusText}`);
      }
      csvData = await csvResponse.text();
      console.log(`Fetched CSV from URL: ${csvUrl}`);
    } else {
      throw new Error("Either csvUrl or csvContent must be provided");
    }

    // Step 2: Parse CSV into row objects { header: value }
    const { headers, rows } = parseCsvToRowObjects(csvData);

    const enrichedRows: Array<Record<string, string>> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      const rowTrace = langfuse.trace({
        sessionId: userId,
        name: `enrich-row-${i + 1}`,
        input: { row, headers },
        metadata: {
          rowIndex: i + 1,
          totalRows: rows.length,
        },
      });

      try {
        // Step 1: Fill row data
        console.log(`Processing row ${i + 1}/${rows.length}`);
        let searchQueryRecommendation: string | undefined;
        let attempt = 0;
        const maxAttempts = 2; // Original attempt + 1 optimization attempt

        while (attempt < maxAttempts) {
          attempt++;
          console.log(`Attempt ${attempt} for row ${i + 1}`);

          const enrichedData = await fillRow({
            headers,
            row,
            searchQueryRecommendation,
            telemetry: {
              isEnabled: true,
              functionId: "fill-row",
              metadata: {
                langfuseTraceId: rowTrace.id,
                attempt,
              },
            },
          });

          if (!enrichedData || enrichedData.length === 0) {
            console.log(`No data returned for row ${i + 1}`);
            break;
          }

          // Step 2: Combine results with domain authority scoring
          const combinedResults = combineResults(enrichedData);
          
          // Step 3: Calculate programmatic metrics
          const metrics = calculateResultMetrics(combinedResults);

          // Step 4: Subjective evaluation using LLM
          const evaluation = await evaluateResultsSubjectively(
            combinedResults,
            metrics,
            row
          );

          // Step 5: Check if optimization is needed
          const optimization = needsOptimization(evaluation);

          if (!optimization.needsOptimization || attempt === maxAttempts) {
            // Convert combined results back to row format
            const finalRow = { ...row };
            Object.entries(combinedResults).forEach(([column, data]) => {
              finalRow[column] = data.result;
            });
            
            enrichedRows.push(finalRow);
            
            rowTrace.update({
              output: { 
                finalRow,
                evaluation,
                metrics,
                attemptCount: attempt,
              },
            });

            console.log(`Row ${i + 1} completed with confidence scores:`, 
              Object.entries(evaluation).map(([col, eval]) => `${col}: ${eval.confidence.score}`).join(', ')
            );
            break;
          } else {
            // Optimization needed - use search query recommendations
            console.log(`Row ${i + 1} needs optimization. Low confidence columns:`, optimization.lowConfidenceColumns);
            
            // Use the first available recommendation for the next attempt
            const firstRecommendation = Object.values(optimization.recommendations)[0];
            searchQueryRecommendation = firstRecommendation;
            
            if (attempt < maxAttempts) {
              console.log(`Retrying with search query: ${searchQueryRecommendation}`);
            }
          }
        }
      } catch (error) {
        console.error(`Error processing row ${i + 1}:`, error);
        rowTrace.span({
          level: "ERROR",
          statusMessage:
            error instanceof Error ? error.message : "Unknown error",
          metadata: {
            langfuseTraceId: rowTrace.id,
          },
        });
        
        // Add the original row on error
        enrichedRows.push(row);
      }
    }

    // await langfuse.flushAsync();
    await sdk.shutdown();

    console.log(`CSV enrichment completed for user: ${userId}. Processed ${enrichedRows.length} rows.`);
    return {
      success: true,
      userId,
      processedAt: new Date().toISOString(),
      rowsProcessed: enrichedRows.length,
      totalRows: rows.length,
    };
  } catch (error) {
    console.error("CSV enrichment failed:", error);
    throw new Error(
      `CSV enrichment failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// Minimal CSV parser that supports common delimiters and trims whitespace.
function parseCsvToRowObjects(csvText: string): {
  headers: string[];
  rows: Array<Record<string, string>>;
} {
  const normalized = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rawLines = normalized.split("\n");
  const lines = rawLines
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l !== "-");

  if (lines.length === 0) return { headers: [], rows: [] };

  const delimiter = detectDelimiter(lines[0]);
  const headers = lines[0]
    .split(delimiter)
    .map((h) => h.trim())
    .filter((h) => h.length > 0);

  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(delimiter).map((p) => p.trim());
    const row: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      row[headers[c]] = parts[c] ?? "";
    }
    rows.push(row);
  }

  return { headers, rows };
}

function detectDelimiter(headerLine: string): string {
  const candidates = [",", "|", "\t", ";"];
  let best = ",";
  let bestCount = -1;
  for (const d of candidates) {
    const count = (headerLine.match(new RegExp(`\\${d}`, "g")) || []).length;
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}
