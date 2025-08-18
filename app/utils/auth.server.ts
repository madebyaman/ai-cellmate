import { redirect } from "react-router";
import { auth } from "~/lib/auth.server";
import { ROUTES } from "./constants";
import { verifyUserAccessToOrganization } from "./organization.server";

export async function requireUser(request: Request) {
  const session = await auth.api.getSession(request);
  if (!session) {
    throw redirect(ROUTES.LOGIN);
  }
  return session;
}

export async function requireAnonymous(request: Request) {
  const session = await auth.api.getSession(request);
  if (session) {
    const orgId = await getActiveOrganizationId(request);
    if (!orgId) throw redirect(ROUTES.APP);
    const org = await verifyUserAccessToOrganization({
      userId: session.user.id,
      orgId: orgId ?? undefined,
    });
    if (!org.slug) throw new Error("Expected slug of workspace");
    throw redirect(ROUTES.DASHBOARD(org.slug));
  }
  return session;
}

export async function getUserId(request: Request) {
  const session = await auth.api.getSession(request);
  return session?.user?.id ?? null;
}

export async function requireAuth(request: Request) {
  const session = await auth.api.getSession(request);
  if (!session) {
    throw redirect(ROUTES.LOGIN);
  }
  return session;
}
export async function getActiveOrganizationId(request: Request) {
  const session = await requireAuth(request);
  const orgId = session.session.activeOrganizationId;
  return orgId;
}

export async function requireOrganization(request: Request) {
  const { getFirstOrganization } = await import("~/utils/organization.server");

  const firstOrg = await getFirstOrganization(request);
  if (!firstOrg) {
    throw redirect(ROUTES.CREATE_ORGANIZATION);
  }

  return firstOrg;
}

export async function requireSubscription(request: Request, orgId: string) {
  const { getUserSubscription } = await import("~/utils/sub.server");

  const subscription = await getUserSubscription(request, orgId);
  if (!subscription) {
    throw redirect(ROUTES.BILLING);
  }

  return subscription;
}
