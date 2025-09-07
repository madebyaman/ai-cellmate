import { useState } from "react";
import {
  Search,
  Filter,
  SortAsc,
  MoreHorizontal,
  ExternalLink,
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
import {
  getActiveOrganizationId,
  validateSubscriptionAndCredits,
} from "~/utils/auth.server";
import { redirectWithToast } from "~/utils/toast.server";
import { ROUTES } from "~/utils/constants";

interface CSVRow {
  id: number;
  domain: string;
  company: string;
  url: string;
  enriched?: boolean;
}

// Mock data that matches the screenshot
const mockData: CSVRow[] = [
  {
    id: 1,
    domain: "servicebell.com",
    company: "ServiceBell",
    url: "https://www.linkedin.com/...",
    enriched: true,
  },
  {
    id: 2,
    domain: "baseten.co",
    company: "Baseten",
    url: "https://www.linkedin.com/...",
    enriched: true,
  },
  {
    id: 3,
    domain: "superhuman.com",
    company: "Superhuman",
    url: "https://www.linkedin.com/...",
    enriched: true,
  },
  {
    id: 4,
    domain: "donut.com",
    company: "Donut",
    url: "https://www.linkedin.com/...",
    enriched: true,
  },
  {
    id: 5,
    domain: "startengine.com",
    company: "StartEngine",
    url: "https://www.linkedin.com/...",
    enriched: true,
  },
  {
    id: 6,
    domain: "kandji.io",
    company: "Kandji",
    url: "https://www.linkedin.com/...",
    enriched: true,
  },
  {
    id: 7,
    domain: "mutinyhq.com",
    company: "Mutiny",
    url: "https://www.linkedin.com/...",
    enriched: true,
  },
  {
    id: 8,
    domain: "joinpogo.com",
    company: "Pogo",
    url: "https://www.linkedin.com/...",
    enriched: true,
  },
  {
    id: 9,
    domain: "kalshi.com",
    company: "Kalshi",
    url: "https://www.linkedin.com/...",
    enriched: true,
  },
  {
    id: 10,
    domain: "aha.io",
    company: "Aha!",
    url: "https://www.linkedin.com/...",
    enriched: true,
  },
  {
    id: 11,
    domain: "vitally.io",
    company: "Vitally.io",
    url: "https://www.linkedin.com/...",
    enriched: true,
  },
];

export async function loader({ request }: LoaderFunctionArgs) {
  // const orgId = await getActiveOrganizationId(request);
  // const org = await prisma.organization.findUnique({
  //   where: { id: orgId },
  // });
  const org = {};

  // In a real implementation, you'd fetch CSV data from database
  return data({ organization: org, csvData: mockData });
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
  const [tableOn, setTableOn] = useState(true);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAIModal, setShowAIModal] = useState(false);

  const filteredData = csvData.filter(
    (row) =>
      row.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.company.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleEnrichData = (e) => {
    e.preventDefault();
    console.log("showing ai modal");
    setShowAIModal(true);
  };

  const toggleRowSelection = (id: number) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id],
    );
  };

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold text-gray-900">
              🏺 Clay Starter Table
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Table On</span>
              <button
                onClick={() => setTableOn(!tableOn)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  tableOn ? "bg-green-500" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    tableOn ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Search className="h-4 w-4" />
              Find People
            </Button>
            <Button
              onClick={handleEnrichData}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {fetcher.state !== "idle" ? "Enriching..." : "Enrich Data"}
            </Button>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Default View</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">🔓 2 hidden</span>
              <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
                <Filter className="h-4 w-4" />
                Filter
              </button>
              <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
                <SortAsc className="h-4 w-4" />
                Sort
              </button>
              <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-12 px-6 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRows(filteredData.map((row) => row.id));
                        } else {
                          setSelectedRows([]);
                        }
                      }}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Domain
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    🏢 Enrich Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Url
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    + New Column
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((row, index) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                        checked={selectedRows.includes(row.id)}
                        onChange={() => toggleRowSelection(row.id)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.domain}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 bg-gray-100 rounded flex items-center justify-center text-xs">
                          {getCompanyIcon(row.company)}
                        </div>
                        <span className="text-sm text-gray-900">
                          {row.company}
                        </span>
                        {row.enriched && (
                          <button className="text-blue-600 hover:text-blue-800">
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <ExternalLink className="h-3 w-3 text-gray-400" />
                        <span className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
                          {row.url}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                      {/* Action buttons can go here */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button className="text-sm text-gray-600 hover:text-gray-900">
                + New row
              </button>
              <button className="text-sm text-gray-600 hover:text-gray-900">
                📊 Add data
              </button>
              <button className="text-sm text-gray-600 hover:text-gray-900">
                🔍 Find Company Lookalikes
              </button>
            </div>
            <div className="text-sm text-gray-600">
              {filteredData.length} rows, {selectedRows.length} Selected
            </div>
          </div>
        </div>
      </div>

      <AIEnrichmentModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        selectedRows={selectedRows}
        totalRows={filteredData.length}
      />
    </LayoutWrapper>
  );
}

// Helper function to get company icon
function getCompanyIcon(company: string): string {
  const icons: Record<string, string> = {
    ServiceBell: "🔔",
    Baseten: "🌱",
    Superhuman: "⚡",
    Donut: "🍩",
    StartEngine: "🚀",
    Kandji: "🔒",
    Mutiny: "🎯",
    Pogo: "🏓",
    Kalshi: "📈",
    "Aha!": "💡",
    "Vitally.io": "❤️",
  };
  return icons[company] || "🏢";
}
