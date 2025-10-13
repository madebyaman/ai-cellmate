/**
 * Redis event publisher for real-time CSV enrichment updates
 * Publishes enrichment events to Redis channels that can be consumed by SSE routes
 */

import IORedis from "ioredis";
import type { EnrichmentEvent } from "./enrichment-events";

// Create a singleton Redis client for publishing events
let publisherClient: IORedis | null = null;

/**
 * Get or create the Redis publisher client
 */
function getPublisherClient(): IORedis {
  if (!publisherClient) {
    publisherClient = process.env.REDIS_URL
      ? new IORedis(process.env.REDIS_URL + "?family=0", {
          maxRetriesPerRequest: null,
          lazyConnect: true,
        })
      : new IORedis({
          host: process.env.REDIS_HOST || "localhost",
          port: parseInt(process.env.REDIS_PORT || "6379"),
          password: process.env.REDIS_PASSWORD,
          maxRetriesPerRequest: null,
          lazyConnect: true,
        });

    // Connect immediately
    publisherClient.connect().catch((err) => {
      console.error("[REDIS PUBLISHER] Failed to connect:", err);
    });

    // Handle connection events
    publisherClient.on("connect", () => {
      console.log("[REDIS PUBLISHER] Connected successfully");
    });

    publisherClient.on("error", (err) => {
      console.error("[REDIS PUBLISHER] Connection error:", err);
    });

    publisherClient.on("close", () => {
      console.log("[REDIS PUBLISHER] Connection closed");
    });
  }

  return publisherClient;
}

/**
 * Publish an enrichment event to a Redis channel
 * Channel format: enrichment:{tableId}
 */
export async function publishEnrichmentEvent(
  tableId: string,
  event: EnrichmentEvent
): Promise<void> {
  try {
    const client = getPublisherClient();
    const channel = `enrichment:${tableId}`;
    const message = JSON.stringify(event);

    await client.publish(channel, message);

    // Log only important events to reduce noise
    if (
      ["row-start", "row-complete", "row-retrying", "row-failed", "complete"].includes(
        event.type
      )
    ) {
      console.log(`[REDIS EVENT] Published ${event.type} to ${channel}`);
    }
  } catch (error) {
    // Log the error but don't throw - enrichment should continue even if Redis fails
    console.error(
      `[REDIS EVENT] Failed to publish event to enrichment:${tableId}:`,
      error
    );
  }
}

/**
 * Close the Redis publisher connection
 * Call this when shutting down the worker
 */
export async function closePublisher(): Promise<void> {
  if (publisherClient) {
    await publisherClient.quit();
    publisherClient = null;
    console.log("[REDIS PUBLISHER] Closed connection");
  }
}
