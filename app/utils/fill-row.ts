import {
  generateText,
  type TelemetrySettings,
  stepCountIs,
  Output,
  tool,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { searchSerper } from "~/lib/serper";
import { bulkCrawlWebsites } from "~/utils/scraper";

export const fillRow = async (opts: {
  headers: string[];
  row: Record<string, string>;
  telemetry: TelemetrySettings;
  searchQueryRecommendations?: string[];
}) => {
  const searchQueries: string[] = [];
  const result = await generateText({
    model: openai("gpt-4o"),
    stopWhen: stepCountIs(10),
    onStepFinish: ({ toolCalls }) => {
      for (const toolCall of toolCalls) {
        if (toolCall.toolName === "searchWeb") {
          if (
            typeof toolCall.input === "object" &&
            toolCall.input &&
            "query" in toolCall.input &&
            typeof toolCall.input.query === "string"
          )
            searchQueries.push(toolCall.input.query);
        }
      }
    },
    experimental_telemetry: opts.telemetry,
    experimental_output: Output.object({
      schema: z.object({
        enrichedData: z.array(
          z.object({
            sourceWebsite: z.string().describe("The source website URL"),
            column: z.string().describe("The column name being enriched"),
            result: z.string().describe("The enriched value for this column"),
          }),
        ),
      }),
    }),
    tools: {
      searchWeb: tool({
        description: "Search the web for information",
        inputSchema: z.object({
          query: z.string().describe("The query to search the web for"),
        }),
        execute: async ({ query }, { abortSignal }) => {
          const results = await searchSerper(
            { q: query, num: 10 },
            abortSignal,
          );

          return results.organic.map((result) => ({
            title: result.title,
            link: result.link,
            snippet: result.snippet,
            date: result.date,
          }));
        },
      }),
      scrapePages: tool({
        description:
          "Scrape and summarize content from a list of URLs. It ouputs relevant information and further links you can scrape",
        inputSchema: z.object({
          urls: z
            .array(z.string())
            .describe("The URLs to scrape and summarize"),
          query: z
            .string()
            .describe(
              "The search query or context to help summarize the scraped content",
            ),
        }),
        execute: async ({ urls, query }, { abortSignal }) => {
          const results = await bulkCrawlWebsites({ urls }, query);
          return results;
        },
      }),
    },
    system: `
    You are a data filling AI assistant with web search capabilities. For each column that needs data, return the source website and the filled value. When finding information:

1. Use searchWeb to find 10 relevant URLs from diverse sources
2. Select 4-6 most relevant URLs to scrape using scrapePages tool
3. For each column being filled, specify the source website URL where you found the information

${opts.searchQueryRecommendations && opts.searchQueryRecommendations.length > 0 ? `Use these search query recommendations: ${opts.searchQueryRecommendations.join(", ")}` : ""}

Return enrichedData array with entries for each column you fill, including the sourceWebsite URL and the filled result.
      `,
    prompt: `
    Fill in the missing data for this row: ${JSON.stringify(opts.row)}

    For each column you fill, return:
    - sourceWebsite: The URL where you found the information
    - column: The column name
    - result: The filled value
    `,
  });

  return {
    result: result.experimental_output?.enrichedData,
    searchQueries,
  };
};
