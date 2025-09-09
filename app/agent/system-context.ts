type SearchResult = {
  date?: string;
  title: string;
  link: string;
  snippet: string;
};

type SearchHistoryEntry = {
  query: string;
  results: SearchResult[];
};

export type TokenUsage = {
  descriptor: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  searcherTokens?: number;
  scraperTokens?: number;
};

export class SystemContext {
  /**
   * The current cycle in the CSV enrichment loop (max 2 cycles)
   */
  private cycle = 0;

  /**
   * The CSV row data being enriched
   */
  private readonly row: Record<string, string>;

  /**
   * The CSV headers
   */
  private readonly headers: string[];

  /**
   * The history of all queries searched
   */
  private searchHistory: SearchHistoryEntry[] = [];

  /**
   * The history of all URLs scraped (just URLs, not content)
   */
  private scrapedUrls: Set<string> = new Set();

  /**
   * Usage tracking for token consumption
   */
  private usages: TokenUsage[] = [];

  constructor(row: Record<string, string>, headers: string[]) {
    this.row = row;
    this.headers = headers;
  }

  getRow(): Record<string, string> {
    return { ...this.row };
  }

  getHeaders(): string[] {
    return [...this.headers];
  }

  getCurrentCycle(): number {
    return this.cycle;
  }

  shouldStop(): boolean {
    return this.cycle >= 2;
  }

  incrementCycle(): void {
    this.cycle++;
  }

  reportSearch(search: SearchHistoryEntry): void {
    this.searchHistory.push(search);
  }

  getSearchHistory(): SearchHistoryEntry[] {
    return [...this.searchHistory];
  }

  getPreviousQueries(): string[] {
    return this.searchHistory.map(entry => entry.query);
  }

  isUrlAlreadyScraped(url: string): boolean {
    return this.scrapedUrls.has(url);
  }

  addScrapedUrl(url: string): void {
    this.scrapedUrls.add(url);
  }

  addScrapedUrls(urls: string[]): void {
    urls.forEach(url => this.scrapedUrls.add(url));
  }

  getScrapedUrls(): string[] {
    return Array.from(this.scrapedUrls);
  }

  reportUsage(
    descriptor: string,
    usage: {
      inputTokens: number | undefined;
      outputTokens: number | undefined;
      totalTokens: number | undefined;
      searcherToken?: number;
      scraperToken?: number;
    },
  ): void {
    this.usages.push({
      descriptor,
      inputTokens: usage.inputTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
      totalTokens: usage.totalTokens ?? 0,
      searcherTokens: usage.searcherToken,
      scraperTokens: usage.scraperToken,
    });
  }

  getUsages(): TokenUsage[] {
    return [...this.usages];
  }

  /**
   * Update the row with new extracted data
   */
  updateRow(newData: Record<string, string>): void {
    Object.assign(this.row, newData);
  }

  /**
   * Get missing or empty columns
   */
  getMissingColumns(): string[] {
    return this.headers.filter(
      header => !this.row[header] || this.row[header].trim() === "" || this.row[header] === "-"
    );
  }

  /**
   * Check if row is completely filled
   */
  isRowComplete(): boolean {
    return this.getMissingColumns().length === 0;
  }
}
