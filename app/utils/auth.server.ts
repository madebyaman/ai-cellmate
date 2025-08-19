import { redirect } from "react-router";
import { auth } from "~/lib/auth.server";
import { ROUTES } from "./constants";

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
    throw redirect(ROUTES.DASHBOARD);
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

export async function getSubscription(request: Request, orgId: string) {
  const { getUserSubscription } = await import("~/utils/sub.server");

  const subscription = await getUserSubscription(request, orgId);
  return subscription;
}

export async function getOrganizationCredits(request: Request, orgId: string) {
  const { prisma } = await import("~/lib/prisma.server");
  
  const credits = await prisma.credits.findUnique({
    where: { organizationId: orgId },
    select: { amount: true },
  });
  
  return credits?.amount ?? 0;
}

export type SubscriptionError = "invalid-sub" | "out-of-credits";

export async function validateSubscriptionAndCredits(
  request: Request, 
  orgId: string, 
  requiredCredits: number = 1
): Promise<{ valid: boolean; error?: SubscriptionError }> {
  const [subscription, credits] = await Promise.all([
    getSubscription(request, orgId),
    getOrganizationCredits(request, orgId),
  ]);

  // Check subscription first
  if (!subscription) {
    return { valid: false, error: "invalid-sub" };
  }

  // Check credits
  if (credits < requiredCredits) {
    return { valid: false, error: "out-of-credits" };
  }

  return { valid: true };
}

export async function requireActiveOrg(request: Request) {
  const [user, activeOrgId, orgsList] = await Promise.all([
    requireUser(request),
    getActiveOrganizationId(request),
    auth.api.listOrganizations({ headers: request.headers }),
  ]);

  // Check if user has any organizations
  if (orgsList.length === 0) {
    throw redirect(ROUTES.CREATE_ORGANIZATION);
  }

  const firstOrg = orgsList[0];

  // Check if activeOrgId exists in database, if not set to first org
  let validActiveOrg = orgsList.find((o) => o.id === activeOrgId);

  // If no valid active org, set the first org as active
  if (!validActiveOrg) {
    await auth.api.setActiveOrganization({
      body: {
        organizationId: firstOrg.id,
        organizationSlug: firstOrg.slug,
      },
      headers: request.headers,
    });
    validActiveOrg = firstOrg;
  }

  const userId = user?.user?.id;
  if (!userId) {
    throw new Error("no user id");
  }
  if (!validActiveOrg) {
    throw new Error("no active org set");
  }

  // Verify user has access to the organization

  return { activeOrg: validActiveOrg, orgsList, user };
}
