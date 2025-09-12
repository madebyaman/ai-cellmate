import { useState } from "react";
import {
  Download,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  Dot,
  Loader,
} from "lucide-react";
import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  data,
  useFetcher,
  useLoaderData,
} from "react-router";
import LayoutWrapper from "~/components/layout-wrapper";
import { Button } from "~/components/ui/button";
import { AIEnrichmentModal } from "~/components/ai-enrichment-modal";
import { CSVDetailsModal } from "~/components/csv-details-modal";
import {
  getActiveOrganizationId,
  requireActiveOrg,
  validateSubscriptionAndCredits,
} from "~/utils/auth.server";
import { redirectWithToast } from "~/utils/toast.server";
import { ROUTES } from "~/utils/constants";
import { UNSAFE_invariant } from "react-router";
import { getTableWithCachedData } from "~/lib/table.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const tableId = params.tableId;
  UNSAFE_invariant(tableId, "No id passed");
  const { activeOrg } = await requireActiveOrg(request);

  // 1: Fetch the table with tableId, ensure it belongs to activeOrg.id
  const tableData = await getTableWithCachedData(tableId, activeOrg.id);

  if (!tableData) {
    throw new Response("Table not found", { status: 404 });
  }

  // 2. Return table with name, cachedData
  return data({
    table: tableData.table,
    cachedData: tableData.cachedData,
    status: tableData.status,
  });
}

export async function action({ request }: ActionFunctionArgs) {
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

  return data({ error: "Invalid intent" }, { status: 400 });
}

export default function CSVView() {
  const { table, cachedData, status } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [showAIModal, setShowAIModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Get enrichment state from runs data
  const getEnrichmentState = () => {
    switch (status) {
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

          {/* Processing State Indicator */}
          {enrichmentState === "processing" && (
            <div className="flex items-center gap-2 text-yellow-600">
              <Loader className="w-4 h-4 animate-spin" />
              <span className="text-sm">
                Processing {enrichmentDetails.processedCells}/
                {enrichmentDetails.totalCells} cells
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
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
            onClick={(e) => setShowAIModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={enrichmentState === "processing"}
          >
            {enrichmentState === "processing" ? "Processing..." : "Enrich Data"}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto ring-1 ring-gray-200 rounded sm:rounded-lg">
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
                const cell = row.cells.find((c) => c.columnId === columnId);
                if (!cell || cell.versions.length === 0) return null;

                // Find picked version or latest version
                const pickedVersion = cell.versions.find((v) => v.picked);
                const currentVersion = pickedVersion || cell.versions[0];
                return currentVersion?.value || null;
              };

              return (
                <tr
                  key={row.id}
                  className="hover:bg-gray-50 transition-colors duration-150"
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
    </LayoutWrapper>
  );
}
