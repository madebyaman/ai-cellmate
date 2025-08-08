import { Worker } from 'bullmq';
import { redisConnection } from '../config';
import type {
  CsvEnrichmentJobData,
  CsvEnrichmentJobDataUnion,
  CsvEnrichmentJobResult,
} from '../types';
import { readFile } from 'fs/promises';
import { parseCsvLoose, reconstructCsv } from '../utils/csv';
import { enrichCellWithLLM } from '../utils/llm';
import { mapWithConcurrency } from '../utils/chunking';

export function createCsvEnrichmentWorker(): Worker<
  CsvEnrichmentJobDataUnion,
  CsvEnrichmentJobResult,
  string
> {
  return new Worker<CsvEnrichmentJobDataUnion, CsvEnrichmentJobResult, string>(
    'csv-enrichment',
    async (job) => {
      console.log(`Processing CSV enrichment job: ${job.name}:${job.id}`);

      switch (job.name) {
        case 'enrich-csv':
          return await processCsvEnrichment(job.data as CsvEnrichmentJobData);
        default:
          throw new Error(`Unknown CSV enrichment job type: ${job.name}`);
      }
    },
    { connection: redisConnection }
  );
}

async function processCsvEnrichment(
  data: CsvEnrichmentJobData
): Promise<CsvEnrichmentJobResult> {
  const {
    csvUrl,
    csvContent,
    enrichmentPrompt = 'Enhance the data in this CSV',
    userId,
  } = data;

  console.log(`Starting CSV enrichment`);
  console.log(`Enrichment prompt: ${enrichmentPrompt}`);

  try {
    // Step 1: Get the CSV data
    let csvData: string;
    if (csvContent) {
      // Use provided content directly
      csvData = csvContent;
      console.log(
        `Using provided CSV content (${csvContent.length} characters)`
      );
    } else if (csvUrl?.startsWith('file://')) {
      // Handle local file URLs
      const filePath = csvUrl.replace('file://', '');
      csvData = await readFile(filePath, 'utf-8');
      console.log(`Reading CSV from file: ${filePath}`);
    } else if (csvUrl) {
      // Handle HTTP/HTTPS URLs
      const csvResponse = await fetch(csvUrl);
      if (!csvResponse.ok) {
        throw new Error(`Failed to fetch CSV: ${csvResponse.statusText}`);
      }
      csvData = await csvResponse.text();
      console.log(`Fetched CSV from URL: ${csvUrl}`);
    } else {
      throw new Error('Either csvUrl or csvContent must be provided');
    }

    // Step 2: Parse CSV
    const { headers: originalHeaders, rows } = parseCsvLoose(csvData);
    if (originalHeaders.length === 0) {
      throw new Error('CSV appears to have no header row');
    }
    console.log(`Parsed CSV`, {
      headerCount: originalHeaders.length,
      rowCount: rows.length,
      sampleHeaders: originalHeaders.slice(0, 10),
    });

    // Step 3: Determine target columns from the enrichment prompt (simple heuristic)
    const inferredColumns = inferColumnsFromPrompt(enrichmentPrompt);
    console.log('Inferred target columns', { inferredColumns });

    // Merge headers to include inferred columns
    const headers = [...originalHeaders];
    for (const col of inferredColumns) {
      if (!headers.includes(col)) headers.push(col);
    }

    // Ensure all rows align to headers length
    for (let r = 0; r < rows.length; r++) {
      while (rows[r].length < headers.length) rows[r].push('');
      if (rows[r].length > headers.length) rows[r] = rows[r].slice(0, headers.length);
    }

    // Step 4: Build tasks for empty cells in target columns
    type Task = { rowIndex: number; columnIndex: number; columnName: string };
    const tasks: Task[] = [];
    const targetColumnIndexes = inferredColumns.map((c) => headers.indexOf(c)).filter((i) => i >= 0);
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (const cIdx of targetColumnIndexes) {
        const current = row[cIdx] ?? '';
        if (String(current).trim() === '') {
          tasks.push({ rowIndex: r, columnIndex: cIdx, columnName: headers[cIdx] });
        }
      }
    }
    console.log('Prepared enrichment tasks', { taskCount: tasks.length, rows: rows.length, columns: inferredColumns });

    // Step 5: Execute enrichment with concurrency
    const concurrency = Number(process.env.LLM_CONCURRENCY || 4);
    const outputs = await mapWithConcurrency(tasks, async (task) => {
      const rowObject: Record<string, string> = {};
      for (let i = 0; i < headers.length; i++) rowObject[headers[i]] = rows[task.rowIndex][i] ?? '';
      return await enrichCellWithLLM({
        prompt: enrichmentPrompt,
        rowIndex: task.rowIndex,
        columnName: task.columnName,
        rowObject,
      });
    }, concurrency);

    // Step 6: Apply outputs to rows
    for (const out of outputs) {
      const cIdx = headers.indexOf(out.columnName);
      if (cIdx >= 0 && rows[out.rowIndex]) {
        rows[out.rowIndex][cIdx] = out.value ?? '';
      }
    }

    // Step 7: Reconstruct CSV and prepare result
    const enrichedCsv = reconstructCsv(headers, rows);
    const result: CsvEnrichmentJobResult = {
      success: true,
      originalCsvUrl: csvUrl || 'direct-content',
      enrichedDataPreview: enrichedCsv.substring(0, 200) + '... [ENRICHED]',
      rowsProcessed: rows.length,
      userId,
      processedAt: new Date().toISOString(),
    };

    console.log(`CSV enrichment completed for user: ${userId}`);
    return result;
  } catch (error) {
    console.error('CSV enrichment failed:', error);
    throw new Error(
      `CSV enrichment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

function inferColumnsFromPrompt(prompt: string): string[] {
  // Very simple heuristic: take text after colon, split by commas/and/pipe
  const idx = prompt.indexOf(':');
  const tail = idx >= 0 ? prompt.slice(idx + 1) : prompt;
  const candidates = tail
    .split(/[,|]| and |\n/gi)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/[^a-z0-9 _-]/gi, ''))
    .map((s) => s.replace(/\s+/g, ' ').trim());
  // Deduplicate while preserving order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of candidates) {
    const lower = c.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      out.push(c);
    }
  }
  return out;
}
