import { Calendar, Plus } from "lucide-react";
import {
  UNSAFE_invariant,
  useLoaderData,
  type LoaderFunctionArgs,
} from "react-router";
import { BillingPlans } from "~/components/billing-plans";
import { prisma } from "~/lib/prisma.server";
import { getActiveOrganizationId } from "~/utils/auth.server";
import { getUserSubscription } from "~/utils/sub.server";
import { Button } from "../components/ui/button";

export async function loader({ request }: LoaderFunctionArgs) {
  const activeOrg = await getActiveOrganizationId(request);
  UNSAFE_invariant(activeOrg, "No active org found");
  const sub = await getUserSubscription(request, activeOrg);

  const user = await prisma.organization.findUnique({
    where: { id: activeOrg },
    select: {
      id: true,
      credits: true,
    },
  });

  if (!user) {
    throw new Response("User not found", { status: 404 });
  }

  const userCredits = user.credits;

  return {
    creditsLeft: userCredits?.amount || 0,
    planName: sub[0]?.plan,
  };
}

export default function BillingSection() {
  const { planName, creditsLeft } = useLoaderData<typeof loader>();
  console.log("data", planName, creditsLeft);
  // const { planName, creditsLeft, isCancelled, ...rest } = billingData;
  const isCancelled = false;

  return (
    <div className="bg-white ring-1 shadow-xs ring-gray-900/5 sm:rounded-xl">
      <div className="px-4 py-6 sm:p-8">
        <div className="flex gap-2 items-center">
          <h2 id="billing" className="text-base font-semibold text-gray-900">
            Billing & Plan
          </h2>
          <p className="px-2 py-[1px] text-sm font-medium rounded bg-green-200 text-green-800">
            Pro
          </p>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Manage your subscription and credits
        </p>

        <div className="flex gap-2 justify-between items-center">
          <p className="text-sm text-gray-400 mt-1">3,750 / 5,000 credits</p>
          <p className="text-sm text-gray-400 mt-1">1,250 remaining</p>
        </div>
        <div className="mt-1 overflow-hidden rounded-full bg-gray-200">
          <div
            style={{ width: "37.5%" }}
            className="h-2 rounded-full bg-indigo-600"
          />
        </div>

        <div className="flex items-center gap-2 mt-6">
          <Calendar className="h-4 w-4 text-gray-500" />
          {/*<p className="text-sm text-gray-600">
            {isCancelled ? (
              <>Cancels on {rest?.cancelDate ?? ""}</>
            ) : (
              <>Renews on {rest?.renewalDate ?? ""}</>
            )}
          </p>*/}
        </div>

        <div className="flex flex-col gap-1 mt-6">
          <p className="text-sm font-semibold text-gray-900">
            Upgrade to Pro ($199 / mo) to unlock:
          </p>
          <p className="text-sm text-gray-600">
            500 monthly credits and discounted extra credits
          </p>
        </div>

        <div className="flex justify-between gap-2 items-center">
          <div className="flex flex-col gap-1 mt-6">
            <p className="text-sm font-semibold text-gray-900">
              Need more credits?
            </p>
            <p className="text-sm text-gray-600">
              Get 500 additional credits for $50
            </p>
          </div>
          <Button variant="outline" className="py-1.5 px-4 h-auto">
            <Plus className="size-4" />
            Buy Credits
          </Button>
        </div>

        <div className="flex flex-col gap-1 mt-6">
          <p className="text-sm font-semibold text-gray-900">
            Contact us about Enterprise to additionally unlock:
          </p>
          <p className="text-sm text-gray-600">
            Dedicated support, volume discounts and unlimited seats
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-x-6 border-t border-gray-900/10 px-4 py-4 sm:px-8">
        <button type="button" className="text-sm font-semibold text-gray-900">
          Manage Billing
        </button>
        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Upgrade to Pro
        </button>
      </div>
    </div>
  );
}
