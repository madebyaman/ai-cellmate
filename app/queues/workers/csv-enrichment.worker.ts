import { Worker } from 'bullmq';
import { redisConnection } from '../config';
import type {
  CsvEnrichmentJobData,
  CsvEnrichmentJobDataUnion,
  CsvEnrichmentJobResult,
} from '../types';
import { readFile } from 'fs/promises';
import { Langfuse } from 'langfuse';
import { enrichRow } from '~/utils/enrich-row';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { LangfuseExporter } from 'langfuse-vercel';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const langfuse = new Langfuse({
  environment: process.env.NODE_ENV ?? 'development',
  secretKey: process.env.LANGFUSE_SECRET_KEY ?? '',
  publicKey: process.env.LANGFUSE_PUBLIC_KEY ?? '',
  baseUrl: process.env.LANGFUSE_BASE_URL ?? 'https://cloud.langfuse.com',
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
    'csv-enrichment',
    async (job) => {
      console.log(`Processing CSV enrichment job: ${job.name}:${job.id}`);

      switch (job.name) {
        case 'enrich-csv':
          return await processCsvEnrichment(job.data as CsvEnrichmentJobData);
        default:
          throw new Error(`Unknown CSV enrichment job type: ${job.name}`);
      }
    },
    { connection: redisConnection }
  );
}

async function processCsvEnrichment(
  data: CsvEnrichmentJobData
): Promise<CsvEnrichmentJobResult> {
  sdk.start();
  const {
    csvUrl,
    csvContent,
    enrichmentPrompt = 'Enhance the data in this CSV',
    userId,
  } = data;

  try {
    // Step 1: Get the CSV data
    let csvData: string;
    if (csvContent) {
      // Use provided content directly
      csvData = csvContent;
      console.log(
        `Using provided CSV content (${csvContent.length} characters)`
      );
    } else if (csvUrl?.startsWith('file://')) {
      // Handle local file URLs
      const filePath = csvUrl.replace('file://', '');
      csvData = await readFile(filePath, 'utf-8');
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
      throw new Error('Either csvUrl or csvContent must be provided');
    }

    // Step 2: Parse CSV into row objects { header: value }
    const { headers, rows } = parseCsvToRowObjects(csvData);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      const rowTrace = langfuse.trace({
        sessionId: userId,
        name: `enrich-row-${i + 1}`,
        input: { row, headers },
        metadata: {
          rowIndex: i + 1,
          totalRows: rows.length,
          // parentTraceId: trace.id,
        },
      });

      try {
        const enrichedRow = await enrichRow({
          headers,
          row,
          telemetry: {
            isEnabled: true,
            functionId: 'enrich-row',
            metadata: {
              langfuseTraceId: rowTrace.id,
            },
          },
        });

        rowTrace.update({
          output: { enrichedRow },
        });
      } catch (error) {
        rowTrace.span({
          level: 'ERROR',
          statusMessage:
            error instanceof Error ? error.message : 'Unknown error',
          metadata: {
            langfuseTraceId: rowTrace.id,
          },
        });
        throw error;
      }
    }

    await langfuse.flushAsync();
    await sdk.shutdown();

    console.log(`CSV enrichment completed for user: ${userId}`);
    return {
      success: true,
      userId,
      processedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('CSV enrichment failed:', error);
    throw new Error(
      `CSV enrichment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Minimal CSV parser that supports common delimiters and trims whitespace.
function parseCsvToRowObjects(csvText: string): {
  headers: string[];
  rows: Array<Record<string, string>>;
} {
  const normalized = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rawLines = normalized.split('\n');
  const lines = rawLines
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l !== '-');

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
      row[headers[c]] = parts[c] ?? '';
    }
    rows.push(row);
  }

  return { headers, rows };
}

function detectDelimiter(headerLine: string): string {
  const candidates = [',', '|', '\t', ';'];
  let best = ',';
  let bestCount = -1;
  for (const d of candidates) {
    const count = (headerLine.match(new RegExp(`\\${d}`, 'g')) || []).length;
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}
