import * as cheerio from 'cheerio';
import { setTimeout } from 'node:timers/promises';
import robotsParser from 'robots-parser';
import TurndownService from 'turndown';
// import { cacheWithRedis } from '~/server/redis/redis';
import { fetchHtmlWithScrapingBee } from './scrapingbee';

export const DEFAULT_MAX_RETRIES = 3;
const MIN_DELAY_MS = 500; // 0.5 seconds
const MAX_DELAY_MS = 8000; // 8 seconds

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
  | BulkCrawlFailureResponse;

export interface CrawlOptions {
  maxRetries?: number;
}

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

const checkRobotsTxt = async (url: string): Promise<boolean> => {
  try {
    const parsedUrl = new URL(url);
    const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.host}/robots.txt`;
    const response = await fetch(robotsUrl);

    if (!response.ok) {
      // If no robots.txt exists, assume crawling is allowed
      return true;
    }

    const robotsTxt = await response.text();
    const robots = robotsParser(robotsUrl, robotsTxt);

    // Use a common crawler user agent
    return robots.isAllowed(url, 'LinkedInBot') ?? true;
  } catch (error) {
    // If there's an error checking robots.txt, assume crawling is allowed
    return true;
  }
};

export const bulkCrawlWebsites = async (
  options: BulkCrawlOptions
): Promise<BulkCrawlResponse> => {
  const { urls, maxRetries = DEFAULT_MAX_RETRIES } = options;

  console.log('[scraper] bulk crawl start', { count: urls.length, maxRetries });
  const results = await Promise.all(
    urls.map(async (url) => ({
      url,
      result: await crawlWebsite({ url, maxRetries }),
    }))
  );

  const allSuccessful = results.every((r) => r.result.success);

  if (!allSuccessful) {
    const errors = results
      .filter((r) => !r.result.success)
      .map((r) => `${r.url}: ${(r.result as CrawlErrorResponse).error}`)
      .join('\n');

    return {
      results,
      success: false,
      error: `Failed to crawl some websites:\n${errors}`,
    };
  }

  return {
    results,
    success: true,
  } as BulkCrawlResponse;
};

export const crawlWebsite = async (
  options: CrawlOptions & { url: string }
): Promise<CrawlResponse> => {
  const { url, maxRetries = DEFAULT_MAX_RETRIES } = options;

  // Check robots.txt before attempting to crawl
  const isAllowed = await checkRobotsTxt(url);
  if (!isAllowed) {
    return {
      success: false,
      error: `Crawling not allowed by robots.txt for: ${url}`,
    };
  }

  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      console.log('[scraper] attempt', { url, attempts: attempts + 1 });
      const html = await fetchHtmlWithScrapingBee(url);
      const articleText = extractArticleText(html);
      console.log('[scraper] success', { url, length: articleText.length });
      return {
        success: true,
        data: articleText,
      };

      // Note: unreachable if success above; errors are thrown and handled below
      attempts++;
      if (attempts === maxRetries) {
        return {
          success: false,
          error: `Failed to fetch website after ${maxRetries} attempts`,
        };
      }

      // Exponential backoff: 0.5s, 1s, 2s, 4s, 8s max
      const delay = Math.min(
        MIN_DELAY_MS * Math.pow(2, attempts),
        MAX_DELAY_MS
      );
      console.log('[scraper] retrying after delay', { url, delayMs: delay });
      await setTimeout(delay);
    } catch (error) {
      attempts++;
      if (attempts === maxRetries) {
        console.error('[scraper] network error maxed', {
          url,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return {
          success: false,
          error: `Network error after ${maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
      const delay = Math.min(
        MIN_DELAY_MS * Math.pow(2, attempts),
        MAX_DELAY_MS
      );
      console.warn('[scraper] network error, backing off', {
        url,
        attempt: attempts,
        delayMs: delay,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      await setTimeout(delay);
    }
  }

  return {
    success: false,
    error: 'Maximum retry attempts reached',
  };
};
