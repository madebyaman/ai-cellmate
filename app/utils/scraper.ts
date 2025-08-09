import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

const SCRAPINGBEE_API_KEY = process.env.SCRAPINGBEE_API_KEY;
const SCRAPINGBEE_CONCURRENCY = parseInt(
  process.env.SCRAPINGBEE_CONCURRENCY || '3',
  10
);

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

const scrapingBeeSemaphore = new Semaphore(SCRAPINGBEE_CONCURRENCY);

export interface CrawlSuccessResponse {
  success: true;
  data: string;
}

export interface CrawlErrorResponse {
  success: false;
  error: string;
}

export type CrawlResponse = CrawlSuccessResponse | CrawlErrorResponse;

export interface BulkCrawlSuccessResponse {
  success: true;
  results: {
    url: string;
    result: CrawlSuccessResponse;
  }[];
}

export interface BulkCrawlPartialResponse {
  success: 'partial';
  results: {
    url: string;
    result: CrawlResponse;
  }[];
  successCount: number;
  failureCount: number;
}

export interface BulkCrawlFailureResponse {
  success: false;
  results: {
    url: string;
    result: CrawlResponse;
  }[];
  error: string;
}

export type BulkCrawlResponse =
  | BulkCrawlSuccessResponse
  | BulkCrawlPartialResponse
  | BulkCrawlFailureResponse;

export interface CrawlOptions {}

export interface BulkCrawlOptions extends CrawlOptions {
  urls: string[];
}

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
});

const extractArticleText = (html: string): string => {
  const $ = cheerio.load(html);
  $('script, style, nav, header, footer, iframe, noscript').remove();

  const articleSelectors = [
    'article',
    '[role="main"]',
    '.post-content',
    '.article-content',
    'main',
    '.content',
  ];

  let content = '';

  for (const selector of articleSelectors) {
    const element = $(selector);
    if (element.length) {
      content = turndownService.turndown(element.html() || '');
      break;
    }
  }

  if (!content) {
    content = turndownService.turndown($('body').html() || '');
  }

  return content.trim();
};

export const bulkCrawlWebsites = async (
  options: BulkCrawlOptions
): Promise<BulkCrawlResponse> => {
  const { urls } = options;

  const results = await Promise.all(
    urls.map(async (url) => ({
      url,
      result: await crawlWebsite({ url }),
    }))
  );

  const successfulResults = results.filter((r) => r.result.success);
  const failedResults = results.filter((r) => !r.result.success);
  
  const successCount = successfulResults.length;
  const failureCount = failedResults.length;
  const totalCount = results.length;

  // All successful
  if (successCount === totalCount) {
    return {
      results,
      success: true,
    } as BulkCrawlSuccessResponse;
  }
  
  // All failed
  if (failureCount === totalCount) {
    const errors = failedResults
      .map((r) => `${r.url}: ${(r.result as CrawlErrorResponse).error}`)
      .join('\n');

    return {
      results,
      success: false,
      error: `All websites failed to crawl:\n${errors}`,
    };
  }
  
  // Partial success
  return {
    results,
    success: 'partial',
    successCount,
    failureCount,
  } as BulkCrawlPartialResponse;
};

export const crawlWebsite = async (
  options: CrawlOptions & { url: string }
): Promise<CrawlResponse> => {
  const { url } = options;

  await scrapingBeeSemaphore.acquire();

  try {
    const scrapingBeeUrl = new URL('https://app.scrapingbee.com/api/v1');
    scrapingBeeUrl.searchParams.append('api_key', SCRAPINGBEE_API_KEY || '');
    scrapingBeeUrl.searchParams.append('url', url);

    const response = await fetch(scrapingBeeUrl.toString());

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch website: ${response.status} ${response.statusText}`,
      };
    }

    const html = await response.text();
    const articleText = extractArticleText(html);
    return {
      success: true,
      data: articleText,
    };
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  } finally {
    scrapingBeeSemaphore.release();
  }
};

