import { useState } from "react";
import { Plus } from "lucide-react";
import {
  data,
  redirect,
  UNSAFE_invariant,
  useFetcher,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";
import { format } from "date-fns";
import LayoutWrapper from "~/components/layout-wrapper";
import { Button } from "~/components/ui/button";
import { CSVUploadModal } from "~/components/csv-upload-modal";
import {
  getActiveOrganizationId,
  requireActiveOrg,
  validateSubscriptionAndCredits,
  requireUser,
} from "~/utils/auth.server";
import { ROUTES } from "~/utils/constants";
import { redirectWithToast } from "~/utils/toast.server";
import {
  getTablesForOrganization,
  type TableWithLatestRun,
} from "~/lib/table.server";
import { generateEnrichmentColumns } from "~/lib/ai-column-generator.server";
import { uploadAndProcessCSV } from "~/lib/csv-upload.server";
// import { verifyUserAccessToOrganization } from "~/utils/organization.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Dashboard - AI Cellmate" },
    {
      name: "description",
      content:
        "View and manage your CSV data enrichment projects with AI-powered intelligence.",
    },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { activeOrg } = await requireActiveOrg(request);
  const tables = await getTablesForOrganization(activeOrg.id);

  return data({ tables });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "generate-columns") {
    const orgId = await getActiveOrganizationId(request);
    UNSAFE_invariant(orgId, "No organization id found");

    // Validate credits before AI generation (1 credit for column generation)
    const validation = await validateSubscriptionAndCredits(request, orgId, 1);

    if (!validation.valid) {
      return await redirectWithToast(ROUTES.DASHBOARD, {
        type: "error",
        description:
          "You are out of credits. Please update your billing before continuing.",
        title: "Insufficient credits",
      });
    }

    const prompt = formData.get("prompt") as string;

    if (!prompt) {
      return data({ error: "Prompt is required" }, { status: 400 });
    }

    try {
      const columns = await generateEnrichmentColumns(prompt);
      return data({ columns });
    } catch (error) {
      console.error("Error generating columns:", error);
      return data(
        { error: "Failed to generate columns. Please try again." },
        { status: 500 },
      );
    }
  }

  if (intent === "upload-csv") {
    const orgId = await getActiveOrganizationId(request);
    UNSAFE_invariant(orgId, "No organization id found while uploading CSV");

    const session = await requireUser(request);
    UNSAFE_invariant(session.user, "No user found");

    const file = formData.get("file") as File;
    const enrichmentColumnsJson = formData.get("enrichmentColumns") as string;
    const enrichmentPrompt = formData.get("enrichmentPrompt") as string;
    const websitesJson = formData.get("websites") as string;

    if (!file) {
      return await redirectWithToast(ROUTES.DASHBOARD, {
        type: "error",
        description: "Please upload a CSV file.",
        title: "Missing CSV file",
      });
    }

    const enrichmentColumns = JSON.parse(
      enrichmentColumnsJson || "[]",
    ) as Array<{ name: string; type: string; description: string }>;
    const websites = JSON.parse(websitesJson || "[]") as string[];

    if (enrichmentColumns.length === 0) {
      return await redirectWithToast(ROUTES.DASHBOARD, {
        type: "error",
        description: "Please add at least one enrichment column.",
        title: "Missing enrichment columns",
      });
    }

    // Calculate required credits based on CSV size
    // Credits needed = number of rows * number of enrichment columns
    const csvContent = await file.text();
    const rows = csvContent.trim().split("\n");
    // Subtract 1 for header row
    const rowCount = Math.max(0, rows.length - 1);
    const requiredCredits = rowCount * enrichmentColumns.length;

    // Validate credits based on CSV size
    const validation = await validateSubscriptionAndCredits(
      request,
      orgId,
      requiredCredits,
    );

    if (!validation.valid) {
      return await redirectWithToast(ROUTES.DASHBOARD, {
        type: "error",
        description: `You need ${requiredCredits} credits to enrich this CSV (${rowCount} rows × ${enrichmentColumns.length} columns), but don't have enough. Please update your billing before continuing.`,
        title: "Insufficient credits",
      });
    }

    try {
      const tableId = await uploadAndProcessCSV({
        file,
        enrichmentColumns,
        enrichmentPrompt,
        websites,
        organizationId: orgId,
        createdBy: session.user.name,
      });

      return redirect(`/app/${tableId}`);
    } catch (error) {
      console.error("Error uploading CSV:", error);
      return await redirectWithToast(ROUTES.DASHBOARD, {
        type: "error",
        description: "Failed to process CSV file. Please try again.",
        title: "Upload Error",
      });
    }
  }

  if (intent === "add-new-data") {
    const orgId = await getActiveOrganizationId(request);
    UNSAFE_invariant(orgId, "No organization id found while adding new data");

    // Validate credits before showing upload modal
    const validation = await validateSubscriptionAndCredits(request, orgId, 1);

    if (!validation.valid) {
      return await redirectWithToast(ROUTES.DASHBOARD, {
        type: "error",
        description:
          "You are out of credits. Please update your billing before continuing.",
        title: "Insufficient credits",
      });
    }

    // If validation passes, proceed with the action
    console.log("Proceeding with adding new data...");
    return data({ success: true });
  }

  return data({ error: "Invalid intent" }, { status: 400 });
}

export default function Dashboard() {
  const { tables } = useLoaderData<{ tables: TableWithLatestRun[] }>();
  const fetcher = useFetcher();
  const [showUploadModal, setShowUploadModal] = useState(false);

  const handleAddNewData = () => {
    setShowUploadModal(true);
  };

  const formatDate = (date: string | Date) => {
    return format(new Date(date), "MMM d, yyyy");
  };

  const getStatus = (table: TableWithLatestRun) => {
    if (!table.runs || table.runs.length === 0) {
      return "No runs";
    }
    return table.runs[0].status;
  };

  if (tables.length === 0) {
    return (
      <LayoutWrapper>
        <div className="flex justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            My Data
          </h1>
        </div>
        <div className="mt-8">
          <div className="rounded-lg border border-gray-200 bg-white p-8">
            <h3 className="font-medium text-gray-900 mb-2">
              Get started by uploading your first CSV to enrich with AI
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              Upload your CSV and our AI agents get to work immediately. Watch
              as missing data gets filled in row by row, completely hands-free
            </p>
            <Button
              variant="default"
              onClick={handleAddNewData}
              disabled={fetcher.state !== "idle"}
              className="gap-1 px-3 py-1.5"
            >
              <Plus className="size-4" />
              {fetcher.state !== "idle" ? "Processing..." : "Add New Data"}
            </Button>
          </div>
        </div>

        <CSVUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
        />
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <div className="flex justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          My Data
        </h1>
        <Button
          variant="default"
          className="text-sm gap-1"
          onClick={handleAddNewData}
          disabled={fetcher.state !== "idle"}
        >
          <Plus className="size-5" />
          {fetcher.state !== "idle" ? "Processing..." : "Add New Data"}
        </Button>
      </div>
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden ring-1 ring-gray-200 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pr-3 pl-4 text-left text-xs tracking-wide font-normal uppercase text-gray-500 sm:pl-6"
                    >
                      Name
                    </th>
                    <th
                      scope="col"
                      className="py-3.5 pr-3 pl-4 text-left text-xs tracking-wide font-normal uppercase text-gray-500 sm:pl-6"
                    >
                      Created At
                    </th>
                    <th
                      scope="col"
                      className="py-3.5 pr-3 pl-4 text-left text-xs tracking-wide font-normal uppercase text-gray-500 sm:pl-6"
                    >
                      Created By
                    </th>
                    <th
                      scope="col"
                      className="py-3.5 pr-3 pl-4 text-left text-xs tracking-wide font-normal uppercase text-gray-500 sm:pl-6"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="py-3.5 pr-3 pl-4 text-left text-xs tracking-wide font-normal uppercase text-gray-500 sm:pl-6"
                    >
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-gray-100 divide-y-2 bg-white">
                  {tables.map((table) => (
                    <tr key={table.id}>
                      <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-6">
                        {table.name}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                        {formatDate(table.createdAt)}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                        {table.createdBy || "Unknown"}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            getStatus(table) === "COMPLETED"
                              ? "bg-green-100 text-green-800"
                              : getStatus(table) === "RUNNING"
                                ? "bg-yellow-100 text-yellow-800"
                                : getStatus(table) === "FAILED"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {getStatus(table)}
                        </span>
                      </td>
                      <td className="relative py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
                        <a
                          href={`/app/${table.id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          View<span className="sr-only">, {table.name}</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <CSVUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
      />
    </LayoutWrapper>
  );
}
