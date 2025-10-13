import { CheckCircle, Download, Loader2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  type ActionFunctionArgs,
  data,
  type LoaderFunctionArgs,
  UNSAFE_invariant,
  useFetcher,
  useLoaderData,
} from "react-router";
import { useEventSource } from "remix-utils/sse/react";
import LayoutWrapper from "~/components/layout-wrapper";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/accordion";
import { deleteTable, getTableWithCachedData } from "~/lib/table.server";
import {
  getActiveOrganizationId,
  requireActiveOrg,
  validateSubscriptionAndCredits,
} from "~/utils/auth.server";
import { ROUTES } from "~/utils/constants";
import { redirectWithToast } from "~/utils/toast.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const tableId = params.tableId;
  UNSAFE_invariant(tableId, "No id passed");
  const { activeOrg } = await requireActiveOrg(request);

  // Fetch the table with tableId, ensure it belongs to activeOrg.id
  const tableData = await getTableWithCachedData(tableId, activeOrg.id);

  if (!tableData) {
    throw new Response("Table not found", { status: 404 });
  }

  // Return table with name, cachedData
  return data({
    table: tableData.table,
    cachedData: tableData.cachedData,
    status: tableData.status,
  });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "enrich-data") {
    const orgId = await getActiveOrganizationId(request);

    // Validate subscription and credits
    const validation = await validateSubscriptionAndCredits(request, orgId, 10);

    if (!validation.valid) {
      return await redirectWithToast(ROUTES.DASHBOARD, {
        type: "error",
        description:
          "You need a valid subscription and credits to enrich data.",
        title: "Subscription required",
      });
    }

    // TODO: Implement actual enrichment logic
    return data({ success: true, message: "Data enrichment started" });
  }

  if (intent === "delete-table") {
    const tableId = params.tableId;
    UNSAFE_invariant(tableId, "No id passed");
    const { activeOrg } = await requireActiveOrg(request);

    try {
      await deleteTable(tableId, activeOrg.id);
      return await redirectWithToast(ROUTES.DASHBOARD, {
        type: "success",
        description: "Table deleted successfully.",
        title: "Table deleted",
      });
    } catch (error) {
      console.error("Error deleting table:", error);
      return await redirectWithToast(ROUTES.DASHBOARD, {
        type: "error",
        description: "Failed to delete table.",
        title: "Delete failed",
      });
    }
  }

  return data({ error: "Invalid intent" }, { status: 400 });
}

export default function CSVView() {
  const { table, cachedData, status } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [enrichedCells, setEnrichedCells] = useState<
    Record<string, Record<string, string>>
  >({});
  const [processingRowId, setProcessingRowId] = useState<string | null>(null);
  const [completedRowIds, setCompletedRowIds] = useState<Set<string>>(
    new Set(),
  );
  const hasShownSuccessToastRef = useRef(false);
  const totalRows = cachedData.rows.length;

  // Derived states
  const completedRows = completedRowIds.size;
  const progress = Math.round((completedRows / totalRows) * 100);
  const [stages, setStages] = useState<
    Array<{ name: string; status: "pending" | "in-progress" | "completed" }>
  >([
    { name: "Searching data", status: "pending" },
    { name: "Scraping", status: "pending" },
    { name: "Parsing", status: "pending" },
    { name: "Lookups", status: "pending" },
    { name: "Saving", status: "pending" },
  ]);

  // Get enrichment state from runs data
  const getEnrichmentState = () => {
    switch (status) {
      case "PENDING":
      case "RUNNING":
        return "processing";
      case "COMPLETED":
        return "completed";
      case "FAILED":
        return "failed";
      default:
        return "idle";
    }
  };

  const enrichmentState = getEnrichmentState();

  // Subscribe to SSE stream when processing (single connection)
  const updateEvent = useEventSource(`/app/${table.id}/stream`, {
    event: "update",
    enabled: enrichmentState === "processing",
  });

  // Handle incoming events with useEffect to avoid infinite renders
  useEffect(() => {
    if (!updateEvent) return;

    try {
      const eventData = JSON.parse(updateEvent);

      switch (eventData.type) {
        case "row-start":
          setProcessingRowId(eventData.rowId);
          // should reset the stages?
          break;

        case "stage-start":
          setStages((prev) =>
            prev.map((stage) =>
              stage.name === eventData.stage
                ? { ...stage, status: "in-progress" }
                : stage,
            ),
          );
          break;

        case "stage-complete":
          setStages((prev) =>
            prev.map((stage) =>
              stage.name === eventData.stage
                ? { ...stage, status: "completed" }
                : stage,
            ),
          );
          break;

        case "cell-update":
          // Update individual cell in real-time
          setEnrichedCells((prev) => {
            const rowCells = prev[eventData.rowId] || {};
            return {
              ...prev,
              [eventData.rowId]: {
                ...rowCells,
                [eventData.columnId]: eventData.value,
              },
            };
          });
          break;

        case "row-complete":
          setProcessingRowId(null);
          setCompletedRowIds((prev) => new Set(prev).add(eventData.rowId));
          // Don't think we should reset or mark stages as completed. Should be handled by other events

          // Mark all stages as completed for visual feedback
          setStages((prev) =>
            prev.map((stage) => ({ ...stage, status: "completed" })),
          );

          // Reset stages to pending after 800ms to show visual separation before next row
          setTimeout(() => {
            setStages([
              { name: "Searching data", status: "pending" },
              { name: "Scraping", status: "pending" },
              { name: "Parsing", status: "pending" },
              { name: "Lookups", status: "pending" },
              { name: "Saving", status: "pending" },
            ]);
          }, 100);
          break;

        case "row-retrying":
          // we should get which row is retrying. And mark all stages as pending. But check if after row-retrying we send row-state event. If so, mark all stages as pending will be done by row-start
          setProcessingRowId(null);

          // Mark all stages as completed
          setStages((prev) =>
            prev.map((stage) => ({ ...stage, status: "completed" })),
          );

          // Reset stages immediately for cycle 2
          setTimeout(() => {
            setStages([
              { name: "Searching data", status: "pending" },
              { name: "Scraping", status: "pending" },
              { name: "Parsing", status: "pending" },
              { name: "Lookups", status: "pending" },
              { name: "Saving", status: "pending" },
            ]);
          }, 100);
          break;

        case "row-failed":
          setProcessingRowId(null);
          setCompletedRowIds((prev) => new Set(prev).add(eventData.rowId)); // Count failed rows as completed for progress

          // Mark all stages as completed (some may have been completed before failure)
          setStages((prev) =>
            prev.map((stage) => ({ ...stage, status: "completed" })),
          );

          // Reset stages to pending after 800ms
          setTimeout(() => {
            setStages([
              { name: "Searching data", status: "pending" },
              { name: "Scraping", status: "pending" },
              { name: "Parsing", status: "pending" },
              { name: "Lookups", status: "pending" },
              { name: "Saving", status: "pending" },
            ]);
          }, 100);
          break;

        case "row-skipped":
          setProcessingRowId(null);
          setCompletedRowIds((prev) => new Set(prev).add(eventData.rowId)); // Count skipped rows as completed for progress
          break;

        case "complete":
          setProcessingRowId(null);
          // Mark all stages as completed
          setStages((prev) =>
            prev.map((stage) => ({ ...stage, status: "completed" })),
          );

          // Show success toast only once
          if (!hasShownSuccessToastRef.current) {
            hasShownSuccessToastRef.current = true;
            toast.success("Enrichment completed successfully!", {
              description: "All rows have been processed.",
            });
          }
          break;
      }
    } catch (e) {
      console.error("Failed to parse event:", e);
    }
  }, [updateEvent]);

  const handleDeleteTable = () => {
    fetcher.submit({ intent: "delete-table" }, { method: "POST" });
    setShowDeleteConfirm(false);
  };

  return (
    <LayoutWrapper
      className="flex flex-col h-full overflow-auto pt-2"
      outerContainerClass="overflow-auto"
    >
      <div className="flex items-center justify-between py-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">
            {cachedData.name}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Export Button - only show when completed */}
          {enrichmentState === "completed" && (
            <>
              <Button
                variant="outline"
                className="text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>

              <Button
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Enrichment Progress Panel - Show when processing */}
      {enrichmentState === "processing" && (
        <div className="mb-4">
          <div className={`rounded-lg p-4 bg-white border border-gray-200`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                {progress === 100 ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <Loader2 className="w-5 h-5 text-gray-500 animate-spin mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-normal text-gray-900 mb-1">
                    {progress === 100
                      ? "Enrichment Complete"
                      : "Enriching Data"}
                  </div>
                  <div className="text-sm text-gray-600">
                    {progress === 100
                      ? `${cachedData.rows.length} of ${cachedData.rows.length} rows processed`
                      : `Processing row ${Math.round((progress / 100) * cachedData.rows.length)} of ${cachedData.rows.length}`}
                  </div>
                </div>
              </div>
              {progress < 100 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => {
                    // TODO: Implement cancel logic
                    console.log("Cancel enrichment");
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
              <div
                className={
                  "h-1.5 rounded-full transition-all duration-300 bg-gray-500"
                }
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Stage Logs Accordion */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="stage-logs" className="border-none">
                <AccordionTrigger className="text-xs text-gray-600 hover:no-underline py-2">
                  View logs
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 rounded border border-gray-200 bg-gray-50 p-2">
                    {stages.map((stage, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-xs font-mono leading-5"
                      >
                        <span
                          className={
                            stage.status === "in-progress"
                              ? "text-gray-900"
                              : "text-gray-400"
                          }
                        >
                          {stage.status === "completed"
                            ? "[✓]"
                            : stage.status === "in-progress"
                              ? "[…]"
                              : "[ ]"}{" "}
                          {stage.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      )}

      <div className="overflow-auto ring-1 ring-gray-200 rounded sm:rounded-lg">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-white shadow-sm">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                #
              </th>
              {cachedData.columns.map((column) => (
                <th
                  key={column.id}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] border-l border-gray-200"
                >
                  {column.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {cachedData.rows.map((row, index) => {
              // Helper function to get current cell value
              const getCellValue = (columnId: string) => {
                // Check if we have a real-time enriched value for this cell
                const enrichedValue = enrichedCells[row.id]?.[columnId];
                if (enrichedValue) return enrichedValue;

                // Otherwise, get from cached data
                const cell = row.cells.find((c) => c.columnId === columnId);
                if (!cell || cell.versions.length === 0) return null;

                // Find picked version or latest version
                const pickedVersion = cell.versions.find((v) => v.picked);
                const currentVersion = pickedVersion || cell.versions[0];
                return currentVersion?.value || null;
              };

              const isProcessing = processingRowId === row.id;

              return (
                <tr
                  key={row.id}
                  className={`transition-colors duration-150 ${
                    isProcessing
                      ? "bg-orange-50 border-l-4 border-l-orange-500"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <td className="px-4 py-3 text-sm text-gray-500 text-center font-mono">
                    {row.position}
                  </td>
                  {cachedData.columns.map((column) => {
                    const cellValue = getCellValue(column.id);
                    const isUrl =
                      cellValue &&
                      (cellValue.startsWith("http") || cellValue.includes("@"));

                    return (
                      <td
                        key={column.id}
                        className="px-4 py-3 text-sm border-l border-gray-200"
                      >
                        {cellValue ? (
                          isUrl ? (
                            cellValue.includes("@") ? (
                              <a
                                href={`mailto:${cellValue}`}
                                className="text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {cellValue}
                              </a>
                            ) : (
                              <a
                                href={cellValue}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {cellValue}
                              </a>
                            )
                          ) : (
                            <div
                              className={`text-gray-900 ${cellValue.length > 50 ? "max-w-xs truncate" : ""}`}
                              title={cellValue}
                            >
                              {cellValue}
                            </div>
                          )
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Delete Table
            </h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{cachedData.name}"? This action
              cannot be undone and will permanently delete all data, rows,
              columns, and enrichment history.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteTable}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={fetcher.state === "submitting"}
              >
                {fetcher.state === "submitting"
                  ? "Deleting..."
                  : "Delete Table"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </LayoutWrapper>
  );
}
