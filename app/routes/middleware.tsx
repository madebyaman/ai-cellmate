import { Outlet, redirect, type LoaderFunctionArgs } from "react-router";
import {
  requireUser,
  requireOrganization,
  requireSubscription,
  getActiveOrganizationId,
} from "~/utils/auth.server";
import { ROUTES } from "~/utils/constants";
import { auth } from "~/lib/auth.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Check auth, organization, and subscription in sequence
  const { user } = await requireUser(request);
  const firstOrg = await requireOrganization(request, user.id);

  if (!firstOrg.slug) {
    console.error("IMPOSSIBLE STATE: No slug for first org.", firstOrg);
    throw new Error("Something went wrong");
  }

  const activeOrgId = await getActiveOrganizationId(request);
  if (!activeOrgId) {
    await auth.api.setActiveOrganization({
      body: {
        organizationId: firstOrg.id,
        organizationSlug: firstOrg.slug,
      },
      headers: request.headers,
    });
  }

  const subscription = await requireSubscription(request);

  // we need to redirect to active org id home
  throw redirect(ROUTES.DASHBOARD);
}

export function Middleware() {
  return null;
}
