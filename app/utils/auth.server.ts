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

export async function requireUserWithOrganization(request: Request) {
  const session = await requireUser(request);
  
  // Check if user has any organizations
  const organizations = await auth.api.listOrganizations(request);
  
  if (!organizations || organizations.length === 0) {
    throw redirect(ROUTES.CREATE_ORGANIZATION);
  }
  
  return session;
}
