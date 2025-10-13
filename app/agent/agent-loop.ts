import { SystemContext } from "./system-context";
import { queryRewriter } from "./query-writer";
import { searchSerper } from "./search-tool";
import { bulkCrawlWebsites } from "./scraper-tool";
import { extractResultsFromCrawledData } from "./result-extracter";
import { publishEnrichmentEvent } from "~/lib/redis-event-publisher";
import { createEnrichmentEvent } from "~/lib/enrichment-events";

interface AgentLoopOptions {
  row: Record<string, string>;
  headers: string[];
  concurrency?: number;
  langfuseTraceId?: string;
  prompt?: string;
  websites?: string[];
  tableId?: string;
  rowId?: string;
  rowPosition?: number;
  currentRowIndex?: number;
  totalRows?: number;
}

interface AgentLoopResult {
  enrichedRow: Record<string, string>;
  cycles: number;
  usages: any[];
  success: boolean;
}

export const runAgentLoop = async (
  options: AgentLoopOptions,
): Promise<AgentLoopResult> => {
  const {
    row,
    headers,
    concurrency = 3,
    langfuseTraceId,
    prompt,
    websites = [],
    tableId,
    rowId,
    rowPosition,
    currentRowIndex,
    totalRows,
  } = options;

  // Step 1: Prepare the system context
  const context = new SystemContext(row, headers);

  console.log(
    `[AGENT LOOP] Starting enrichment for row with ${context.getMissingColumns().length} missing columns`,
  );
  console.log(
    `[AGENT LOOP] Prompt: ${prompt?.substring(0, 100)}${prompt && prompt.length > 100 ? "..." : ""}`,
  );
  console.log(
    `[AGENT LOOP] Websites: ${websites.length > 0 ? websites.join(", ") : "none"}`,
  );

  while (!context.shouldStop() && !context.isRowComplete()) {
    const currentCycle = context.getCurrentCycle();
    const maxCycles = 2;
    console.log(
      `\n[CYCLE ${currentCycle + 1}/${maxCycles}] Starting enrichment cycle`,
    );
    console.log(
      `[CYCLE ${currentCycle + 1}] Missing columns: ${context.getMissingColumns().join(", ")}`,
    );

    try {
      // Emit stage-start for "Searching data"
      if (tableId) {
        console.log(`[PUBLISH] stage-start - Searching data`);
        await publishEnrichmentEvent(
          tableId,
          createEnrichmentEvent("stage-start", {
            stage: "Searching data",
          }),
        );
      }

      // Step 2: Generate search queries using query-writer
      console.log(`[CYCLE ${currentCycle + 1}] Generating search queries...`);
      const queryResult = await queryRewriter(
        {
          row: context.getRow(),
          previousQueries: context.getPreviousQueries(),
          prompt,
          websites,
        },
        (functionId, usage) => context.reportUsage(functionId, usage),
        { langfuseTraceId },
      );

      console.log(
        `[CYCLE ${currentCycle + 1}] Generated ${queryResult.queries.length} queries`,
      );

      // Step 3: Execute search queries in parallel
      console.log(
        `[SEARCHING] Executing ${queryResult.queries.length} parallel searches`,
      );
      const searchPromises = queryResult.queries.map(async (query) => {
        const results = await searchSerper({ q: query, num: 3 }, undefined);
        return {
          query,
          results: results.organic.map((result) => ({
            title: result.title,
            link: result.link,
            snippet: result.snippet,
            date: result.date,
          })),
        };
      });

      const searchResults = await Promise.all(searchPromises);

      // Add search results to context
      searchResults.forEach((searchResult) => {
        context.reportSearch(searchResult);
      });

      console.log(`[SEARCHING] Completed ${searchResults.length} searches`);

      // Emit stage-complete for "Searching data"
      if (tableId) {
        console.log(`[PUBLISH] stage-complete - Searching data`);
        await publishEnrichmentEvent(
          tableId,
          createEnrichmentEvent("stage-complete", {
            stage: "Searching data",
          }),
        );
      }

      // Step 4: Collect all URLs and deduplicate
      const allUrls = new Set<string>();

      searchResults.forEach((searchResult) => {
        searchResult.results.forEach((result) => {
          allUrls.add(result.link);
        });
      });

      // Step 5: Filter out already scraped URLs and limit to 15 maximum
      const MAX_URLS_PER_CYCLE = 15;
      const deduplicatedUrls = Array.from(allUrls).filter(
        (url) => !context.isUrlAlreadyScraped(url),
      );
      const urlsToScrape = deduplicatedUrls.slice(0, MAX_URLS_PER_CYCLE);

      console.log(
        `[URL DEDUP] ${allUrls.size} URLs → ${deduplicatedUrls.length} unique URLs after dedup → ${urlsToScrape.length} URLs selected (max ${MAX_URLS_PER_CYCLE})`,
      );
      console.log(
        `[URL DEDUP] Already scraped ${context.getScrapedUrls().length} URLs in previous cycles`,
      );

      if (urlsToScrape.length === 0) {
        console.log(
          `[CYCLE ${currentCycle + 1}] No new URLs to scrape, ending cycle`,
        );
        break;
      }

      // Emit stage-start for "Scraping"
      if (tableId) {
        console.log(`[PUBLISH] stage-start - Scraping`);
        await publishEnrichmentEvent(
          tableId,
          createEnrichmentEvent("stage-start", {
            stage: "Scraping",
          }),
        );
      }

      // Step 6: Scrape the URLs
      console.log(
        `[SCRAPING] Starting ${urlsToScrape.length} parallel scrapes (concurrency: ${concurrency})`,
      );
      const crawlResults = await bulkCrawlWebsites(
        { urls: urlsToScrape, concurrency },
        `Extract data for missing CSV columns: ${context.getMissingColumns().join(", ")}`,
      );

      // Add scraped URLs to context
      context.addScrapedUrls(urlsToScrape);

      console.log(
        `[SCRAPING] Completed: ${
          crawlResults.success === true
            ? `${crawlResults.results.length}/${urlsToScrape.length} successful`
            : crawlResults.success === "partial"
              ? `${crawlResults.successCount}/${urlsToScrape.length} successful`
              : "all failed"
        }`,
      );

      // Emit stage-complete for "Scraping"
      if (tableId) {
        console.log(`[PUBLISH] stage-complete - Scraping`);
        await publishEnrichmentEvent(
          tableId,
          createEnrichmentEvent("stage-complete", {
            stage: "Scraping",
          }),
        );
      }

      // Emit stage-start for "Parsing" (implicit in scraping, so complete immediately)
      if (tableId) {
        console.log(`[PUBLISH] stage-start - Parsing`);
        await publishEnrichmentEvent(
          tableId,
          createEnrichmentEvent("stage-start", {
            stage: "Parsing",
          }),
        );
        console.log(`[PUBLISH] stage-complete - Parsing`);
        await publishEnrichmentEvent(
          tableId,
          createEnrichmentEvent("stage-complete", {
            stage: "Parsing",
          }),
        );
      }

      // Emit stage-start for "Lookups"
      if (tableId) {
        console.log(`[PUBLISH] stage-start - Lookups`);
        await publishEnrichmentEvent(
          tableId,
          createEnrichmentEvent("stage-start", {
            stage: "Lookups",
          }),
        );
      }

      // Step 7: Extract results from crawled data
      console.log(
        `[EXTRACTION] Analyzing ${crawlResults.success !== false ? crawlResults.results.filter((r) => r.success).length : 0} pages for data extraction`,
      );
      const extractedData = await extractResultsFromCrawledData(
        {
          row: context.getRow(),
          headers: context.getHeaders(),
          crawledData: crawlResults,
        },
        (functionId, usage) => context.reportUsage(functionId, usage),
        { langfuseTraceId },
      );

      const extractedColumns = Object.keys(extractedData).filter(
        (key) => extractedData[key] !== undefined,
      );
      console.log(
        `[EXTRACTION] Found values for: ${extractedColumns.length > 0 ? extractedColumns.join(", ") : "none"}`,
      );

      // Emit stage-complete for "Lookups"
      if (tableId) {
        console.log(`[PUBLISH] stage-complete - Lookups`);
        await publishEnrichmentEvent(
          tableId,
          createEnrichmentEvent("stage-complete", {
            stage: "Lookups",
          }),
        );
      }

      // Update the row with extracted data
      const newRowData: Record<string, string> = {};
      Object.entries(extractedData).forEach(([column, data]) => {
        if (data) {
          newRowData[column] = data.result;
        }
      });

      context.updateRow(newRowData);

      const stillMissing = context.getMissingColumns();
      console.log(
        `[EXTRACTION] Still missing: ${stillMissing.length > 0 ? stillMissing.join(", ") : "none"}`,
      );
      console.log(
        `[CYCLE ${currentCycle + 1}] COMPLETE - Filled: ${extractedColumns.length}, Remaining: ${stillMissing.length}`,
      );

      // Check if we've filled all columns
      if (context.isRowComplete()) {
        console.log(`[CYCLE ${currentCycle + 1}] Row is now complete!`);
        break;
      }

      // Check if we're about to enter cycle 2 (row-retrying event)
      if (
        currentCycle === 0 &&
        !context.isRowComplete() &&
        tableId &&
        rowId &&
        rowPosition
      ) {
        const filledCount = headers.length - context.getMissingColumns().length;
        console.log(
          `[PUBLISH] row-retrying - Row ${rowPosition}, filled ${filledCount}/${headers.length}, cycle 2`,
        );
        await publishEnrichmentEvent(
          tableId,
          createEnrichmentEvent("row-retrying", {
            rowId,
            rowPosition,
            columnsFilled: filledCount,
            columnsTotal: headers.length,
            cycle: 2,
          }),
        );
      }
    } catch (error) {
      console.error(
        `[CYCLE ${currentCycle + 1}] ERROR:`,
        JSON.stringify(error, null, 2),
      );
      // Continue to next cycle or stop if max cycles reached
    }

    // Increment cycle for next iteration
    context.incrementCycle();
  }

  const finalRow = context.getRow();
  const totalCycles =
    context.getCurrentCycle() + (context.isRowComplete() ? 0 : 1);
  const missingCount = context.getMissingColumns().length;
  const totalColumns = headers.length;
  const filledCount = totalColumns - missingCount;

  console.log(
    `\n[AGENT LOOP] All cycles complete - Final success: ${missingCount === 0}`,
  );
  console.log(`[AGENT LOOP] Total cycles: ${totalCycles}`);
  console.log(`[AGENT LOOP] Filled: ${filledCount}/${totalColumns} columns`);
  console.log(
    `[AGENT LOOP] Missing: ${missingCount > 0 ? context.getMissingColumns().join(", ") : "none"}`,
  );

  return {
    enrichedRow: finalRow,
    cycles: totalCycles,
    usages: context.getUsages(),
    success:
      context.getMissingColumns().length <
      Object.keys(row).filter(
        (k) => !row[k] || row[k].trim() === "" || row[k] === "-",
      ).length, // Success if we filled at least some columns
  };
};
