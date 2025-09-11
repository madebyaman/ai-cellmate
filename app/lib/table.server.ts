import { prisma } from "~/lib/prisma.server";

export async function getTablesForOrganization(organizationId: string) {
  return await prisma.table.findMany({
    where: {
      organizationId,
    },
    include: {
      Run: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export type TableWithLatestRun = Awaited<ReturnType<typeof getTablesForOrganization>>[number];