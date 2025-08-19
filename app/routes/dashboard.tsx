import { Plus } from "lucide-react";
import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  data,
  useFetcher,
} from "react-router";
import LayoutWrapper from "~/components/layout-wrapper";
import { Button } from "~/components/ui/button";
import { prisma } from "~/lib/prisma.server";
import {
  getActiveOrganizationId,
  validateSubscriptionAndCredits,
  type SubscriptionError,
} from "~/utils/auth.server";
import { redirectWithToast } from "~/utils/toast.server";
import { ROUTES } from "~/utils/constants";
// import { verifyUserAccessToOrganization } from "~/utils/organization.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  // const slug = params.slug as string;
  const id = await getActiveOrganizationId(request);
  const org = await prisma.organization.findUnique({
    where: { id },
  });
  console.log("org", org);
  // const organization = await verifyUserAccessToOrganization(request, slug);
  // return { organization };
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "add-new-data") {
    const orgId = await getActiveOrganizationId(request);

    // Server-side validation - check if user has subscription and at least 10 credits
    const validation = await validateSubscriptionAndCredits(request, orgId, 10);

    if (!validation.valid) {
      // return data({ error: validation.error }, { status: 400 });
      return await redirectWithToast(ROUTES.DASHBOARD, {
        type: "error",
        description:
          "You do not have valid subscription. Or you are out of credits. Please update your billing before continuing.",
        title: "No subscription or credits left",
      });
    }

    // If validation passes, proceed with the action
    console.log("Proceeding with adding new data...");
    return data({ success: true });
  }

  return data({ error: "Invalid intent" }, { status: 400 });
}

export default function Dashboard() {
  const fetcher = useFetcher();

  const handleAddNewData = () => {
    const formData = new FormData();
    formData.append("intent", "add-new-data");
    fetcher.submit(formData, { method: "POST" });
  };

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
            <div className="overflow-hidden ring-1 shadow-sm ring-black/5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                    >
                      Name
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Title
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Email
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Role
                    </th>
                    <th
                      scope="col"
                      className="relative py-3.5 pr-4 pl-3 sm:pr-6"
                    >
                      <span className="sr-only">Edit</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-gray-200 divide-y-2 bg-white">
                  {people.map((person) => (
                    <tr key={person.email}>
                      <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-6">
                        {person.name}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                        {person.title}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                        {person.email}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                        {person.role}
                      </td>
                      <td className="relative py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
                        <a
                          href="#"
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit<span className="sr-only">, {person.name}</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between w-full px-4 py-3 sm:px-6"
        >
          <div className="hidden sm:block">
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">1</span> to{" "}
              <span className="font-medium">10</span> of{" "}
              <span className="font-medium">20</span> results
            </p>
          </div>
          <div className="flex flex-1 justify-between sm:justify-end">
            <a
              href="#"
              className="relative inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus-visible:outline-offset-0"
            >
              Previous
            </a>
            <a
              href="#"
              className="relative ml-3 inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus-visible:outline-offset-0"
            >
              Next
            </a>
          </div>
        </nav>
      </div>
    </LayoutWrapper>
  );
}

const people = [
  {
    name: "Lindsay Walton",
    title: "Front-end Developer",
    email: "lindsay.walton@example.com",
    role: "Member",
  },
  {
    name: "Courtney Henry",
    title: "Designer",
    email: "courtney.henry@example.com",
    role: "Admin",
  },
  {
    name: "Tom Cook",
    title: "Full-stack Developer",
    email: "tom.cook@example.com",
    role: "Member",
  },
  {
    name: "Whitney Francis",
    title: "Product Manager",
    email: "whitney.francis@example.com",
    role: "Owner",
  },
  {
    name: "Michael Foster",
    title: "Marketing Specialist",
    email: "michael.foster@example.com",
    role: "Member",
  },
];
