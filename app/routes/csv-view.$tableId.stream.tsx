import { type LoaderFunctionArgs } from "react-router";
import { eventStream } from "remix-utils/sse/server";
import { UNSAFE_invariant } from "react-router";
import { requireActiveOrg } from "~/utils/auth.server";
import { getTableWithCachedData } from "~/lib/table.server";
import IORedis from "ioredis";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const tableId = params.tableId;
  UNSAFE_invariant(tableId, "No id passed");
  const { activeOrg } = await requireActiveOrg(request);

  // Fetch the table to check its status
  const tableData = await getTableWithCachedData(tableId, activeOrg.id);

  if (!tableData) {
    throw new Response("Table not found", { status: 404 });
  }

  // Only stream if table is in PENDING or RUNNING state
  const shouldStream =
    tableData.status === "PENDING" || tableData.status === "RUNNING";

  if (!shouldStream) {
    throw new Response("Table is not in streaming state", { status: 400 });
  }

  return eventStream(request.signal, function setup(send) {
    console.log(`[SSE] Client connected for table ${tableId}`);

    // Create Redis subscriber client
    const subscriber = process.env.REDIS_URL
      ? new IORedis(process.env.REDIS_URL + "?family=0", {
          maxRetriesPerRequest: null,
        })
      : new IORedis({
          host: process.env.REDIS_HOST || "localhost",
          port: parseInt(process.env.REDIS_PORT || "6379"),
          password: process.env.REDIS_PASSWORD,
          maxRetriesPerRequest: null,
        });

    const channel = `enrichment:${tableId}`;

    // Subscribe to Redis channel
    subscriber.subscribe(channel, (err) => {
      if (err) {
        console.error(`[SSE] Failed to subscribe to ${channel}:`, err);
      } else {
        console.log(`[SSE] Subscribed to ${channel}`);
      }
    });

    // Handle incoming messages from Redis
    subscriber.on("message", (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          // Parse and validate the message
          const event = JSON.parse(message);

          // Log important events
          if (
            ["row-start", "row-complete", "row-retrying", "row-failed", "complete"].includes(
              event.type
            )
          ) {
            console.log(`[SSE] Forwarding ${event.type} to client`);
          }

          // Send event to client
          send({
            event: "update",
            data: message, // Send the raw JSON string
          });
        } catch (error) {
          console.error("[SSE] Failed to parse message:", error);
        }
      }
    });

    // Handle Redis errors
    subscriber.on("error", (error) => {
      console.error("[SSE] Redis subscriber error:", error);
    });

    // Cleanup function when client disconnects
    return function cleanup() {
      console.log(`[SSE] Client disconnected from table ${tableId}`);
      subscriber.unsubscribe(channel);
      subscriber.quit();
    };
  });
}
