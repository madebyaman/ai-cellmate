import { useState } from "react";
import { ExternalLink } from "lucide-react";
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
  industry: string;
  employees: string;
  founded: string;
  location: string;
  revenue: string;
  description: string;
  funding: string;
  ceo: string;
  enriched?: boolean;
}

// Mock data that matches the screenshot
const mockData: CSVRow[] = [
  {
    id: 1,
    domain: "servicebell.com",
    company: "ServiceBell",
    url: "https://www.linkedin.com/...",
    industry: "Software",
    employees: "10-50",
    founded: "2019",
    location: "San Francisco, CA",
    revenue: "$1M-5M",
    description: "Customer communication platform",
    funding: "Series A",
    ceo: "Sarah Chen",
    enriched: true,
  },
  {
    id: 2,
    domain: "baseten.co",
    company: "Baseten",
    url: "https://www.linkedin.com/...",
    industry: "ML Infrastructure",
    employees: "50-100",
    founded: "2019",
    location: "San Francisco, CA",
    revenue: "$5M-10M",
    description: "ML model deployment platform",
    funding: "Series B",
    ceo: "Tuhin Srivastava",
    enriched: true,
  },
  {
    id: 3,
    domain: "superhuman.com",
    company: "Superhuman",
    url: "https://www.linkedin.com/...",
    industry: "Productivity",
    employees: "100-250",
    founded: "2015",
    location: "San Francisco, CA",
    revenue: "$10M-25M",
    description: "Fastest email experience ever made",
    funding: "Series C",
    ceo: "Rahul Vohra",
    enriched: true,
  },
  {
    id: 4,
    domain: "donut.com",
    company: "Donut",
    url: "https://www.linkedin.com/...",
    industry: "HR Tech",
    employees: "25-50",
    founded: "2016",
    location: "New York, NY",
    revenue: "$1M-5M",
    description: "Team building and culture platform",
    funding: "Seed",
    ceo: "Dan Manian",
    enriched: true,
  },
  {
    id: 5,
    domain: "startengine.com",
    company: "StartEngine",
    url: "https://www.linkedin.com/...",
    industry: "Fintech",
    employees: "250-500",
    founded: "2011",
    location: "Los Angeles, CA",
    revenue: "$25M-50M",
    description: "Equity crowdfunding platform",
    funding: "Series D",
    ceo: "Howard Marks",
    enriched: true,
  },
  {
    id: 6,
    domain: "kandji.io",
    company: "Kandji",
    url: "https://www.linkedin.com/...",
    industry: "Cybersecurity",
    employees: "100-250",
    founded: "2018",
    location: "San Diego, CA",
    revenue: "$10M-25M",
    description: "Apple device management platform",
    funding: "Series B",
    ceo: "Adam Pettit",
    enriched: true,
  },
  {
    id: 7,
    domain: "mutinyhq.com",
    company: "Mutiny",
    url: "https://www.linkedin.com/...",
    industry: "Marketing Tech",
    employees: "50-100",
    founded: "2018",
    location: "San Francisco, CA",
    revenue: "$5M-10M",
    description: "Website personalization platform",
    funding: "Series A",
    ceo: "Nikhil Sethi",
    enriched: true,
  },
  {
    id: 8,
    domain: "joinpogo.com",
    company: "Pogo",
    url: "https://www.linkedin.com/...",
    industry: "Gaming",
    employees: "10-25",
    founded: "2020",
    location: "Remote",
    revenue: "$500K-1M",
    description: "Mobile game development",
    funding: "Pre-Seed",
    ceo: "Alex Kim",
    enriched: true,
  },
  {
    id: 9,
    domain: "kalshi.com",
    company: "Kalshi",
    url: "https://www.linkedin.com/...",
    industry: "Fintech",
    employees: "25-50",
    founded: "2018",
    location: "New York, NY",
    revenue: "$1M-5M",
    description: "Event trading platform",
    funding: "Series A",
    ceo: "Tarek Mansour",
    enriched: true,
  },
  {
    id: 10,
    domain: "aha.io",
    company: "Aha!",
    url: "https://www.linkedin.com/...",
    industry: "Software",
    employees: "100-250",
    founded: "2013",
    location: "Menlo Park, CA",
    revenue: "$25M-50M",
    description: "Product roadmap software",
    funding: "Bootstrapped",
    ceo: "Brian de Haaff",
    enriched: true,
  },
  {
    id: 11,
    domain: "vitally.io",
    company: "Vitally.io",
    url: "https://www.linkedin.com/...",
    industry: "Customer Success",
    employees: "25-50",
    founded: "2017",
    location: "New York, NY",
    revenue: "$1M-5M",
    description: "Customer success platform",
    funding: "Series A",
    ceo: "Jamie Davidson",
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
  const [showAIModal, setShowAIModal] = useState(false);

  const handleEnrichData = (e) => {
    e.preventDefault();
    console.log("showing ai modal");
    setShowAIModal(true);
  };

  return (
    <LayoutWrapper>
      <div className="h-screen flex flex-col">
        {/* Simple Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h1 className="text-lg font-medium text-gray-900">
            Clay Starter Table
          </h1>
          <Button
            onClick={handleEnrichData}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {fetcher.state !== "idle" ? "Enriching..." : "Enrich Data"}
          </Button>
        </div>

        {/* Table Container with overflow */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-white">
              <tr>
                <th className="px-3 py-2 text-sm font-medium text-gray-600 min-w-[40px]"></th>
                <th className="border-l border-gray-200 px-3 py-2 text-sm font-normal text-gray-500 min-w-[120px]">
                  Domain
                </th>
                <th className="border-l border-gray-200 px-3 py-2 text-sm font-normal text-gray-500 min-w-[120px]">
                  Company
                </th>
                <th className="border-l border-gray-200 px-3 py-2 text-sm font-normal text-gray-500 min-w-[200px]">
                  URL
                </th>
                <th className="border-l border-gray-200 px-3 py-2 text-sm font-normal text-gray-500 min-w-[100px]">
                  Industry
                </th>
                <th className="border-l border-gray-200 px-3 py-2 text-sm font-normal text-gray-500 min-w-[80px]">
                  Employees
                </th>
                <th className="border-l border-gray-200 px-3 py-2 text-sm font-normal text-gray-500 min-w-[70px]">
                  Founded
                </th>
                <th className="border-l border-gray-200 px-3 py-2 text-sm font-normal text-gray-500 min-w-[120px]">
                  Location
                </th>
                <th className="border-l border-gray-200 px-3 py-2 text-sm font-normal text-gray-500 min-w-[100px]">
                  Revenue
                </th>
                <th className="border-l border-gray-200 px-3 py-2 text-sm font-normal text-gray-500 min-w-[200px]">
                  Description
                </th>
                <th className="border-l border-gray-200 px-3 py-2 text-sm font-normal text-gray-500 min-w-[100px]">
                  Funding
                </th>
                <th className="border-l border-gray-200 px-3 py-2 text-sm font-normal text-gray-500 min-w-[120px]">
                  CEO
                </th>
              </tr>
            </thead>
            <tbody>
              {csvData.map((row, index) => (
                <tr key={row.id} className="">
                  <td className="border-t border-gray-200 px-2 py-2 text-sm text-gray-600 text-center">
                    {index + 1}
                  </td>
                  <td className="border-l border-t border-gray-200 px-3 py-2 text-sm text-gray-900">
                    {row.domain}
                  </td>
                  <td className="border-l border-t border-gray-200 px-3 py-2 text-sm text-gray-900">
                    {row.company}
                  </td>
                  <td className="border-l border-t border-gray-200 px-3 py-2 text-sm text-blue-600 hover:text-blue-800">
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {row.url}
                    </a>
                  </td>
                  <td className="border-l border-t border-gray-200 px-2 py-2 text-sm text-gray-900">
                    {row.industry}
                  </td>
                  <td className="border-l border-t border-gray-200 px-2 py-2 text-sm text-gray-900">
                    {row.employees}
                  </td>
                  <td className="border-l border-t border-gray-200 px-2 py-2 text-sm text-gray-900">
                    {row.founded}
                  </td>
                  <td className="border-l border-t border-gray-200 px-2 py-2 text-sm text-gray-900">
                    {row.location}
                  </td>
                  <td className="border-l border-t border-gray-200 px-2 py-2 text-sm text-gray-900">
                    {row.revenue}
                  </td>
                  <td className="border-l border-t border-gray-200 px-2 py-2 text-sm text-gray-900">
                    {row.description}
                  </td>
                  <td className="border-l border-t border-gray-200 px-2 py-2 text-sm text-gray-900">
                    {row.funding}
                  </td>
                  <td className="border-l border-t border-gray-200 px-2 py-2 text-sm text-gray-900">
                    {row.ceo}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Simple Bottom Row */}
        <div className="p-2 border-t border-gray-200 bg-white">
          <button className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
            + Add new row
          </button>
        </div>
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
