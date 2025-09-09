import { SystemContext } from "./system-context";
import { queryRewriter } from "./query-writer";
import { searchSerper } from "./search-tool";
import { bulkCrawlWebsites } from "./scraper-tool";
import { extractResultsFromCrawledData } from "./result-extracter";

interface AgentLoopOptions {
  row: Record<string, string>;
  headers: string[];
  concurrency?: number;
  langfuseTraceId?: string;
}

interface AgentLoopResult {
  enrichedRow: Record<string, string>;
  cycles: number;
  usages: any[];
  success: boolean;
}

export const runAgentLoop = async (
  options: AgentLoopOptions
): Promise<AgentLoopResult> => {
  const { row, headers, concurrency = 3, langfuseTraceId } = options;

  // Step 1: Prepare the system context
  const context = new SystemContext(row, headers);

  console.log(`Starting agent loop for row with ${context.getMissingColumns().length} missing columns`);

  while (!context.shouldStop() && !context.isRowComplete()) {
    const currentCycle = context.getCurrentCycle();
    console.log(`--- Cycle ${currentCycle + 1} ---`);
    console.log(`Missing columns: ${context.getMissingColumns().join(", ")}`);

    try {
      // Step 2: Generate search queries using query-writer
      console.log("Step 2: Generating search queries...");
      const queryResult = await queryRewriter(
        {
          row: context.getRow(),
          previousQueries: context.getPreviousQueries(),
        },
        (functionId, usage) => context.reportUsage(functionId, usage),
        { langfuseTraceId }
      );

      console.log(`Generated plan: ${queryResult.plan}`);
      console.log(`Generated ${queryResult.queries.length} queries:`, queryResult.queries);

      // Step 3: Execute search queries in parallel
      console.log("Step 3: Executing search queries in parallel...");
      const searchPromises = queryResult.queries.map(async (query) => {
        const results = await searchSerper({ q: query, num: 10 }, undefined);
        return {
          query,
          results: results.organic.map(result => ({
            title: result.title,
            link: result.link,
            snippet: result.snippet,
            date: result.date,
          })),
        };
      });

      const searchResults = await Promise.all(searchPromises);
      
      // Add search results to context
      searchResults.forEach(searchResult => {
        context.reportSearch(searchResult);
      });

      console.log(`Completed ${searchResults.length} searches`);

      // Step 4: Collect all URLs and deduplicate
      console.log("Step 4: Collecting and deduplicating URLs...");
      const allUrls = new Set<string>();
      
      searchResults.forEach(searchResult => {
        searchResult.results.forEach(result => {
          allUrls.add(result.link);
        });
      });

      // Step 5: Filter out already scraped URLs
      console.log("Step 5: Filtering already scraped URLs...");
      const urlsToScrape = Array.from(allUrls).filter(url => !context.isUrlAlreadyScraped(url));
      
      console.log(`Found ${allUrls.size} total URLs, ${urlsToScrape.length} new URLs to scrape`);
      console.log(`Already scraped ${context.getScrapedUrls().length} URLs in previous cycles`);

      if (urlsToScrape.length === 0) {
        console.log("No new URLs to scrape, ending cycle");
        break;
      }

      // Step 6: Scrape the URLs
      console.log("Step 6: Scraping URLs...");
      const crawlResults = await bulkCrawlWebsites(
        { urls: urlsToScrape, concurrency },
        `Extract data for missing CSV columns: ${context.getMissingColumns().join(", ")}`
      );

      // Add scraped URLs to context
      context.addScrapedUrls(urlsToScrape);

      console.log(`Scraping completed: ${
        crawlResults.success === true ? `${crawlResults.results.length} successful` :
        crawlResults.success === "partial" ? `${crawlResults.successCount} successful, ${crawlResults.failureCount} failed` :
        "all failed"
      }`);

      // Step 7: Extract results from crawled data
      console.log("Step 7: Extracting data from crawled content...");
      const extractedData = await extractResultsFromCrawledData(
        {
          row: context.getRow(),
          headers: context.getHeaders(),
          crawledData: crawlResults,
        },
        (functionId, usage) => context.reportUsage(functionId, usage),
        { langfuseTraceId }
      );

      console.log(`Extracted data for ${Object.keys(extractedData.extractedData).length} columns:`, 
        Object.keys(extractedData.extractedData));

      // Update the row with extracted data
      const newRowData: Record<string, string> = {};
      Object.entries(extractedData.extractedData).forEach(([column, data]) => {
        newRowData[column] = data.result;
      });

      context.updateRow(newRowData);
      
      console.log(`Updated row. Missing columns now: ${context.getMissingColumns().length}`);

      // Check if we've filled all columns
      if (context.isRowComplete()) {
        console.log("Row is now complete!");
        break;
      }

    } catch (error) {
      console.error(`Error in cycle ${currentCycle + 1}:`, error);
      // Continue to next cycle or stop if max cycles reached
    }

    // Increment cycle for next iteration
    context.incrementCycle();
  }

  const finalRow = context.getRow();
  const totalCycles = context.getCurrentCycle() + (context.isRowComplete() ? 0 : 1);
  
  console.log(`Agent loop completed after ${totalCycles} cycles`);
  console.log(`Final missing columns: ${context.getMissingColumns().length}`);

  return {
    enrichedRow: finalRow,
    cycles: totalCycles,
    usages: context.getUsages(),
    success: context.getMissingColumns().length < Object.keys(row).filter(k => !row[k] || row[k].trim() === "" || row[k] === "-").length, // Success if we filled at least some columns
  };
};