import { prisma } from "~/lib/prisma.server";
import {
  updateCachedTable,
  type CachedTableData,
} from "~/lib/cached-table.server";
import type { Prisma } from "~/types/prisma";

export async function getTablesForOrganization(organizationId: string) {
  return await prisma.table.findMany({
    where: {
      organizationId,
    },
    include: {
      runs: {
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

export type TableWithLatestRun = Awaited<
  ReturnType<typeof getTablesForOrganization>
>[number];

export async function getTableWithCachedData(
  tableId: string,
  organizationId: string,
) {
  const tableWithCache = await prisma.table.findFirst({
    where: {
      id: tableId,
      organizationId,
    },
    select: {
      createdAt: true,
      id: true,
      name: true,
      cachedTable: true,
      runs: {
        take: 1,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          status: true,
        },
      },
    },
  });

  if (!tableWithCache) {
    return null;
  }

  const { runs, cachedTable, ...tableWithoutCachedData } = tableWithCache;
  let cachedData: CachedTableData;

  if (tableWithCache.cachedTable) {
    cachedData = tableWithCache.cachedTable.data as unknown as CachedTableData;
  } else {
    // Generate cached data if it doesn't exist
    cachedData = await updateCachedTable(tableId);
  }

  const status = runs[0].status ?? "PENDING";

  return { table: tableWithoutCachedData, cachedData, status };
}
