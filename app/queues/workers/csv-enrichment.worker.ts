import { Worker } from 'bullmq';
import { redisConnection } from '../config';
import type {
  CsvEnrichmentJobData,
  CsvEnrichmentJobDataUnion,
  CsvEnrichmentJobResult,
} from '../types';
import { readFile } from 'fs/promises';
import { generateObject, generateText, Output, stepCountIs, tool } from 'ai';
import { z } from 'zod';
import { google } from '@ai-sdk/google';
import { searchSerper } from '~/lib/serper';
import { bulkCrawlWebsites } from '~/utils/scraper';
import { openai } from '@ai-sdk/openai';

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

    // Step 2: Parse CSV into row objects { header: value }
    const { headers, rows } = parseCsvToRowObjects(csvData);

    // Build a dynamic schema that mirrors the CSV row structure
    const rowShape: Record<string, z.ZodString> = Object.fromEntries(
      headers.map((headerName) => [headerName, z.string()])
    ) as Record<string, z.ZodString>;

    const result = await generateText({
      model: openai('gpt-4o'),
      stopWhen: stepCountIs(3),
      experimental_output: Output.object({
        schema: z.object({
          rows: z.array(z.object(rowShape)),
        }),
      }),
      onStepFinish: ({ toolCalls }) => {
        for (const toolCall of toolCalls) {
          if (toolCall.toolName === 'searchWeb') {
            console.log('searchWeb', toolCall.input);
          } else if (toolCall.toolName === 'scrapePages') {
            console.log('scrapePages', toolCall.input);
          }
        }
      },
      tools: {
        searchWeb: tool({
          description: 'Search the web for information',
          inputSchema: z.object({
            query: z.string().describe('The query to search the web for'),
          }),
          execute: async ({ query }, { abortSignal }) => {
            const results = await searchSerper(
              { q: query, num: 10 },
              abortSignal
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
          description: 'Scrape the content of a list of URLs',
          inputSchema: z.object({
            urls: z.array(z.string()).describe('The URLs to scrape'),
          }),
          execute: async ({ urls }, { abortSignal }) => {
            const results = await bulkCrawlWebsites({ urls });

            if (!results.success) {
              return {
                error: results.error,
                results: results.results.map(({ url, result }) => ({
                  url,
                  success: result.success,
                  data: result.success ? result.data : result.error,
                })),
              };
            }

            return {
              results: results.results.map(({ url, result }) => ({
                url,
                success: result.success,
                data: result.data,
              })),
            };
          },
        }),
      },
      system: `
    You are a CSV data filler AI assistant with access to real-time web search capabilities. You will be given a CSV file and some information about the data. You will need to fill in the missing data in the CSV file with the help of the searchWeb and scrapePages tools. When finding information, you should:

1. Always search the web for up-to-date information using the searchWeb tool and the scrapePages tool to get the full content of the URLs.
2. If you're unsure about something, search the web to verify

For each row, you should:
1. Use searchWeb to find 10 relevant URLs from diverse sources (news sites, blogs, official documentation, etc.)
2. Select 4-6 of the most relevant and diverse URLs to scrape using the scrapePages tool.
3. Use the full content of the URLs to fill in the missing data in the CSV file.

      `,
      messages: [
        {
          role: 'user',
          content: `The rows of the CSV file are: ${JSON.stringify(rows)}`,
        },
        {
          role: 'user',
          content: `Fill in the missing data for the csv file:`,
        },
      ],
    });
    console.log('generated object', result.experimental_output);

    console.log(`CSV enrichment completed for user: ${userId}`);
    return {
      success: true,
      userId,
      processedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('CSV enrichment failed:', error);
    throw new Error(
      `CSV enrichment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Minimal CSV parser that supports common delimiters and trims whitespace.
function parseCsvToRowObjects(csvText: string): {
  headers: string[];
  rows: Array<Record<string, string>>;
} {
  const normalized = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rawLines = normalized.split('\n');
  const lines = rawLines
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l !== '-');

  if (lines.length === 0) return { headers: [], rows: [] };

  const delimiter = detectDelimiter(lines[0]);
  const headers = lines[0]
    .split(delimiter)
    .map((h) => h.trim())
    .filter((h) => h.length > 0);

  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(delimiter).map((p) => p.trim());
    const row: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      row[headers[c]] = parts[c] ?? '';
    }
    rows.push(row);
  }

  return { headers, rows };
}

function detectDelimiter(headerLine: string): string {
  const candidates = [',', '|', '\t', ';'];
  let best = ',';
  let bestCount = -1;
  for (const d of candidates) {
    const count = (headerLine.match(new RegExp(`\\${d}`, 'g')) || []).length;
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}
