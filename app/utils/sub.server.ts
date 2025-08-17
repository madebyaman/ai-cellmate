import { redirect } from "react-router";
import { auth } from "~/lib/auth.server";
import { ROUTES } from "./constants";

export async function getUserSubscription(request: Request) {
  // Get the user's active organization
  const activeOrganization = await auth.api.listActiveSubscriptions(request);

  if (!activeOrganization) {
    return null;
  }

  // Parse organization metadata to get Stripe customer ID
  let stripeCustomerId = null;
  if (activeOrganization.metadata) {
    try {
      const metadata = JSON.parse(activeOrganization.metadata);
      stripeCustomerId = metadata.stripeCustomerId;
    } catch (e) {
      console.error("Failed to parse organization metadata:", e);
    }
  }

  if (!stripeCustomerId) {
    return null;
  }

  // Get subscriptions for the organization's Stripe customer
  const subscriptions = await auth.api.listActiveSubscriptions({
    headers: request.headers,
    query: {
      customerId: stripeCustomerId,
    },
  });

  // get the active subscription
  const activeSubscription = subscriptions.find(
    (sub) => sub.status === "active" || sub.status === "trialing",
  );
  return activeSubscription;
}
