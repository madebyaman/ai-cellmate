import { redirect } from "react-router";
import { auth } from "~/lib/auth.server";
import { ROUTES } from "./constants";

export async function getUserSubscription(request: Request, orgId: string) {
  // Get the user's active organization
  const subs = await auth.api.listActiveSubscriptions({
    query: {
      referenceId: orgId,
    },
    // This endpoint requires session cookies.
    headers: request.headers,
  });
  console.log("The org %s has subs", orgId, subs);

  if (!subs || subs.length === 0) {
    return null;
  }

  return subs;
}
