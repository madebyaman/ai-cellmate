import { generateObject } from "ai";
import { z } from "zod";
import { model } from "./model";

const queryWriterSchema = z.object({
  plan: z
    .string()
    .describe("A detailed strategy for filling the missing CSV cells."),
  queries: z
    .array(z.string())
    .describe("A list of search queries to execute for filling missing data."),
});

type QueryWriterResult = z.infer<typeof queryWriterSchema>;

interface CSVRowData {
  row: Record<string, string>;
  previousQueries?: string[];
  prompt?: string;
  websites?: string[];
}

export const queryRewriter = async (
  rowData: CSVRowData,
  reportUsage: (functionId: string, usage: any) => void,
  opts: { langfuseTraceId?: string } = {},
): Promise<QueryWriterResult> => {
  console.log(`[QUERY GENERATION] Generating search queries for missing columns`);
  if (rowData.prompt) {
    console.log(`[QUERY GENERATION] Using enrichment prompt: ${rowData.prompt.substring(0, 100)}${rowData.prompt.length > 100 ? '...' : ''}`);
  }
  if (rowData.websites && rowData.websites.length > 0) {
    console.log(`[QUERY GENERATION] Targeting websites: ${rowData.websites.join(', ')}`);
  }
  const result = await generateObject({
    model,
    schema: queryWriterSchema,
    system: `
    You are a CSV data enrichment specialist. Your job is to analyze incomplete CSV row data and devise strategic search queries to fill in missing cells.

    ${rowData.prompt ? `ENRICHMENT GOAL:\n${rowData.prompt}\n\n` : ''}${rowData.websites && rowData.websites.length > 0 ? `PREFERRED WEBSITES:\nWhen possible, target these specific websites in your search queries: ${rowData.websites.join(', ')}\nYou can use site: operator (e.g., "query site:example.com") to focus searches on these domains.\n\n` : ''}Your approach should be:
    1. ANALYZE THE ROW DATA:
       - Identify which cells are empty or contain placeholder values
       - Look for patterns and relationships between existing data points
       - Use filled cells as context clues for missing information
       - Consider what type of data each column likely contains

    2. AVOID FAILED STRATEGIES:
       - Review previously attempted queries that didn't yield results
       - Don't repeat the same search approaches that failed
       - Try different angles, synonyms, or more specific/general queries
       - Consider alternative data sources or search terms

    3. DEVISE A STRATEGIC PLAN:
       - Prioritize which missing cells are most important to fill
       - Identify interdependencies (some cells might help fill others)
       - Consider using existing data as search context
       - Plan queries that build upon each other logically

    4. GENERATE TARGETED SEARCH QUERIES:
       - Create 3-5 specific search queries optimized for data discovery
       - Use existing row data as search context when relevant
       - Each query should target different aspects or sources for the missing data
       - Focus on queries likely to return structured, factual information
       - Avoid overly generic queries that return irrelevant results${rowData.websites && rowData.websites.length > 0 ? '\n       - When appropriate, use site: operator to target preferred websites' : ''}

    Remember: Your goal is to fill missing CSV cells with accurate, relevant data through strategic web searches.
    `,
    prompt: `
CSV Row Data to Enrich:
${JSON.stringify(rowData.row, null, 2)}

${rowData.previousQueries && rowData.previousQueries.length > 0 ? 
`Previously Attempted Queries (that didn't yield results):
${rowData.previousQueries.map(q => `- ${q}`).join('\n')}

IMPORTANT: Avoid repeating these failed query approaches. Try different strategies.` : 
'No previous queries attempted yet.'
}

Analyze the row data above and create a strategic plan for filling missing cells, then generate targeted search queries that will help find the missing information.

Focus on:
1. Which cells are missing or incomplete
2. How existing data can provide context for searches
3. What specific information needs to be found
4. How to avoid repeating failed query strategies
`,
    experimental_telemetry: opts.langfuseTraceId
      ? {
          isEnabled: true,
          functionId: "query-rewriter",
          metadata: {
            langfuseTraceId: opts.langfuseTraceId,
          },
        }
      : undefined,
  });

  if (result.usage) {
    reportUsage("query-writer", result.usage);
  }

  console.log(`[QUERY GENERATION] Generated ${result.object.queries.length} queries`);
  console.log(`[QUERY GENERATION] Queries: ${JSON.stringify(result.object.queries)}`);

  return result.object;
};
