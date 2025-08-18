import { redirect } from "react-router";
import { ROUTES } from "./constants";
import { auth } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export async function getFirstOrganization(request: Request) {
  const orgs = await auth.api.listOrganizations({ headers: request.headers });
  return orgs.length ? orgs[0] : null;
}

export async function verifyUserAccessToOrganization({
  slug,
  userId,
  orgId,
}: {
  slug?: string;
  userId: string;
  orgId?: string;
}) {
  const where = slug ? { slug } : { id: orgId };

  const organization = await prisma.organization.findUnique({
    where,
    include: {
      members: {
        where: {
          userId,
        },
      },
    },
  });

  if (!organization || organization.members.length === 0) {
    throw redirect(ROUTES.APP);
  }

  return organization;
}
