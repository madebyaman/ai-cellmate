import { CheckCircle, Download, Loader2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  type ActionFunctionArgs,
  data,
  type LoaderFunctionArgs,
  type MetaFunction,
  UNSAFE_invariant,
  useFetcher,
  useLoaderData,
} from "react-router";
import { useEventSource } from "~/hooks/useEventSource";
import LayoutWrapper from "~/components/layout-wrapper";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/accordion";
import {
  deleteTable,
  getTableWithCachedData,
  getTableStatus,
  getTableData,
  getCompletedRowIds,
} from "~/lib/table.server";
import {
  getActiveOrganizationId,
  requireActiveOrg,
  validateSubscriptionAndCredits,
} from "~/utils/auth.server";
import { INTENTS, ROUTES } from "~/utils/constants";
import { redirectWithToast } from "~/utils/toast.server";
import { cancelEnrichment } from "~/lib/enrichment-cancellation.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const tableId = params.tableId;
  UNSAFE_invariant(tableId, "No id passed");
  const { activeOrg } = await requireActiveOrg(request);

  // First, get the table status
  const tableStatusData = await getTableStatus(tableId, activeOrg.id);

  if (!tableStatusData) {
    throw new Response("Table not found", { status: 404 });
  }

  const { table, status, runId } = tableStatusData;

  // Decide whether to use live data or cached data based on status
  let cachedData;
  let completedRowIds: string[] = [];

  if (status === "RUNNING" || status === "PENDING") {
    // Use live data when processing
    cachedData = await getTableData(tableId, activeOrg.id);
    if (runId) {
      completedRowIds = await getCompletedRowIds(tableId, runId);
    }
  } else {
    // Use cached data when completed
    const tableData = await getTableWithCachedData(tableId, activeOrg.id);
    if (!tableData) {
      throw new Response("Table not found", { status: 404 });
    }
    cachedData = tableData.cachedData;
    completedRowIds = tableData.completedRowIds;
  }

  // Return table with name, cachedData, and completed row IDs
  return data({
    table: {
      id: table.id,
      name: table.name,
      createdAt: table.createdAt,
    },
    cachedData,
    status,
    completedRowIds,
  });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const tableId = params.tableId;
  UNSAFE_invariant(tableId, "No id passed");
  const { activeOrg } = await requireActiveOrg(request);

  if (intent === INTENTS.CANCEL_ENRICHMENT) {
    try {
      const result = await cancelEnrichment(tableId, activeOrg.id);

      if (result.success) {
        return data({ success: true, message: result.message });
      } else {
        return data({ success: false, error: result.message }, { status: 400 });
      }
    } catch (error) {
      console.error("Error cancelling enrichment:", error);
      return data(
        { success: false, error: "Failed to cancel enrichment" },
        { status: 500 },
      );
    }
  }

  if (intent === "enrich-data") {
    const orgId = await getActiveOrganizationId(request);

    // Validate subscription and credits
    UNSAFE_invariant(orgId, "No orgId found");
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

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    {
      title: data?.table?.name
        ? `${data.table.name} - AI Cellmate`
        : "CSV View - AI Cellmate",
    },
    {
      name: "description",
      content:
        "View and manage your CSV data enrichment progress in real-time.",
    },
  ];
};

export default function CSVView() {
  const {
    table,
    cachedData,
    status,
    completedRowIds: initialCompletedRowIds,
  } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Initialize enriched cells from cached data
  const initialEnrichedCells: Record<string, Record<string, string>> = {};
  cachedData.rows.forEach((row) => {
    const rowCells: Record<string, string> = {};
    row.cells.forEach((cell) => {
      if (cell.versions.length > 0) {
        const pickedVersion = cell.versions.find((v) => v.picked);
        const currentVersion = pickedVersion || cell.versions[0];
        if (currentVersion?.value) {
          rowCells[cell.columnId] = currentVersion.value;
        }
      }
    });
    if (Object.keys(rowCells).length > 0) {
      initialEnrichedCells[row.id] = rowCells;
    }
  });

  const [enrichedCells, setEnrichedCells] =
    useState<Record<string, Record<string, string>>>(initialEnrichedCells);
  const [processingRowId, setProcessingRowId] = useState<string | null>(null);
  const [completedRowCount, setCompletedRowCount] = useState(
    initialCompletedRowIds?.length || 0,
  );
  const processedEventCountRef = useRef(0);
  const processingRowRef = useRef<HTMLTableRowElement>(null);
  const totalRows = cachedData.rows.length;

  // Derived states
  const progress = Math.round((completedRowCount / totalRows) * 100);
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
      case "CANCELLED":
        return "cancelled";
      default:
        return "idle";
    }
  };

  const enrichmentState = getEnrichmentState();

  // Reset processed event count when enrichment state changes
  useEffect(() => {
    processedEventCountRef.current = 0;
  }, [enrichmentState]);

  // Auto-scroll to processing row
  useEffect(() => {
    if (processingRowId && processingRowRef.current) {
      processingRowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [processingRowId]);

  // Subscribe to SSE stream when processing (single connection)
  const eventQueue = useEventSource(`/app/${table.id}/stream`, {
    event: "update",
    enabled: enrichmentState === "processing",
  });

  // Handle incoming events with useEffect to avoid infinite renders
  useEffect(() => {
    if (!eventQueue || typeof eventQueue.length !== "number") {
      return;
    }

    const unprocessedCount = eventQueue.length - processedEventCountRef.current;

    if (unprocessedCount <= 0) {
      return;
    }

    // Process only NEW events that we haven't processed yet
    for (let i = processedEventCountRef.current; i < eventQueue.length; i++) {
      const updateEvent = eventQueue[i];
      try {
        const eventData = JSON.parse(updateEvent);

        switch (eventData.type) {
          case "row-start":
            setProcessingRowId(eventData.rowId);
            setStages([
              { name: "Searching data", status: "pending" },
              { name: "Scraping", status: "pending" },
              { name: "Parsing", status: "pending" },
              { name: "Lookups", status: "pending" },
              { name: "Saving", status: "pending" },
            ]);
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
            setCompletedRowCount((prev) => prev + 1);
            break;

          case "row-retrying":
            setStages([
              { name: "Searching data", status: "pending" },
              { name: "Scraping", status: "pending" },
              { name: "Parsing", status: "pending" },
              { name: "Lookups", status: "pending" },
              { name: "Saving", status: "pending" },
            ]);
            toast.info("Retrying row", {
              description: `Row ${eventData.rowPosition} - Cycle ${eventData.cycle}`,
            });
            break;

          case "row-failed":
            setProcessingRowId(null);
            setCompletedRowCount((prev) => prev + 1);
            toast.error("Row enrichment failed", {
              description: `Row ${eventData.rowPosition}: ${eventData.reason}`,
            });
            break;

          case "row-skipped":
            setProcessingRowId(null);
            setCompletedRowCount((prev) => prev + 1);
            toast.info("Row skipped", {
              description: `Row ${eventData.rowPosition}: ${eventData.reason}`,
            });
            break;

          case "complete":
            setProcessingRowId(null);
            setStages((prev) =>
              prev.map((stage) => ({ ...stage, status: "completed" })),
            );

            toast.success("Enrichment completed successfully!", {
              description: "All rows have been processed.",
            });
            break;

          case "cancelled":
            setProcessingRowId(null);
            toast.info("Enrichment cancelled", {
              description: "The enrichment process was cancelled.",
            });
            break;
        }
      } catch (e) {
        console.error("Failed to parse SSE event:", e);
      }
    }

    processedEventCountRef.current = eventQueue.length;
  }, [eventQueue]);

  const handleDeleteTable = () => {
    fetcher.submit({ intent: "delete-table" }, { method: "POST" });
    setShowDeleteConfirm(false);
  };

  const handleCancelEnrichment = () => {
    fetcher.submit({ intent: INTENTS.CANCEL_ENRICHMENT }, { method: "POST" });
  };

  const handleExportCSV = () => {
    try {
      // Build CSV from current table data
      const headers = cachedData.columns.map((col) => col.name);
      const csvRows = [headers.join(",")];

      cachedData.rows.forEach((row) => {
        const rowValues = cachedData.columns.map((column) => {
          // Get cell value (same logic as display)
          const enrichedValue = enrichedCells[row.id]?.[column.id];
          if (enrichedValue) {
            return `"${enrichedValue.replace(/"/g, '""')}"`;
          }

          const cell = row.cells.find((c) => c.columnId === column.id);
          if (!cell || cell.versions.length === 0) return '""';

          const pickedVersion = cell.versions.find((v) => v.picked);
          const currentVersion = pickedVersion || cell.versions[0];
          const value = currentVersion?.value || "";
          return `"${value.replace(/"/g, '""')}"`;
        });
        csvRows.push(rowValues.join(","));
      });

      const csvContent = csvRows.join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${cachedData.name}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Export successful", {
        description: "Your CSV file has been downloaded.",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Export failed", {
        description: "An error occurred while exporting the CSV.",
      });
    }
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
                onClick={handleExportCSV}
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
                      : `Processing row ${completedRowCount + 1} of ${cachedData.rows.length}`}
                  </div>
                </div>
              </div>
              {progress < 100 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={handleCancelEnrichment}
                  disabled={fetcher.state === "submitting"}
                >
                  {fetcher.state === "submitting" ? "Cancelling..." : "Cancel"}
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
                  ref={isProcessing ? processingRowRef : null}
                  className={`transition-colors duration-150 ${
                    isProcessing
                      ? "bg-orange-50 border-l-4 border-l-orange-500"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <td className="px-4 py-3 text-sm text-gray-500 text-center font-mono">
                    {row.position + 1}
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
