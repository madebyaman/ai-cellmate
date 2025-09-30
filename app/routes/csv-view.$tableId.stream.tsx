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
    let currentRowIndex = 0;

    const timer = setInterval(() => {
      if (currentRowIndex < totalRows) {
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
              timestamp: new Date().toISOString(),
              progress: Math.round((currentRowIndex / totalRows) * 100),
            }),
          });

          // Simulate processing time, then send row-complete with mock cell data
          setTimeout(() => {
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
          }, 1000);
        }

        currentRowIndex++;
      } else {
        // Send completion event
        send({
          event: "update",
          data: JSON.stringify({
            type: "complete",
            timestamp: new Date().toISOString(),
            progress: 100,
          }),
        });
        clearInterval(timer);
      }
    }, 2500);

    return function clear() {
      clearInterval(timer);
    };
  });
}