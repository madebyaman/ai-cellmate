import { type LoaderFunctionArgs } from "react-router";
import { eventStream } from "remix-utils/sse/server";
import { UNSAFE_invariant } from "react-router";
import { requireActiveOrg } from "~/utils/auth.server";
import { getTableWithCachedData } from "~/lib/table.server";

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
    const rows = tableData.cachedData.rows;
    const totalRows = rows.length;

    const stages = [
      { name: "Searching data", duration: 1000 },
      { name: "Scraping", duration: 1200, message: "Scraping google.com" },
      { name: "Parsing", duration: 800 },
      { name: "Lookups", duration: 900 },
      { name: "Saving", duration: 800 },
    ];

    let cancelled = false;

    async function processAllRows() {
      for (let currentRowIndex = 0; currentRowIndex < totalRows; currentRowIndex++) {
        if (cancelled) break;

        const row = rows[currentRowIndex];
        const shouldSkip = Math.random() < 0.2; // 20% chance to skip

        if (shouldSkip) {
          // Send row-skipped event
          send({
            event: "update",
            data: JSON.stringify({
              type: "row-skipped",
              rowId: row.id,
              rowPosition: row.position,
              timestamp: new Date().toISOString(),
              progress: Math.round(((currentRowIndex + 1) / totalRows) * 100),
            }),
          });
        } else {
          // Send row-start event
          send({
            event: "update",
            data: JSON.stringify({
              type: "row-start",
              rowId: row.id,
              rowPosition: row.position,
              message: `processing row ${row.position}: ${stages[0].message || stages[0].name}`,
              timestamp: new Date().toISOString(),
              progress: Math.round((currentRowIndex / totalRows) * 100),
            }),
          });

          // Process each stage sequentially
          for (const stage of stages) {
            if (cancelled) break;

            // Send stage-start
            send({
              event: "update",
              data: JSON.stringify({
                type: "stage-start",
                stage: stage.name,
                message: stage.message
                  ? `processing row ${row.position}: ${stage.message}`
                  : undefined,
                timestamp: new Date().toISOString(),
              }),
            });

            // Wait for stage duration
            await new Promise((resolve) => setTimeout(resolve, stage.duration));

            // Send stage-complete
            send({
              event: "update",
              data: JSON.stringify({
                type: "stage-complete",
                stage: stage.name,
                timestamp: new Date().toISOString(),
              }),
            });

            // Wait 200ms to ensure stage completion is rendered
            await new Promise((resolve) => setTimeout(resolve, 200));
          }

          // All stages complete, send row-complete with enriched data
          const enrichedCells = tableData.cachedData.columns.map((column) => ({
            columnId: column.id,
            columnName: column.name,
            value: `Enriched data for ${column.name} - Row ${row.position}`,
          }));

          send({
            event: "update",
            data: JSON.stringify({
              type: "row-complete",
              rowId: row.id,
              rowPosition: row.position,
              cells: enrichedCells,
              timestamp: new Date().toISOString(),
              progress: Math.round(((currentRowIndex + 1) / totalRows) * 100),
            }),
          });
        }

        // Wait before next row to allow UI to show completion and reset
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      // Send completion event
      if (!cancelled) {
        send({
          event: "update",
          data: JSON.stringify({
            type: "complete",
            timestamp: new Date().toISOString(),
            progress: 100,
          }),
        });
      }
    }

    // Start processing rows
    processAllRows();

    return function clear() {
      cancelled = true;
    };
  });
}