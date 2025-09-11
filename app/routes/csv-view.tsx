import { useState } from "react";
import { ExternalLink, Download, Clock, CheckCircle, AlertCircle, Info } from "lucide-react";
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
import {
  getActiveOrganizationId,
  validateSubscriptionAndCredits,
} from "~/utils/auth.server";
import { redirectWithToast } from "~/utils/toast.server";
import { ROUTES } from "~/utils/constants";
import { loadCSVData, type CSVRow } from "~/utils/csv-parser";

export async function loader({ request }: LoaderFunctionArgs) {
  // const orgId = await getActiveOrganizationId(request);
  // const org = await prisma.organization.findUnique({
  //   where: { id: orgId },
  // });
  const org = {};

  // Load CSV data from the new.csv file
  const csvData = loadCSVData();
  return data({ organization: org, csvData });
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
  const { csvData } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [showAIModal, setShowAIModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  // Mock enrichment state - in real app this would come from loader/fetcher
  const [enrichmentState, setEnrichmentState] = useState<'idle' | 'processing' | 'completed' | 'failed'>('completed');
  const [enrichmentDetails] = useState({
    prompt: "Find social media profiles and professional websites for each person",
    websitesScraped: ["linkedin.com", "twitter.com", "github.io", "company-sites"],
    processedRows: csvData.length,
    totalRows: csvData.length,
    completedAt: new Date()
  });

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
          <h1 className="text-lg font-semibold text-gray-900">People CSV Data</h1>
          
          {/* Processing State Indicator */}
          {enrichmentState === 'processing' && (
            <div className="flex items-center gap-2 text-amber-600">
              <Clock className="w-4 h-4 animate-spin" />
              <span className="text-sm">Processing {enrichmentDetails.processedRows}/{enrichmentDetails.totalRows} rows</span>
            </div>
          )}
          
          {enrichmentState === 'completed' && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Enrichment completed</span>
            </div>
          )}
          
          {enrichmentState === 'failed' && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Enrichment failed</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* View Details Button - show when enrichment has run */}
          {enrichmentState !== 'idle' && (
            <Button
              variant="outline"
              className="text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              <Info className="w-4 h-4 mr-2" />
              View Details
            </Button>
          )}
          
          {/* Export Button - only show when completed */}
          {enrichmentState === 'completed' && (
            <Button
              variant="outline"
              className="text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          )}
          
          <Button
            onClick={handleEnrichData}
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={enrichmentState === 'processing'}
          >
            {enrichmentState === 'processing' ? "Processing..." : "Enrich Data"}
          </Button>
        </div>
      </div>

      {/* Table Container - Supabase style */}
      <div className="flex-1 overflow-auto ring-1 ring-gray-200 rounded sm:rounded-lg">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-white shadow-sm">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] border-l border-gray-200">
                First Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] border-l border-gray-200">
                Last Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px] border-l border-gray-200">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px] border-l border-gray-200">
                Website
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] border-l border-gray-200">
                Instagram
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] border-l border-gray-200">
                Facebook
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] border-l border-gray-200">
                X (Twitter)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[300px] border-l border-gray-200">
                Bio
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px] border-l border-gray-200">
                Created At
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {csvData.map((row, index) => (
              <tr
                key={row.id}
                className="hover:bg-gray-50 transition-colors duration-150"
              >
                <td className="px-4 py-3 text-sm text-gray-500 text-center font-mono">
                  {index + 1}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 border-l border-gray-200">
                  {row.first_name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 border-l border-gray-200">
                  {row.last_name}
                </td>
                <td className="px-4 py-3 text-sm border-l border-gray-200">
                  <a
                    href={`mailto:${row.email}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {row.email}
                  </a>
                </td>
                <td className="px-4 py-3 text-sm border-l border-gray-200">
                  {row.website ? (
                    <a
                      href={row.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {row.website}
                    </a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 border-l border-gray-200">
                  {row.instagram_id || <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 border-l border-gray-200">
                  {row.facebook_id || <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 border-l border-gray-200">
                  {row.x_id || <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 border-l border-gray-200">
                  {row.bio ? (
                    <div className="max-w-xs truncate" title={row.bio}>
                      {row.bio}
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 border-l border-gray-200 font-mono">
                  {new Date(row.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AIEnrichmentModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        selectedRows={[]}
        totalRows={csvData.length}
      />
    </LayoutWrapper>
  );
}
