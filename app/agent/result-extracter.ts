import { generateObject } from "ai";
import { z } from "zod";
import { google } from "@ai-sdk/google";
import type { BulkCrawlResponse } from "./scraper-tool";
import { openai } from "@ai-sdk/openai";

// Helper function to create schema dynamically based on missing columns
const createResultExtractorSchema = (missingColumns: string[]) => {
  const columnSchemas: Record<string, z.ZodOptional<z.ZodObject<any>>> = {};

  for (const column of missingColumns) {
    columnSchemas[column] = z
      .object({
        result: z.string().describe("The extracted value for this column"),
        source: z
          .string()
          .describe("The source URL where this information was found"),
      })
      .optional();
  }

  return z.object(columnSchemas);
};

type ResultExtractorResult = {
  [key: string]:
    | {
        result: string;
        source: string;
      }
    | undefined;
};

// Helper function to validate and transform the result object
const validateResultExtractorOutput = (
  output: Record<string, any>,
): ResultExtractorResult => {
  const validated: ResultExtractorResult = {};

  for (const [key, value] of Object.entries(output)) {
    if (value === undefined || value === null) {
      validated[key] = undefined;
    } else if (
      typeof value === 'object' &&
      'result' in value &&
      'source' in value &&
      typeof value.result === 'string' &&
      typeof value.source === 'string'
    ) {
      validated[key] = {
        result: value.result,
        source: value.source,
      };
    } else {
      validated[key] = undefined;
    }
  }

  return validated;
};

interface ExtractionInput {
  row: Record<string, string>;
  headers: string[];
  crawledData: BulkCrawlResponse;
}

interface CrawledPage {
  url: string;
  success: boolean;
  content: string;
  links: string[];
}

// Helper function to extract from a batch of pages
const extractFromContentBatch = async (
  batch: CrawledPage[],
  row: Record<string, string>,
  headers: string[],
  missingColumns: string[],
  batchIndex: number,
  totalBatches: number,
  reportUsage: (functionId: string, usage: any) => void,
  langfuseTraceId?: string,
): Promise<ResultExtractorResult> => {
  // Create schema dynamically based on missing columns
  const dynamicSchema = createResultExtractorSchema(missingColumns);

  const batchContent = batch.map((page, index) => `
--- Page ${index + 1} (Batch ${batchIndex}/${totalBatches}) ---
URL: ${page.url}
Status: ${page.success ? "Success" : "Failed"}
Content:
${page.content}
${
  page.links && page.links.length > 0
    ? `Additional Links Found: ${page.links.slice(0, 5).join(", ")}${page.links.length > 5 ? "..." : ""}`
    : ""
}
`);

  const result = await generateObject({
    model: openai("gpt-5-nano"),
    schema: dynamicSchema,
    system: `
    You are a CSV data extraction specialist. Your job is to analyze crawled webpage content and extract specific data to fill missing CSV cells.

    Your approach should be:
    1. ANALYZE THE MISSING COLUMNS:
       - Focus only on columns that are empty, contain "-", or have placeholder values
       - Understand what type of data each missing column should contain based on its header name
       - Use existing filled columns as context clues for what information to look for

    2. EXTRACT DATA FROM CRAWLED CONTENT:
       - Carefully read through each crawled webpage's content
       - Look for specific factual information that matches the missing column requirements
       - Prioritize information that directly answers what the column header is asking for
       - Be precise and extract only relevant, factual data

    3. MATCH COLUMN HEADERS EXACTLY:
       - Use the exact column header names as provided in the headers array
       - Only extract data for columns that are actually missing/empty
       - Do not create new column names or modify existing ones

    4. PROVIDE SOURCE ATTRIBUTION:
       - Always specify the exact URL where you found the information
       - Only use URLs from the crawled data provided
       - If information spans multiple sources, choose the most authoritative/relevant one

    5. QUALITY STANDARDS:
       - Extract factual, specific information (avoid generic descriptions)
       - Prefer structured data (dates, numbers, names) over prose
       - If you cannot find relevant information for a column, omit it from the response
       - Ensure extracted data is consistent with the context of other filled columns

    IMPORTANT: Only return data for columns that are actually missing/empty in the input row. Do not extract data for columns that already have values.
    `,
    prompt: `
CSV Row Data:
${JSON.stringify(row, null, 2)}

CSV Headers:
${JSON.stringify(headers)}

Missing/Empty Columns to Fill:
${missingColumns.length > 0 ? missingColumns.join(", ") : "None - all columns are filled"}

Crawled Webpage Content (Batch ${batchIndex}/${totalBatches}):
${batchContent.join("\n")}

Analyze the crawled webpage content above and extract specific data to fill the missing CSV columns.

For each missing column you can fill, provide:
- The exact column name (must match CSV headers exactly)
- The extracted result (specific, factual data)
- The source URL where you found this information

Focus on extracting factual, specific information that directly answers what each missing column is asking for. Only extract data for columns that are actually missing or empty.
`,
    experimental_telemetry: langfuseTraceId
      ? {
          isEnabled: true,
          functionId: `result-extracter-batch-${batchIndex}`,
          metadata: {
            langfuseTraceId,
            batchIndex,
          },
        }
      : undefined,
  });

  if (result.usage) {
    reportUsage(`result-extracter-batch-${batchIndex}`, result.usage);
  }

  return validateResultExtractorOutput(result.object);
};

export const extractResultsFromCrawledData = async (
  input: ExtractionInput,
  reportUsage: (functionId: string, usage: any) => void,
  opts: { langfuseTraceId?: string } = {},
): Promise<ResultExtractorResult> => {
  const { row, headers, crawledData } = input;

  // Identify missing or empty columns
  const missingColumns = headers.filter(
    (header) =>
      !row[header] || row[header].trim() === "" || row[header] === "-",
  );

  console.log(
    `[EXTRACTION] Analyzing content for ${missingColumns.length} missing columns: ${missingColumns.join(", ")}`,
  );

  // Format crawled data for processing
  const crawledContent: CrawledPage[] = crawledData.success
    ? crawledData.results
        .filter((result) => result.success)
        .map((result) => ({
          url: result.url,
          success: true,
          content: result.result,
          links: result.links || [],
        }))
    : [];

  if (crawledContent.length === 0) {
    console.log(`[EXTRACTION] No successful crawled content available`);
    return {};
  }

  console.log(
    `[EXTRACTION] Processing ${crawledContent.length} pages in parallel batches`,
  );

  // Split content into batches (4 pages per batch)
  const BATCH_SIZE = 4;
  const batches: CrawledPage[][] = [];
  for (let i = 0; i < crawledContent.length; i += BATCH_SIZE) {
    batches.push(crawledContent.slice(i, i + BATCH_SIZE));
  }

  console.log(
    `[EXTRACTION] Executing ${batches.length} parallel extraction batches`,
  );

  // Run batch extractions in parallel
  const batchResults = await Promise.all(
    batches.map((batch, index) =>
      extractFromContentBatch(
        batch,
        row,
        headers,
        missingColumns,
        index + 1,
        batches.length,
        reportUsage,
        opts.langfuseTraceId,
      ),
    ),
  );

  // Merge all batch results - take first successful extraction per column
  const mergedResults: ResultExtractorResult = {};
  for (const batchResult of batchResults) {
    for (const [key, value] of Object.entries(batchResult)) {
      if (value && !mergedResults[key]) {
        mergedResults[key] = value;
      }
    }
  }

  const extractedColumns = Object.keys(mergedResults).filter(
    (key) => mergedResults[key] !== undefined,
  );
  console.log(
    `[EXTRACTION] Extracted ${extractedColumns.length} column values: ${extractedColumns.join(", ")}`,
  );

  return mergedResults;
};
