import { prisma } from "~/lib/prisma.server";

export async function getUserSubscription(orgId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      organizationId: orgId,
      OR: [
        { status: "active" },
        { status: "trialing" },
        {
          AND: [{ status: "canceled" }, { periodEnd: { gte: new Date() } }],
        },
      ],
    },
  });

  return subscription;
}
