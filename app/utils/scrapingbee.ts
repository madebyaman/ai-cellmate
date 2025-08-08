export interface ScrapingBeeFetchOptions {
  signal?: AbortSignal;
  params?: Record<string, string | number | boolean | undefined>;
}

const SCRAPINGBEE_API_BASE = 'https://app.scrapingbee.com/api/v1';

export async function fetchHtmlWithScrapingBee(
  targetUrl: string,
  options: ScrapingBeeFetchOptions = {}
): Promise<string> {
  const apiKey = process.env.SCRAPINGBEE_API_KEY;
  if (!apiKey) {
    console.error('[scrapingbee] Missing SCRAPINGBEE_API_KEY');
    throw new Error('SCRAPINGBEE_API_KEY is not set in environment');
  }

  const params = new URLSearchParams();
  params.set('api_key', apiKey);
  params.set('url', targetUrl);

  // Allow caller to pass through additional query params
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined) params.set(key, String(value));
    }
  }

  const requestUrl = `${SCRAPINGBEE_API_BASE}?${params.toString()}`;

  const startedAt = Date.now();
  console.log('[scrapingbee] fetching', { targetUrl, requestUrl });
  const response = await fetch(requestUrl, {
    method: 'GET',
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: options.signal,
  });

  const durationMs = Date.now() - startedAt;
  console.log('[scrapingbee] response', {
    targetUrl,
    status: response.status,
    ok: response.ok,
    durationMs,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('[scrapingbee] non-200 response', {
      targetUrl,
      status: response.status,
      statusText: response.statusText,
      bodyPreview: text.slice(0, 500),
    });
    throw new Error(
      `ScrapingBee request failed: ${response.status} ${response.statusText}`
    );
  }

  return await response.text();
}


