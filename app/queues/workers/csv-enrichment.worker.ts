import { Worker } from "bullmq";
import { redisConnection } from "../config";
import type {
  CsvEnrichmentJobData,
  CsvEnrichmentJobDataUnion,
  CsvEnrichmentJobResult,
} from "../types";
import { Langfuse } from "langfuse";
import { runAgentLoop } from "~/agent/agent-loop";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseExporter } from "langfuse-vercel";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { prisma } from "~/lib/prisma.server";
import { updateCachedTable } from "~/lib/cached-table.server";

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
  const { runId, userId } = data;

  console.log(`[RUN STARTED] Run ID: ${runId}`);

  try {
    // 1. Fetch Run with all relations
    console.log(`[DATA FETCHING] Loading run and table data...`);
    const run = await prisma.run.findUnique({
      where: { id: runId },
      include: {
        table: {
          include: {
            columns: {
              orderBy: { position: "asc" },
              include: { hint: true },
            },
            rows: {
              orderBy: { position: "asc" },
              include: {
                cells: {
                  include: {
                    cellVersions: {
                      where: { picked: true },
                      orderBy: { createdAt: "desc" },
                      take: 1,
                    },
                  },
                },
              },
            },
            hint: true,
          },
        },
      },
    });

    if (!run) {
      throw new Error(`Run with id ${runId} not found`);
    }

    // 2. Update Run status to RUNNING
    console.log(`[RUN STATUS] Updating to RUNNING`);
    await prisma.run.update({
      where: { id: runId },
      data: { status: "RUNNING", startedAt: new Date() },
    });

    // 3. Separate columns by type
    const sourceColumns = run.table.columns.filter((c) => c.type === "SOURCE");
    const enrichmentColumns = run.table.columns.filter(
      (c) => c.type === "ENRICHMENT",
    );

    console.log(
      `[DATA LOADED] ${run.table.rows.length} rows, ${sourceColumns.length} source columns, ${enrichmentColumns.length} enrichment columns`,
    );

    // 4. Get table hint (always exists)
    const tableHint = run.table.hint;
    if (!tableHint) {
      throw new Error(`Table ${run.table.id} has no hint`);
    }

    console.log(
      `[TABLE HINT] Prompt: ${tableHint.prompt?.substring(0, 100)}...`,
    );
    console.log(
      `[TABLE HINT] Websites: ${tableHint.websites.join(", ") || "none"}`,
    );

    // 5. Process each row
    for (let i = 0; i < run.table.rows.length; i++) {
      const row = run.table.rows[i];
      console.log(
        `\n[ROW ${i + 1}/${run.table.rows.length}] Starting enrichment`,
      );

      // Build row context from SOURCE columns
      const rowContext: Record<string, string> = {};
      for (const sourceCol of sourceColumns) {
        const cell = row.cells.find((c) => c.columnId === sourceCol.id);
        const pickedVersion = cell?.cellVersions[0];
        rowContext[sourceCol.name] = pickedVersion?.value || "";
      }

      console.log(
        `[ROW ${i + 1}/${run.table.rows.length}] SOURCE data:`,
        rowContext,
      );

      // Get enrichment column names
      const enrichmentColumnNames = enrichmentColumns.map((c) => c.name);
      console.log(
        `[ROW ${i + 1}/${run.table.rows.length}] Target columns: ${enrichmentColumnNames.join(", ")}`,
      );

      // Combine hints (table + column-specific)
      let enrichmentPrompt = tableHint.prompt || "Enrich the data";

      // Add column-specific hints if they exist
      const columnHints = enrichmentColumns
        .filter((col) => col.hint && col.hint.prompt)
        .map((col) => `- ${col.name}: ${col.hint!.prompt}`)
        .join("\n");

      if (columnHints) {
        enrichmentPrompt += `\n\nColumn-specific instructions:\n${columnHints}`;
      }

      const websites = tableHint.websites || [];

      // Also collect any column-specific websites
      enrichmentColumns.forEach((col) => {
        if (col.hint && col.hint.websites && col.hint.websites.length > 0) {
          websites.push(...col.hint.websites);
        }
      });

      console.log(
        `[ROW ${i + 1}/${run.table.rows.length}] Prompt: ${enrichmentPrompt.substring(0, 100)}...`,
      );
      console.log(
        `[ROW ${i + 1}/${run.table.rows.length}] Websites: ${websites.join(", ") || "none"}`,
      );

      const rowTrace = langfuse.trace({
        sessionId: userId,
        name: `enrich-row-${i + 1}`,
        input: { row: rowContext, enrichmentColumns: enrichmentColumnNames },
        metadata: {
          rowIndex: i + 1,
          totalRows: run.table.rows.length,
          runId,
        },
      });

      try {
        // Run agent loop
        const agentResult = await runAgentLoop({
          row: rowContext,
          headers: enrichmentColumnNames,
          concurrency: 3,
          langfuseTraceId: rowTrace.id,
          prompt: enrichmentPrompt,
          websites: websites,
        });

        console.log(
          `[ROW ${i + 1}/${run.table.rows.length}] Agent loop completed - ${agentResult.cycles} cycles`,
        );
        console.log(
          `[ROW ${i + 1}/${run.table.rows.length}] Success: ${agentResult.success}`,
        );

        const filledCount = enrichmentColumnNames.filter(
          (name) =>
            agentResult.enrichedRow[name] &&
            agentResult.enrichedRow[name].trim() !== "" &&
            agentResult.enrichedRow[name] !== "-",
        ).length;
        console.log(
          `[ROW ${i + 1}/${run.table.rows.length}] Filled: ${filledCount}/${enrichmentColumnNames.length} columns`,
        );

        // Create CellVersions for enriched data
        for (const enrichmentCol of enrichmentColumns) {
          const value = agentResult.enrichedRow[enrichmentCol.name];
          if (value && value.trim() !== "" && value !== "-") {
            const cell = row.cells.find((c) => c.columnId === enrichmentCol.id);
            if (cell) {
              await prisma.cellVersions.create({
                data: {
                  cellId: cell.id,
                  runId: runId,
                  value: value,
                  origin: "AI",
                  picked: true,
                  pickedAt: new Date(),
                },
              });
              console.log(
                `[CELL VERSION] Created for ${enrichmentCol.name}: "${value.substring(0, 50)}..."`,
              );
            }
          }
        }

        rowTrace.update({
          output: {
            enrichedRow: agentResult.enrichedRow,
            cycles: agentResult.cycles,
            success: agentResult.success,
          },
        });
      } catch (error) {
        console.error(
          `[ROW ${i + 1}/${run.table.rows.length}] ERROR:`,
          error,
        );
        rowTrace.update({
          metadata: { error: error instanceof Error ? error.message : "Unknown error" },
        });
      }
    }

    // 6. Update Run status to COMPLETED
    console.log(`[RUN STATUS] Updating to COMPLETED`);
    await prisma.run.update({
      where: { id: runId },
      data: { status: "COMPLETED", finishedAt: new Date() },
    });

    // 7. Regenerate cache
    console.log(`[CACHE UPDATE] Regenerating cached table...`);
    await updateCachedTable(run.table.id);
    console.log(`[CACHE UPDATED] Table ${run.table.id}`);

    await sdk.shutdown();

    console.log(`[RUN COMPLETED] Run ${runId} finished successfully`);

    return {
      success: true,
      userId,
      processedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[RUN FAILED] Error:`, error);

    // Update Run status to FAILED
    await prisma.run.update({
      where: { id: runId },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
        finishedAt: new Date(),
      },
    });

    await sdk.shutdown();

    throw new Error(
      `CSV enrichment failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

