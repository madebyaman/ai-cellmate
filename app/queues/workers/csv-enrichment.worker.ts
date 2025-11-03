import { Worker, UnrecoverableError } from "bullmq";
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
import { publishEnrichmentEvent } from "~/lib/redis-event-publisher";
import { createEnrichmentEvent } from "~/lib/enrichment-events";
import {
  checkCancellationFlag,
  clearCancellationFlag,
} from "~/lib/enrichment-cancellation.server";
import { deductCredits } from "~/utils/auth.server";

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
    {
      connection: redisConnection,
    },
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

    // Get organization ID - first check if table has organizationId, otherwise query for it
    let organizationId: string | undefined = run.table.organizationId;
    if (!organizationId) {
      const userMember = await prisma.member.findFirst({
        where: { userId },
        select: { organizationId: true },
      });
      organizationId = userMember?.organizationId;
    }

    if (!organizationId) {
      throw new Error(
        "Could not determine organization for this enrichment job",
      );
    }

    console.log(`[CREDITS] Organization ID: ${organizationId}`);

    // Check credits before starting enrichment
    const currentCredits = await prisma.credits.findUnique({
      where: { organizationId },
      select: { amount: true },
    });

    const creditsBalance = currentCredits?.amount ?? 0;
    console.log(`[CREDITS] Current balance: ${creditsBalance}`);

    if (creditsBalance < 1) {
      console.log(`[CREDITS] Insufficient credits - cancelling enrichment`);

      // Update Run status to FAILED
      await prisma.run.update({
        where: { id: runId },
        data: { status: "FAILED", finishedAt: new Date() },
      });

      // Publish insufficient-credits event
      await publishEnrichmentEvent(
        run.table.id,
        createEnrichmentEvent("insufficient-credits", {
          message: "You have insufficient credits to continue enrichment",
          creditsRemaining: creditsBalance,
        }),
      );

      console.log(`[CREDITS] Insufficient credits event published`);
      await sdk.shutdown();

      // Throw UnrecoverableError to prevent BullMQ from retrying
      throw new UnrecoverableError("Insufficient credits for enrichment");
    }

    // 5. Process each row
    for (let i = 0; i < run.table.rows.length; i++) {
      const row = run.table.rows[i];

      // Check for cancellation before processing each row
      const isCancelled = await checkCancellationFlag(runId);
      if (isCancelled) {
        console.log(
          `[CANCELLATION] Detected for run ${runId}, stopping enrichment`,
        );

        // Update Run status to CANCELLED
        await prisma.run.update({
          where: { id: runId },
          data: { status: "CANCELLED", finishedAt: new Date() },
        });

        // Clear the cancellation flag
        await clearCancellationFlag(runId);

        // Publish cancelled event
        await publishEnrichmentEvent(
          run.table.id,
          createEnrichmentEvent("cancelled", {
            reason: "Cancelled by user",
          }),
        );

        console.log(`[CANCELLATION] Run ${runId} cancelled successfully`);

        // Shutdown SDK and return early
        await sdk.shutdown();

        return {
          success: false,
          userId,
          processedAt: new Date().toISOString(),
        };
      }

      console.log(
        `\n[ROW ${i + 1}/${run.table.rows.length}] Starting enrichment`,
      );

      // Check credits before processing each row
      const rowCredits = await prisma.credits.findUnique({
        where: { organizationId },
        select: { amount: true },
      });

      const rowCreditsBalance = rowCredits?.amount ?? 0;
      console.log(`[CREDITS] Pre-row check - Balance: ${rowCreditsBalance}`);

      if (rowCreditsBalance < 1) {
        console.log(
          `[CREDITS] Insufficient credits at row ${i + 1} - stopping enrichment`,
        );

        // Update Run status to FAILED
        await prisma.run.update({
          where: { id: runId },
          data: { status: "FAILED", finishedAt: new Date() },
        });

        // Publish insufficient-credits event
        await publishEnrichmentEvent(
          run.table.id,
          createEnrichmentEvent("insufficient-credits", {
            message: "You have insufficient credits to continue enrichment",
            creditsRemaining: rowCreditsBalance,
          }),
        );

        console.log(
          `[CREDITS] Insufficient credits event published for row ${i + 1}`,
        );
        await sdk.shutdown();

        // Throw UnrecoverableError to prevent BullMQ from retrying
        throw new UnrecoverableError("Insufficient credits for enrichment");
      }

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

      // Emit row-start event
      console.log(`[PUBLISH] row-start - Row ${row.position} (${row.id})`);
      await publishEnrichmentEvent(
        run.table.id,
        createEnrichmentEvent("row-start", {
          rowId: row.id,
          rowPosition: row.position,
        }),
      );
      console.log(`[PUBLISH] row-start event sent successfully`);

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
        // Run agent loop with tableId and runId for event emission and cancellation
        const agentResult = await runAgentLoop({
          row: rowContext,
          headers: enrichmentColumnNames,
          concurrency: 3,
          langfuseTraceId: rowTrace.id,
          prompt: enrichmentPrompt,
          websites: websites,
          tableId: run.table.id,
          rowId: row.id,
          rowPosition: row.position,
          currentRowIndex: i,
          totalRows: run.table.rows.length,
          runId: runId,
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

        // Deduct credits for filled cells
        const cellsFilledCount = agentResult.filledCellsCount || 0;
        if (cellsFilledCount > 0) {
          console.log(
            `[CREDITS] Deducting ${cellsFilledCount} credit(s) for ${cellsFilledCount} filled cell(s)`,
          );
          const deductResult = await deductCredits(
            organizationId,
            cellsFilledCount,
          );
          if (deductResult.success) {
            console.log(
              `[CREDITS] Deduction successful - New balance: ${deductResult.newBalance}`,
            );
          } else {
            console.error(`[CREDITS] Deduction failed: ${deductResult.error}`);
            // If deduction fails, still continue but log the issue
          }
        } else {
          console.log(`[CREDITS] No cells filled - no credits deducted`);
        }

        // Emit stage-start for "Saving"
        console.log(`[PUBLISH] stage-start - Saving`);
        await publishEnrichmentEvent(
          run.table.id,
          createEnrichmentEvent("stage-start", {
            stage: "Saving",
          }),
        );
        console.log(`[PUBLISH] stage-start (Saving) event sent successfully`);

        // Create CellVersions for enriched data and emit cell-update events
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

              // Emit cell-update event
              console.log(
                `[PUBLISH] cell-update - Row ${row.position}, Column ${enrichmentCol.name}`,
              );
              await publishEnrichmentEvent(
                run.table.id,
                createEnrichmentEvent("cell-update", {
                  rowId: row.id,
                  columnId: enrichmentCol.id,
                  columnName: enrichmentCol.name,
                  value: value,
                }),
              );
              console.log(`[PUBLISH] cell-update event sent successfully`);
            }
          }
        }

        // Emit stage-complete for "Saving"
        console.log(`[PUBLISH] stage-complete - Saving`);
        await publishEnrichmentEvent(
          run.table.id,
          createEnrichmentEvent("stage-complete", {
            stage: "Saving",
          }),
        );
        console.log(
          `[PUBLISH] stage-complete (Saving) event sent successfully`,
        );

        // Emit row-complete event
        console.log(
          `[PUBLISH] row-complete - Row ${row.position} (${row.id}), filled ${filledCount}/${enrichmentColumnNames.length}`,
        );
        await publishEnrichmentEvent(
          run.table.id,
          createEnrichmentEvent("row-complete", {
            rowId: row.id,
            rowPosition: row.position,
            columnsFilled: filledCount,
            columnsTotal: enrichmentColumnNames.length,
          }),
        );
        console.log(`[PUBLISH] row-complete event sent successfully`);

        rowTrace.update({
          output: {
            enrichedRow: agentResult.enrichedRow,
            cycles: agentResult.cycles,
            success: agentResult.success,
          },
        });
      } catch (error) {
        console.error(`[ROW ${i + 1}/${run.table.rows.length}] ERROR:`, error);

        // Emit row-failed event
        console.log(
          `[PUBLISH] row-failed - Row ${row.position} (${row.id}), reason: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        await publishEnrichmentEvent(
          run.table.id,
          createEnrichmentEvent("row-failed", {
            rowId: row.id,
            rowPosition: row.position,
            reason: error instanceof Error ? error.message : "Unknown error",
          }),
        );
        console.log(`[PUBLISH] row-failed event sent successfully`);

        rowTrace.update({
          metadata: {
            error: error instanceof Error ? error.message : "Unknown error",
          },
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

    // 8. Emit complete event
    console.log(`[PUBLISH] complete - All rows processed`);
    await publishEnrichmentEvent(
      run.table.id,
      createEnrichmentEvent("complete", {}),
    );
    console.log(`[PUBLISH] complete event sent successfully`);

    await sdk.shutdown();

    console.log(`[RUN COMPLETED] Run ${runId} finished successfully`);

    return {
      success: true,
      userId,
      processedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[RUN FAILED] Error:`, error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Update Run status to FAILED
    await prisma.run.update({
      where: { id: runId },
      data: {
        status: "FAILED",
        error: errorMessage,
        finishedAt: new Date(),
      },
    });

    await sdk.shutdown();

    // Re-throw the error (UnrecoverableError will prevent retries by BullMQ)
    if (error instanceof UnrecoverableError) {
      throw error;
    }

    throw new Error(`CSV enrichment failed: ${errorMessage}`);
  }
}
