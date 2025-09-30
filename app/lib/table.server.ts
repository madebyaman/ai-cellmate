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

  const status = runs[0]?.status ?? "PENDING";

  return { table: tableWithoutCachedData, cachedData, status };
}

export async function deleteTable(tableId: string, organizationId: string) {
  console.log("=== Starting Table Deletion ===");
  console.log("Table ID:", tableId);
  console.log("Organization ID:", organizationId);

  // Verify the table belongs to the organization
  const table = await prisma.table.findFirst({
    where: {
      id: tableId,
      organizationId,
    },
  });

  if (!table) {
    console.error("Table not found or doesn't belong to organization");
    throw new Error("Table not found");
  }

  console.log("Table found:", table.name);

  // Delete in the correct order due to foreign key constraints
  // 1. Delete cell versions first
  console.log("Deleting cell versions...");
  const deletedCellVersions = await prisma.cellVersions.deleteMany({
    where: {
      cell: {
        row: {
          tableId,
        },
      },
    },
  });
  console.log("Deleted cell versions:", deletedCellVersions.count);

  // 2. Delete cells
  console.log("Deleting cells...");
  const deletedCells = await prisma.cell.deleteMany({
    where: {
      row: {
        tableId,
      },
    },
  });
  console.log("Deleted cells:", deletedCells.count);

  // 3. Delete rows
  console.log("Deleting rows...");
  const deletedRows = await prisma.row.deleteMany({
    where: {
      tableId,
    },
  });
  console.log("Deleted rows:", deletedRows.count);

  // 4. Delete columns
  console.log("Deleting columns...");
  const deletedColumns = await prisma.column.deleteMany({
    where: {
      tableId,
    },
  });
  console.log("Deleted columns:", deletedColumns.count);

  // 5. Delete hints
  console.log("Deleting hints...");
  const deletedHints = await prisma.hint.deleteMany({
    where: {
      tableId,
    },
  });
  console.log("Deleted hints:", deletedHints.count);

  // 6. Delete runs
  console.log("Deleting runs...");
  const deletedRuns = await prisma.run.deleteMany({
    where: {
      tableId,
    },
  });
  console.log("Deleted runs:", deletedRuns.count);

  // 7. Delete cached table
  console.log("Deleting cached table...");
  const deletedCachedTable = await prisma.cachedTable.deleteMany({
    where: {
      tableId,
    },
  });
  console.log("Deleted cached table:", deletedCachedTable.count);

  // 8. Finally delete the table itself
  console.log("Deleting table...");
  await prisma.table.delete({
    where: {
      id: tableId,
    },
  });
  console.log("Table deleted successfully");

  console.log("=== Table Deletion Complete ===");
}
