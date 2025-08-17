import { redirect } from "react-router";
import { auth } from "~/lib/auth.server";
import { ROUTES } from "./constants";

export async function getUserSubscription(request: Request) {
  const subscriptions = await auth.api.listActiveSubscriptions({
    headers: request.headers,
  });

  // get the active subscription
  const activeSubscription = subscriptions.find(
    (sub) => sub.status === "active" || sub.status === "trialing",
  );
  return activeSubscription;
}
