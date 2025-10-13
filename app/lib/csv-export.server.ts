/**
 * Server-side utilities for exporting tables to CSV format
 * Converts enriched table data back to CSV for download
 */

import Papa from "papaparse";
import { getTableWithCachedData } from "~/lib/table.server";

/**
 * Export a table to CSV format
 * Includes both SOURCE and ENRICHMENT columns with their picked values
 */
export async function exportTableToCSV(
  tableId: string,
  organizationId: string
): Promise<{ success: boolean; csv?: string; filename?: string; error?: string }> {
  try {
    console.log(`[CSV EXPORT] Starting export for table ${tableId}`);

    // Fetch the table with cached data
    const tableData = await getTableWithCachedData(tableId, organizationId);

    if (!tableData) {
      return { success: false, error: "Table not found" };
    }

    const { cachedData } = tableData;

    // Build CSV structure
    // 1. Create headers array from columns
    const headers = cachedData.columns
      .sort((a, b) => a.position - b.position)
      .map((col) => col.name);

    // 2. Build rows array
    const rows = cachedData.rows
      .sort((a, b) => a.position - b.position)
      .map((row) => {
        const rowData: string[] = [];

        // For each column, find the corresponding cell value
        cachedData.columns
          .sort((a, b) => a.position - b.position)
          .forEach((column) => {
            const cell = row.cells.find((c) => c.columnId === column.id);

            if (!cell || cell.versions.length === 0) {
              rowData.push("");
              return;
            }

            // Find picked version or use latest version
            const pickedVersion = cell.versions.find((v) => v.picked);
            const currentVersion = pickedVersion || cell.versions[0];
            rowData.push(currentVersion?.value || "");
          });

        return rowData;
      });

    // 3. Combine headers and rows
    const csvData = [headers, ...rows];

    // 4. Convert to CSV string using Papa Parse
    const csv = Papa.unparse(csvData, {
      quotes: true, // Quote all fields
      quoteChar: '"',
      escapeChar: '"',
      delimiter: ",",
      header: false, // We're providing headers manually
      newline: "\n",
    });

    console.log(
      `[CSV EXPORT] Successfully exported ${rows.length} rows, ${headers.length} columns`
    );

    // Generate filename from table name
    const filename = `${cachedData.name.replace(/[^a-z0-9]/gi, "_")}.csv`;

    return { success: true, csv, filename };
  } catch (error) {
    console.error(`[CSV EXPORT] Error exporting table:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
