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

export const enrichRow = async (opts: {
  headers: string[];
  row: Record<string, string>;
  telemetry: TelemetrySettings;
}) => {
  const rowShape: Record<string, z.ZodString> = Object.fromEntries(
    opts.headers.map((headerName) => [headerName, z.string()]),
  ) as Record<string, z.ZodString>;

  const result = await generateText({
    model: openai("gpt-4o"),
    stopWhen: stepCountIs(10),
    onStepFinish: ({ toolCalls }) => {
      for (const toolCall of toolCalls) {
        if (toolCall.toolName === "searchWeb") {
          console.log("searchWeb tool call", toolCall.input);
        } else if (toolCall.toolName === "scrapePages") {
          console.log("scrapePages tool call", toolCall.input);
        }
      }
    },
    experimental_telemetry: opts.telemetry,
    experimental_output: Output.object({
      schema: z.object({
        row: z.object(rowShape),
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
    You are a json data filler AI assistant with access to real-time web search capabilities. You will be given a json object and some information about the data. You will need to fill in the missing data in the json object with the help of the searchWeb and scrapePages tools. When finding information, you should:

1. Always search the web for up-to-date information using the searchWeb tool and the scrapePages tool to get the full content of the URLs.
2. If you're unsure about something, search the web to verify

For the row: ${JSON.stringify(opts.row)}
1. Use searchWeb to find 10 relevant URLs from diverse sources (news sites, blogs, official documentation, etc.)
2. Select 4-6 of the most relevant and diverse URLs to scrape using the scrapePages tool.
3. Use the full content of the URLs to fill in the missing data in the row.

      `,
    prompt: `
    Fill in the missing data for the row: ${JSON.stringify(opts.row)}
    `,
  });

  return result.experimental_output?.row;
};
