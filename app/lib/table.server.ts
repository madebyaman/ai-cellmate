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

export async function getTableStatus(tableId: string, organizationId: string) {
  const table = await prisma.table.findFirst({
    where: {
      id: tableId,
      organizationId,
    },
    select: {
      createdAt: true,
      id: true,
      name: true,
      runs: {
        take: 1,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          status: true,
          error: true,
        },
      },
    },
  });

  if (!table) {
    return null;
  }

  const status = table.runs[0]?.status ?? "PENDING";
  const runId = table.runs[0]?.id;
  const error = table.runs[0]?.error;

  return { table, status, runId, error };
}

export async function getCompletedRowIds(
  tableId: string,
  runId: string,
): Promise<string[]> {
  const completedRows = await prisma.row.findMany({
    where: {
      tableId,
      cells: {
        some: {
          cellVersions: {
            some: { runId },
          },
        },
      },
    },
    select: { id: true },
  });

  return completedRows.map((r) => r.id);
}

export async function getTableData(
  tableId: string,
  organizationId: string,
): Promise<CachedTableData> {
  const table = await prisma.table.findFirst({
    where: {
      id: tableId,
      organizationId,
    },
    include: {
      columns: {
        orderBy: { position: "asc" },
      },
      rows: {
        orderBy: { position: "asc" },
        include: {
          cells: {
            include: {
              cellVersions: {
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
      },
      runs: {
        orderBy: { createdAt: "desc" },
      },
      hint: true,
    },
  });

  if (!table) {
    throw new Error("Table not found");
  }

  return {
    id: table.id,
    name: table.name,
    uploadKey: table.uploadKey,
    organizationId: table.organizationId,
    createdBy: table.createdBy,
    createdAt: table.createdAt.toISOString(),
    updatedAt: table.updatedAt.toISOString(),
    columns: table.columns.map((col) => ({
      id: col.id,
      name: col.name,
      position: col.position,
      tableId: table.id,
      createdAt: col.createdAt.toISOString(),
      updatedAt: col.updatedAt.toISOString(),
      type: col.type,
    })),
    rows: table.rows.map((row) => ({
      id: row.id,
      position: row.position,
      tableId: table.id,
      name: row.name,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      cells: row.cells.map((cell) => ({
        id: cell.id,
        rowId: row.id,
        columnId: cell.columnId,
        createdAt: cell.createdAt.toISOString(),
        updatedAt: cell.updatedAt.toISOString(),
        versions: cell.cellVersions.map((version) => ({
          id: version.id,
          value: version.value,
          picked: version.picked,
          createdAt: version.createdAt.toISOString(),
          updatedAt: version.updatedAt.toISOString(),
          pickedAt: version.pickedAt?.toISOString() ?? null,
          cellId: cell.id,
          sourceUrl: version.sourceUrl,
          confidence: version.confidence,
          origin: version.origin,
          runId: version.runId,
        })),
      })),
    })),
    runs: table.runs.map((run) => ({
      id: run.id,
      tableId: run.tableId,
      status: run.status,
      createdAt: run.createdAt.toISOString(),
      updatedAt: run.updatedAt.toISOString(),
      startedAt: run.startedAt?.toISOString(),
      finishedAt: run.finishedAt?.toISOString(),
      error: run.error,
    })),
    hint: table.hint
      ? {
          id: table.hint.id,
          tableId: table.hint.tableId,
          scope: table.hint.scope,
          prompt: table.hint.prompt,
          websites: table.hint.websites,
          createdAt: table.hint.createdAt.toISOString(),
          updatedAt: table.hint.updatedAt.toISOString(),
        }
      : null,
  };
}

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
          id: true,
          status: true,
        },
      },
    },
  });

  if (!tableWithCache) {
    return null;
  }

  const { runs, cachedTable, ...tableWithoutCachedData } = tableWithCache;
  const status = runs[0]?.status ?? "PENDING";

  let cachedData: CachedTableData;

  if (tableWithCache.cachedTable) {
    cachedData = tableWithCache.cachedTable.data as unknown as CachedTableData;
  } else {
    // Generate cached data if it doesn't exist
    cachedData = await updateCachedTable(tableId);
  }

  // Query completed rows only when enrichment is actively running
  let completedRowIds: string[] = [];
  if (status === "RUNNING" || status === "PENDING") {
    const currentRunId = runs[0].id;

    const completedRows = await prisma.row.findMany({
      where: {
        tableId,
        cells: {
          some: {
            cellVersions: {
              some: { runId: currentRunId },
            },
          },
        },
      },
      select: { id: true },
    });

    completedRowIds = completedRows.map((r) => r.id);
  }

  return { table: tableWithoutCachedData, cachedData, status, completedRowIds };
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
