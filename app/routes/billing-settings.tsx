import { Calendar, Plus } from "lucide-react";
import type { ActionFunctionArgs, MetaFunction } from "react-router";
import { Form, redirect, UNSAFE_invariant, useNavigation } from "react-router";
import { format } from "date-fns";
import { prisma } from "~/lib/prisma.server";
import {
  createBillingPortalSession,
  createCheckoutSession,
  upgradeSubscription,
} from "~/lib/stripe.server";
import { requireActiveOrg } from "~/utils/auth.server";
import { getUserSubscription } from "~/utils/sub.server";
import { BOOSTER_PLAN_NAME, INTENTS, PLANS } from "~/utils/constants";
import { Button } from "../components/ui/button";
import { useAppLayoutLoaderData } from "./layout";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get(INTENTS.INTENT);
  const currentUrl = new URL(request.url);
  const returnUrl = `${currentUrl.origin}${currentUrl.pathname}`;

  // Get the active organization and user session
  const { activeOrg, user } = await requireActiveOrg(request);
  const activeOrganization = await prisma.organization.findUnique({
    where: { id: activeOrg.id },
    select: { stripeCustomerId: true },
  });

  const customerId = activeOrganization?.stripeCustomerId;
  UNSAFE_invariant(customerId, "No customer id");

  // Get the active subscription for upgrade and credit purchase validation
  const sub = await getUserSubscription(activeOrg.id);

  try {
    switch (intent) {
      case INTENTS.BILLING_PORTAL: {
        try {
          const data = await createBillingPortalSession({
            customerId,
            returnUrl,
          });

          if (data?.url) {
            return redirect(data.url);
          }
        } catch (error) {
          console.error("Billing portal error:", error);
        }
        return redirect(returnUrl);
      }
      case INTENTS.UPGRADE_TO_PRO: {
        if (!sub) {
          // If no subscription found, create a checkout session for Pro plan
          const plan = PLANS.find((p) => p.id === "pro");
          UNSAFE_invariant(plan?.priceId, "No price id for pro plan");

          const data = await createCheckoutSession({
            priceId: plan.priceId,
            successUrl: returnUrl,
            cancelUrl: returnUrl,
            mode: "subscription",
            customerId,
            organizationId: activeOrg.id,
            plan: "pro",
          });

          if (data?.url) {
            return redirect(data.url);
          }
        } else {
          // If subscription exists, upgrade it
          try {
            const plan = PLANS.find((p) => p.id === "pro");
            UNSAFE_invariant(plan?.priceId, "No price id to upgrade");
            const data = await upgradeSubscription({
              subscriptionId: sub.stripeSubscriptionId,
              newPriceId: plan?.priceId,
              returnUrl: returnUrl,
            });

            if (data?.url) {
              return redirect(data.url);
            }
          } catch (error) {
            console.error("Upgrade error:", error);
          }
        }
        return redirect(returnUrl);
      }
      case INTENTS.BUY_CREDITS: {
        // User must have an active subscription to buy credits
        if (!sub) {
          throw new Error("Active subscription required to purchase credits");
        }

        const boosterPlan = PLANS.find((plan) => plan.id === BOOSTER_PLAN_NAME);
        if (!boosterPlan?.priceId) {
          throw new Error("Credit purchase unavailable");
        }

        const { url } = await createCheckoutSession({
          priceId: boosterPlan.priceId,
          successUrl: returnUrl,
          cancelUrl: returnUrl,
          mode: "payment",
          customerId,
          organizationId: activeOrg.id,
          plan: BOOSTER_PLAN_NAME,
        });

        if (url) {
          return redirect(url);
        }

        return redirect(returnUrl);
      }
    }
  } catch (error) {
    console.error("Billing action error:", error);
    // In a real app, you might want to set a flash message or handle errors differently
    return redirect(returnUrl);
  }

  return redirect(returnUrl);
}

export const meta: MetaFunction = () => {
  return [
    { title: "Billing Settings - AI Cellmate" },
    { name: "description", content: "Manage your subscription, credits, and billing information." },
  ];
};

export default function BillingSection() {
  const { credits, subscription } = useAppLayoutLoaderData();
  const navigation = useNavigation();

  const creditsLeft = credits || 0;
  const isLowCredits = creditsLeft < 100;
  const hasActiveSubscription = subscription;
  const currentPlan = hasActiveSubscription
    ? PLANS.find((plan) => plan.id === subscription?.plan)
    : null;
  const planName = currentPlan?.name || "Free";
  const isCancelled =
    hasActiveSubscription && subscription?.cancelAtPeriodEnd === true;

  // Show upgrade messaging only for free or starter plans
  const shouldShowUpgradeMessage =
    !hasActiveSubscription || currentPlan?.id === "starter";

  return (
    <div className="bg-white ring-1 shadow-xs ring-gray-900/5 sm:rounded-xl">
      <div className="px-4 py-6 sm:p-8">
        <div className="flex gap-2 items-center">
          <h2 id="billing" className="text-base font-semibold text-gray-900">
            Billing & Plan
          </h2>
          <p className="px-2 py-[1px] text-sm font-medium rounded bg-green-200 text-green-800">
            {planName}
          </p>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Manage your subscription and credits
        </p>

        <div className="flex items-center gap-2 mt-1">
          <p className="text-sm text-gray-400">
            {creditsLeft.toLocaleString()} credits remaining
          </p>
          {isLowCredits && (
            <span className="px-2 py-[1px] text-xs font-medium rounded bg-red-100 text-red-800">
              Low Credits
            </span>
          )}
        </div>

        {hasActiveSubscription && (
          <div className="flex items-center gap-2 mt-6">
            <Calendar className="h-4 w-4 text-gray-500" />
            <p className="text-sm text-gray-600">
              {isCancelled ? (
                <>
                  Cancels on{" "}
                  {subscription?.periodEnd
                    ? format(new Date(subscription.periodEnd), "MMM d, yyyy")
                    : "N/A"}
                </>
              ) : (
                <>
                  Renews on{" "}
                  {subscription?.periodEnd
                    ? format(new Date(subscription.periodEnd), "MMM d, yyyy")
                    : "N/A"}
                </>
              )}
            </p>
          </div>
        )}

        <hr className="my-6 border-gray-200" />

        {shouldShowUpgradeMessage && (
          <div className="flex flex-col gap-1 mt-6">
            <p className="text-sm font-semibold text-gray-900">
              Upgrade to Pro ($199 / mo) to unlock:
            </p>
            <p className="text-sm text-gray-600">
              500 monthly credits and discounted extra credits
            </p>
          </div>
        )}

        <div className="flex justify-between gap-2 items-center">
          <div className="flex flex-col gap-1 mt-6">
            <p className="text-sm font-semibold text-gray-900">
              Need more credits?
            </p>
            <p className="text-sm text-gray-600">
              Get 200 additional credits for $50
            </p>
          </div>
          <Form method="post">
            <input
              type="hidden"
              name={INTENTS.INTENT}
              value={INTENTS.BUY_CREDITS}
            />
            <Button
              type="submit"
              variant="outline"
              className="py-1.5 px-4 h-auto"
              disabled={
                navigation.state === "submitting" || !hasActiveSubscription
              }
            >
              <Plus className="size-4" />
              Buy Credits
            </Button>
          </Form>
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
        {hasActiveSubscription && (
          <Form method="post">
            <input
              type="hidden"
              name={INTENTS.INTENT}
              value={INTENTS.BILLING_PORTAL}
            />
            <Button
              type="submit"
              disabled={navigation.state === "submitting"}
              variant={shouldShowUpgradeMessage ? "outline" : "default"}
            >
              Manage Billing
            </Button>
          </Form>
        )}
        {shouldShowUpgradeMessage && (
          <Form method="post">
            <input
              type="hidden"
              name={INTENTS.INTENT}
              value={INTENTS.UPGRADE_TO_PRO}
            />
            <Button disabled={navigation.state === "submitting"}>
              Upgrade to Pro
            </Button>
          </Form>
        )}
      </div>
    </div>
  );
}
