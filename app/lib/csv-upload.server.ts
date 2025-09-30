import Papa from "papaparse";
import { prisma } from "~/lib/prisma.server";
import { updateCachedTable } from "~/lib/cached-table.server";

interface EnrichmentColumn {
  name: string;
  type: string;
}

export async function uploadAndProcessCSV({
  file,
  enrichmentColumns,
  enrichmentPrompt,
  websites,
  organizationId,
  createdBy,
}: {
  file: File;
  enrichmentColumns: EnrichmentColumn[];
  enrichmentPrompt: string;
  websites: string[];
  organizationId: string;
  createdBy: string;
}) {
  console.log("=== Starting CSV Upload Process ===");
  console.log("File:", file.name, "| Org:", organizationId);

  // Parse CSV file
  const csvText = await file.text();
  const parseResult = await new Promise<Papa.ParseResult<string[]>>(
    (resolve, reject) => {
      Papa.parse<string[]>(csvText, {
        header: false,
        skipEmptyLines: true,
        complete: resolve,
        error: reject,
      });
    },
  );

  if (parseResult.errors.length > 0) {
    console.error("CSV parse errors:", parseResult.errors);
    throw new Error("Failed to parse CSV file");
  }

  const csvRows = parseResult.data;
  if (csvRows.length === 0) {
    throw new Error("CSV file is empty");
  }

  // First row is headers
  const csvHeaders = csvRows[0];
  const csvDataRows = csvRows.slice(1);
  console.log("Parsed:", csvHeaders.length, "columns,", csvDataRows.length, "rows");

  // Create table
  console.log("Creating table:", file.name.replace(".csv", ""));
  const table = await prisma.table.create({
    data: {
      name: file.name.replace(".csv", ""),
      organizationId,
      createdBy,
    },
  });
  console.log("✓ Table created:", table.id);

  // Create columns (CSV headers + enrichment columns)
  const allColumnNames = [
    ...csvHeaders,
    ...enrichmentColumns.map((c) => c.name),
  ];

  console.log("Creating", allColumnNames.length, "columns");
  const columns = await Promise.all(
    allColumnNames.map((name, index) =>
      prisma.column.create({
        data: {
          name,
          tableId: table.id,
          position: index,
        },
      }),
    ),
  );
  console.log("✓ Created", columns.length, "columns");

  // Create rows and cells
  console.log("Creating", csvDataRows.length, "rows with cells...");

  await Promise.all(
    csvDataRows.map(async (rowData, rowIndex) => {
      const row = await prisma.row.create({
        data: {
          name: `Row ${rowIndex + 1}`,
          tableId: table.id,
          position: rowIndex,
        },
      });

      // Create cells for this row
      await Promise.all(
        columns.map(async (column, colIndex) => {
          const cell = await prisma.cell.create({
            data: {
              rowId: row.id,
              columnId: column.id,
            },
          });

          // Only create cell version for CSV columns (not enrichment columns)
          if (colIndex < csvHeaders.length) {
            await prisma.cellVersions.create({
              data: {
                cellId: cell.id,
                value: rowData[colIndex] || null,
                origin: "UPLOAD",
                picked: true,
                pickedAt: new Date(),
              },
            });
          }
        }),
      );
    }),
  );
  console.log("✓ Created", csvDataRows.length, "rows with cells and versions");

  console.log("Creating hint...");
  await prisma.hint.create({
    data: {
      tableId: table.id,
      scope: "TABLE",
      prompt: enrichmentPrompt,
      websites,
    },
  });
  console.log("✓ Hint created");

  // Create initial run
  console.log("Creating initial run...");
  const run = await prisma.run.create({
    data: {
      tableId: table.id,
    },
  });
  console.log("✓ Run created:", run.id);

  // Generate cached table
  console.log("Updating cached table...");
  await updateCachedTable(table.id);
  console.log("✓ Cached table updated");

  console.log("=== CSV Upload Complete ===");
  return table.id;
}
