import { CheckCircle, Download, FileText, Info, Loader, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  type ActionFunctionArgs,
  data,
  type LoaderFunctionArgs,
  UNSAFE_invariant,
  useFetcher,
  useLoaderData,
} from "react-router";
import { useEventSource } from "remix-utils/sse/react";
import { AgentLogsDrawer } from "~/components/agent-logs-drawer";
import { AIEnrichmentModal } from "~/components/ai-enrichment-modal";
import { CSVDetailsModal } from "~/components/csv-details-modal";
import LayoutWrapper from "~/components/layout-wrapper";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";
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
  const [showAIModal, setShowAIModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [logs, setLogs] = useState<
    Array<{ message: string; timestamp: string; type: string }>
  >([]);
  const [progress, setProgress] = useState(0);
  const [enrichedCells, setEnrichedCells] = useState<
    Record<string, Record<string, string>>
  >({});
  const [processingRowId, setProcessingRowId] = useState<string | null>(null);
  const [showLogsDrawer, setShowLogsDrawer] = useState(false);
  const [hasShownSuccessToast, setHasShownSuccessToast] = useState(false);
  const [highlightedCells, setHighlightedCells] = useState<Set<string>>(new Set());

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
      const timestamp = eventData.timestamp;

      switch (eventData.type) {
        case "row-start":
          setProcessingRowId(eventData.rowId);
          setLogs((prev) => [
            ...prev,
            {
              message: `Profile Agent: Gathering company details`,
              timestamp,
              type: "row-start",
            },
          ]);
          setProgress(eventData.progress || 0);
          break;

        case "row-complete":
          setProcessingRowId(null);
          // Update enriched cells for this row
          setEnrichedCells((prev) => {
            const rowCells: Record<string, string> = {};
            const newHighlightedCells = new Set<string>();

            eventData.cells.forEach(
              (cell: { columnId: string; value: string }) => {
                rowCells[cell.columnId] = cell.value;
                // Add to highlighted cells
                newHighlightedCells.add(`${eventData.rowId}-${cell.columnId}`);
              }
            );

            // Temporarily highlight cells
            setHighlightedCells(newHighlightedCells);

            // Remove highlight after 2 seconds
            setTimeout(() => {
              setHighlightedCells(new Set());
            }, 2000);

            return {
              ...prev,
              [eventData.rowId]: rowCells,
            };
          });
          setLogs((prev) => [
            ...prev,
            {
              message: `Row ${eventData.rowPosition} enrichment complete`,
              timestamp,
              type: "row-complete",
            },
          ]);
          setProgress(eventData.progress || 0);
          break;

        case "row-skipped":
          setProcessingRowId(null);
          setLogs((prev) => [
            ...prev,
            {
              message: `Row ${eventData.rowPosition} skipped (already complete)`,
              timestamp,
              type: "row-skipped",
            },
          ]);
          setProgress(eventData.progress || 0);
          break;

        case "complete":
          setProcessingRowId(null);
          setLogs((prev) => [
            ...prev,
            {
              message: "Enrichment complete!",
              timestamp,
              type: "complete",
            },
          ]);
          setProgress(100);

          // Show success toast only once
          if (!hasShownSuccessToast) {
            setHasShownSuccessToast(true);
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

  const getEnrichmentDetails = () => {
    const latestRun = cachedData.runs[0];
    const totalCells = cachedData.rows.reduce(
      (acc, row) => acc + row.cells.length,
      0,
    );
    const filledCells = cachedData.rows.reduce((acc, row) => {
      return (
        acc +
        row.cells.filter((cell) =>
          cell.versions.some((v) => v.picked && v.value),
        ).length
      );
    }, 0);

    return {
      prompt: cachedData.hint?.prompt || "No enrichment prompt set",
      websitesScraped: cachedData.hint?.websites || [],
      processedCells: filledCells,
      totalCells: totalCells,
      completedAt: latestRun ? new Date(latestRun.finishedAt) : new Date(),
    };
  };

  const [enrichmentDetails] = useState(getEnrichmentDetails());

  const handleEnrichData = (e) => {
    e.preventDefault();
    console.log("showing ai modal");
    setShowAIModal(true);
  };

  const handleDeleteTable = () => {
    fetcher.submit({ intent: "delete-table" }, { method: "POST" });
    setShowDeleteConfirm(false);
  };

  return (
    <LayoutWrapper
      className="flex flex-col h-full overflow-auto"
      outerContainerClass="overflow-auto"
    >
      {/* Header - Supabase style but light */}
      <div className="flex items-center justify-between py-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">
            {cachedData.name}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Show different buttons based on state */}
          {enrichmentState !== "processing" && (
            <>
              <Button
                variant="outline"
                className="text-gray-700 border-gray-300 hover:bg-gray-50"
                onClick={() => setShowDetails(true)}
              >
                <Info className="w-4 h-4" />
                View Details
              </Button>

              {/* Export Button - only show when completed */}
              {enrichmentState === "completed" && (
                <Button
                  variant="outline"
                  className="text-gray-700 border-gray-300 hover:bg-gray-50"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              )}

              <Button
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>

              <Button
                onClick={(e) => setShowAIModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Enrich Data
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Enrichment Progress Panel - Show when processing */}
      {enrichmentState === "processing" && (
        <div className="mb-4">
          <div
            className={`flex items-start justify-between rounded-lg p-4 ${
              progress === 100
                ? "bg-green-50 border border-green-200"
                : "bg-orange-50 border border-orange-200"
            }`}
          >
            <div className="flex items-start gap-3">
              {progress === 100 ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <Loader className="w-5 h-5 text-orange-500 animate-spin mt-0.5" />
              )}
              <div>
                <div className="font-semibold text-gray-900 mb-1">
                  {progress === 100 ? "Enrichment Complete" : "Enriching Data"}
                </div>
                <div className="text-sm text-gray-600">
                  {Math.round((progress / 100) * cachedData.rows.length)} of{" "}
                  {cachedData.rows.length} rows processed
                </div>
                {progress < 100 && (
                  <div className="text-sm text-gray-500 mt-0.5">
                    Currently processing row{" "}
                    {Math.ceil((progress / 100) * cachedData.rows.length)}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-gray-700 border-gray-300 hover:bg-gray-50"
                onClick={() => setShowLogsDrawer(true)}
              >
                <FileText className="w-4 h-4" />
                View Logs
              </Button>
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
                    const isEnriched = !!enrichedCells[row.id]?.[column.id];
                    const cellKey = `${row.id}-${column.id}`;
                    const isHighlighted = highlightedCells.has(cellKey);
                    const isUrl =
                      cellValue &&
                      (cellValue.startsWith("http") || cellValue.includes("@"));

                    return (
                      <td
                        key={column.id}
                        className={`px-4 py-3 text-sm border-l border-gray-200 transition-colors duration-500 ${
                          isHighlighted ? "bg-green-100" : ""
                        }`}
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

      <AIEnrichmentModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        selectedRows={[]}
        totalRows={cachedData.rows.length}
      />

      <CSVDetailsModal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        tableName={cachedData.name}
        runs={cachedData.runs || []}
        hint={cachedData.hint}
        processedCells={enrichmentDetails.processedCells}
        totalCells={enrichmentDetails.totalCells}
        status={status}
      />

      <AgentLogsDrawer
        isOpen={showLogsDrawer}
        onClose={() => setShowLogsDrawer(false)}
        logs={logs}
      />

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
