import * as cheerio from "cheerio";
import TurndownService from "turndown";

const SCRAPINGBEE_API_KEY = process.env.SCRAPINGBEE_API_KEY;

class Semaphore {
  private permits: number;
  private waiting: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise<void>((resolve) => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift()!;
      this.permits--;
      resolve();
    }
  }
}

export interface CrawlSuccessResponse {
  success: true;
  data: string;
  links?: string[];
}

export interface CrawlErrorResponse {
  success: false;
  error: string;
}

export type CrawlResponse = CrawlSuccessResponse | CrawlErrorResponse;

export interface BulkCrawlSuccessResponse {
  success: true;
  results: {
    success: true;
    url: string;
    result: string;
    links?: string[];
  }[];
}

export interface BulkCrawlPartialResponse {
  success: "partial";
  results: {
    success: boolean;
    url: string;
    result: string;
    links?: string[];
  }[];
  successCount: number;
  failureCount: number;
}

export interface BulkCrawlFailureResponse {
  success: false;
  error: string;
}

export type BulkCrawlResponse =
  | BulkCrawlSuccessResponse
  | BulkCrawlPartialResponse
  | BulkCrawlFailureResponse;

export interface CrawlOptions {}

export interface BulkCrawlOptions extends CrawlOptions {
  urls: string[];
  concurrency?: number;
}

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
});

const extractArticleText = (
  html: string,
): { content: string; links: string[] } => {
  const $ = cheerio.load(html);
  $("script, style, iframe, noscript").remove();

  // Extract all links before converting to markdown
  const links: string[] = [];
  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (href && href.startsWith("http")) {
      links.push(href);
    }
  });

  const content = turndownService.turndown($("body").html() || "");

  return {
    content: content.trim(),
    links: [...new Set(links)], // Remove duplicates
  };
};


export const bulkCrawlWebsites = async (
  options: BulkCrawlOptions,
  query: string,
): Promise<BulkCrawlResponse> => {
  const { urls, concurrency = 3 } = options;
  const scrapingBeeSemaphore = new Semaphore(concurrency);

  const crawlWebsite = async (
    options: CrawlOptions & { url: string; index: number; total: number },
  ): Promise<CrawlResponse> => {
    const { url, index, total } = options;

    console.log(`[SCRAPING] [${index}/${total}] ${url}`);

    await scrapingBeeSemaphore.acquire();

    try {
      // Try custom scraper first
      try {
        const response = await fetch(url);

        if (!response.ok) {
          // Skip scraping for non-200 responses
          console.log(`[SCRAPING] [${index}/${total}] SKIPPED: Non-200 response (${response.status} ${response.statusText})`);
          return {
            success: false,
            error: `Skipped: Non-200 response (${response.status} ${response.statusText})`,
          };
        }

        const html = await response.text();
        const { content, links } = extractArticleText(html);
        console.log(`[SCRAPING] [${index}/${total}] SUCCESS: ${content.length} chars scraped`);
        return {
          success: true,
          data: content,
          links,
        };
      } catch (customError) {
        // Custom scraper failed, fall back to ScrapingBee
        console.log(`[SCRAPING] [${index}/${total}] FAILED: ${customError instanceof Error ? customError.message : 'Unknown error'}, trying ScrapingBee`);
      }

      // Fallback to ScrapingBee
      const scrapingBeeUrl = new URL("https://app.scrapingbee.com/api/v1");
      scrapingBeeUrl.searchParams.append("api_key", SCRAPINGBEE_API_KEY || "");
      scrapingBeeUrl.searchParams.append("url", url);

      const response = await fetch(scrapingBeeUrl.toString());

      if (!response.ok) {
        console.log(`[SCRAPING] [${index}/${total}] ScrapingBee FAILED: ${response.status} ${response.statusText}`);
        return {
          success: false,
          error: `Failed to fetch website: ${response.status} ${response.statusText}`,
        };
      }

      const html = await response.text();
      const { content, links } = extractArticleText(html);
      console.log(`[SCRAPING] [${index}/${total}] ScrapingBee SUCCESS: ${content.length} chars scraped`);
      return {
        success: true,
        data: content,
        links,
      };
    } catch (error) {
      console.log(`[SCRAPING] [${index}/${total}] ScrapingBee FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        error: `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    } finally {
      scrapingBeeSemaphore.release();
    }
  };

  const results = await Promise.all(
    urls.map(async (url, index) => {
      const result = await crawlWebsite({ url, index: index + 1, total: urls.length });
      return {
        url,
        result,
      };
    }),
  );

  const successfulResults = results.filter((r) => r.result.success);
  const failedResults = results.filter((r) => !r.result.success);

  const successCount = successfulResults.length;
  const failureCount = failedResults.length;
  const totalCount = results.length;

  console.log(`[SCRAPING] Completed: ${successCount}/${totalCount} successful`);

  // All successful
  if (successCount === totalCount) {
    return {
      results: results.map((res) => ({
        success: true as const,
        url: res.url,
        result: res.result.success ? res.result.data || "" : "",
        links: res.result.success ? res.result.links || [] : [],
      })),
      success: true,
    };
  }

  // All failed
  if (failureCount === totalCount) {
    const errors = failedResults
      .map(
        (r) =>
          `${r.url}: ${!r.result.success ? r.result.error : "Unknown error"}`,
      )
      .join("\n");

    return {
      success: false,
      error: `All websites failed to crawl:\n${errors}`,
    };
  }

  // Partial success
  return {
    results: results.map((res) => ({
      success: res.result.success,
      url: res.url,
      result: res.result.success 
        ? res.result.data || ""
        : res.result.error || "",
      links: res.result.success ? res.result.links || [] : [],
    })),
    success: "partial",
    successCount,
    failureCount,
  };
};