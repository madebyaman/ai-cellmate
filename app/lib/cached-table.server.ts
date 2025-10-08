import { prisma } from "~/lib/prisma.server";
import type {
  Table,
  Row,
  Column,
  Cell,
  CellVersions,
  Run,
  Hint,
  HintOrRunScope,
  Status,
  Origin,
} from "@prisma-app/client";

// Transform Prisma types to serializable format (Date -> string)
type SerializedTable = Omit<Table, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

type SerializedRow = Omit<Row, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

type SerializedColumn = Omit<Column, "createdAt" | "updatedAt" | "type"> & {
  createdAt: string;
  updatedAt: string;
  type: "SOURCE" | "ENRICHMENT";
};

type SerializedCell = Omit<Cell, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

type SerializedCellVersions = Omit<
  CellVersions,
  "createdAt" | "updatedAt" | "pickedAt"
> & {
  createdAt: string;
  updatedAt: string;
  pickedAt: string | null;
};

type SerializedRun = Omit<
  Run,
  "createdAt" | "updatedAt" | "startedAt" | "finishedAt"
> & {
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
};

// Omit hints for row, column and cell
type SerializedHint = Omit<
  Hint,
  "createdAt" | "updatedAt" | "rowId" | "columnId" | "cellId"
> & {
  createdAt: string;
  updatedAt: string;
};

export interface CachedTableData extends SerializedTable {
  rows: Array<
    SerializedRow & {
      cells: Array<
        SerializedCell & {
          versions: SerializedCellVersions[];
        }
      >;
    }
  >;
  columns: SerializedColumn[];
  runs: SerializedRun[];
  hint: SerializedHint | null;
}

export async function getCachedTable(
  tableId: string,
): Promise<CachedTableData | null> {
  const cachedTable = await prisma.cachedTable.findUnique({
    where: { tableId },
  });

  if (!cachedTable) {
    return null;
  }

  return cachedTable.data as unknown as CachedTableData;
}

export async function updateCachedTable(
  tableId: string,
): Promise<CachedTableData> {
  // Fetch all table data with relations
  const table = await prisma.table.findUnique({
    where: { id: tableId },
    include: {
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
      columns: {
        orderBy: { position: "asc" },
      },
      runs: {
        orderBy: { createdAt: "desc" },
      },
      hint: true,
    },
  });

  if (!table) {
    throw new Error(`Table with id ${tableId} not found`);
  }

  // Transform data to cached format
  const cachedData: CachedTableData = {
    id: table.id,
    name: table.name,
    uploadKey: table.uploadKey,
    organizationId: table.organizationId,
    createdBy: table.createdBy,
    createdAt: table.createdAt.toISOString(),
    updatedAt: table.updatedAt.toISOString(),
    rows: table.rows.map((row) => ({
      id: row.id,
      tableId: table.id,
      name: row.name,
      position: row.position,
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
          cellId: cell.id,
          value: version.value,
          sourceUrl: version.sourceUrl,
          confidence: version.confidence,
          origin: version.origin,
          picked: version.picked,
          pickedAt: version.pickedAt?.toISOString() || null,
          createdAt: version.createdAt.toISOString(),
          updatedAt: version.updatedAt.toISOString(),
          runId: version.runId,
        })),
      })),
    })),
    columns: table.columns.map((column) => ({
      id: column.id,
      tableId: table.id,
      name: column.name,
      type: column.type as "SOURCE" | "ENRICHMENT",
      position: column.position,
      createdAt: column.createdAt.toISOString(),
      updatedAt: column.updatedAt.toISOString(),
    })),
    runs: table.runs.map((run) => ({
      id: run.id,
      tableId: table.id,
      // scope: run.scope,
      status: run.status,
      error: run.error,
      startedAt: run.startedAt?.toISOString(),
      finishedAt: run.finishedAt?.toISOString(),
      createdAt: run.createdAt.toISOString(),
      updatedAt: run.updatedAt.toISOString(),
      // rowId: run.rowId,
      // columnId: run.columnId,
      // cellId: run.cellId,
    })),
    hint: table.hint
      ? {
          id: table.hint.id,
          tableId: table.id,
          scope: table.hint.scope,
          prompt: table.hint.prompt,
          websites: table.hint.websites,
          createdAt: table.hint.createdAt.toISOString(),
          updatedAt: table.hint.updatedAt.toISOString(),
        }
      : null,
  };

  // Upsert cached table
  const cachedTable = await prisma.cachedTable.upsert({
    where: { tableId },
    update: {
      data: cachedData as any,
      updatedAt: new Date(),
    },
    create: {
      tableId,
      data: cachedData as any,
    },
  });

  return cachedData;
}

export async function deleteCachedTable(tableId: string): Promise<void> {
  await prisma.cachedTable.deleteMany({
    where: { tableId },
  });
}
