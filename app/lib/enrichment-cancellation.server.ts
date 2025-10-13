/**
 * Server-side utilities for cancelling enrichment jobs
 * Handles Redis cancellation flags and BullMQ job removal
 */

import IORedis from "ioredis";
import { prisma } from "~/lib/prisma.server";
import { csvEnrichmentQueue } from "~/queues/queues";
import { publishEnrichmentEvent } from "~/lib/redis-event-publisher";
import { createEnrichmentEvent } from "~/lib/enrichment-events";

// Create Redis client for cancellation flags
const redis = process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL + "?family=0", {
      maxRetriesPerRequest: null,
    })
  : new IORedis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
    });

/**
 * Set a cancellation flag in Redis for a given run
 * The flag expires after 1 hour to prevent stale data
 */
export async function setCancellationFlag(runId: string): Promise<void> {
  const key = `cancel:${runId}`;
  await redis.set(key, "1", "EX", 3600); // Expires in 1 hour
  console.log(`[CANCELLATION] Set cancellation flag for run ${runId}`);
}

/**
 * Check if a cancellation flag exists for a given run
 */
export async function checkCancellationFlag(runId: string): Promise<boolean> {
  const key = `cancel:${runId}`;
  const value = await redis.get(key);
  return value === "1";
}

/**
 * Clear the cancellation flag for a given run
 */
export async function clearCancellationFlag(runId: string): Promise<void> {
  const key = `cancel:${runId}`;
  await redis.del(key);
  console.log(`[CANCELLATION] Cleared cancellation flag for run ${runId}`);
}

/**
 * Main function to cancel an enrichment job
 * - Gets the active run for the table
 * - Sets cancellation flag in Redis
 * - Removes the BullMQ job from the queue
 * - Publishes cancelled event
 * - Updates run status to CANCELLED
 */
export async function cancelEnrichment(
  tableId: string,
  organizationId: string
): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`[CANCEL] Starting cancellation for table ${tableId}`);

    // Get the table and its active run
    const table = await prisma.table.findFirst({
      where: {
        id: tableId,
        organizationId,
      },
      include: {
        runs: {
          where: {
            status: {
              in: ["PENDING", "RUNNING"],
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    if (!table) {
      return { success: false, message: "Table not found" };
    }

    if (table.runs.length === 0) {
      return { success: false, message: "No active enrichment job found" };
    }

    const run = table.runs[0];
    console.log(`[CANCEL] Found active run ${run.id} with status ${run.status}`);

    // Set cancellation flag in Redis
    await setCancellationFlag(run.id);

    // Try to find and remove the BullMQ job
    try {
      const jobs = await csvEnrichmentQueue.getJobs(["waiting", "active", "delayed"]);
      const jobToCancel = jobs.find((job) => job.data.runId === run.id);

      if (jobToCancel) {
        await jobToCancel.remove();
        console.log(`[CANCEL] Removed BullMQ job ${jobToCancel.id}`);
      } else {
        console.log(`[CANCEL] BullMQ job not found (may have already completed)`);
      }
    } catch (error) {
      console.error(`[CANCEL] Error removing BullMQ job:`, error);
      // Continue anyway - the cancellation flag will handle it
    }

    // Publish cancelled event
    await publishEnrichmentEvent(
      tableId,
      createEnrichmentEvent("cancelled", {
        reason: "Cancelled by user",
      })
    );

    // Update run status to CANCELLED
    await prisma.run.update({
      where: { id: run.id },
      data: {
        status: "CANCELLED",
        finishedAt: new Date(),
      },
    });

    console.log(`[CANCEL] Successfully cancelled enrichment for run ${run.id}`);

    return { success: true, message: "Enrichment cancelled successfully" };
  } catch (error) {
    console.error(`[CANCEL] Error cancelling enrichment:`, error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
