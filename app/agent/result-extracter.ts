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
  console.log(
    `[EXTRACTION] Using Gemini 2.0 Flash (1M context) for large content processing`,
  );

  // Format crawled data for the prompt
  const crawledContent = crawledData.success
    ? crawledData.results.map((result) => ({
        url: result.url,
        success: result.success,
        content: result.success ? result.result : `Error: ${result.result}`,
        links: result.success ? result.links : [],
      }))
    : [];

  // Create schema dynamically based on missing columns
  const dynamicSchema = createResultExtractorSchema(missingColumns);

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

Crawled Webpage Content:
${
  crawledContent.length > 0
    ? crawledContent
        .map(
          (page, index) => `
--- Page ${index + 1} ---
URL: ${page.url}
Status: ${page.success ? "Success" : "Failed"}
Content:
${page.content}
${
  page.links && page.links.length > 0
    ? `
Additional Links Found: ${page.links.slice(0, 5).join(", ")}${page.links.length > 5 ? "..." : ""}`
    : ""
}
`,
        )
        .join("\n")
    : "No crawled content available"
}

Analyze the crawled webpage content above and extract specific data to fill the missing CSV columns.

For each missing column you can fill, provide:
- The exact column name (must match CSV headers exactly)
- The extracted result (specific, factual data)
- The source URL where you found this information

Focus on extracting factual, specific information that directly answers what each missing column is asking for. Only extract data for columns that are actually missing or empty.
`,
    experimental_telemetry: opts.langfuseTraceId
      ? {
          isEnabled: true,
          functionId: "result-extracter",
          metadata: {
            langfuseTraceId: opts.langfuseTraceId,
          },
        }
      : undefined,
  });

  if (result.usage) {
    reportUsage("result-extracter", result.usage);
  }

  const validated = validateResultExtractorOutput(result.object);

  const extractedColumns = Object.keys(validated).filter(
    (key) => validated[key] !== undefined,
  );
  console.log(
    `[EXTRACTION] Extracted ${extractedColumns.length} column values: ${extractedColumns.join(", ")}`,
  );

  return validated;
};
