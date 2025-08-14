import {
  evaluateDomainAuthority,
  type DomainAuthorityScore,
} from "./domain-authority";

export interface DataPoint {
  sourceWebsite: string;
  column: string;
  result: string;
}

export interface SourceWebsite {
  url: string;
  da: number;
  tier: string;
  factors: string[];
}

export interface CombinedResult {
  [column: string]: {
    result: string;
    sourceWebsites: SourceWebsite[];
  }[];
}

/**
 * Combines enriched data points by grouping identical results together
 * and returns all result groups sorted by quality score.
 * 
 * This function processes CSV enrichment data by:
 * 1. Grouping identical results from the same column together
 * 2. Calculating domain authority scores for all source websites
 * 3. Computing quality scores based on DA + diversity bonus
 * 4. Returning all result groups sorted by quality (best first)
 * 
 * Key features:
 * - Preserves ALL discovered results (not just the best one)
 * - Removes duplicate URLs within the same result group
 * - Sorts sources by domain authority (highest first)
 * - Applies diversity bonus for results with multiple sources
 * - Returns results sorted by collective quality score
 * 
 * Quality scoring:
 * - Base score: Average domain authority of sources
 * - Diversity bonus: Up to 25 points for multiple sources (5 points per source)
 * - Final ranking prioritizes high-authority consensus over single sources
 * 
 * @param data Array of enriched data points from CSV processing
 * @returns CombinedResult with all results grouped by column, sorted by quality
 * 
 * @example
 * ```typescript
 * const data = [
 *   { sourceWebsite: "wikipedia.org", column: "email", result: "john@example.com" },
 *   { sourceWebsite: "linkedin.com", column: "email", result: "john@example.com" },
 *   { sourceWebsite: "random.blog", column: "email", result: "j.doe@company.com" }
 * ];
 * 
 * const result = combineResults(data);
 * // result.email[0] = { result: "john@example.com", sourceWebsites: [wiki, linkedin] }
 * // result.email[1] = { result: "j.doe@company.com", sourceWebsites: [blog] }
 * ```
 */
export function combineResults(data: DataPoint[]): CombinedResult {
  const combined: CombinedResult = {};

  // Group by column and result value
  // {string: {string: websites[]}}
  const groupedByColumnAndResult = new Map<
    string,
    Map<string, SourceWebsite[]>
  >();

  data.forEach((dataPoint) => {
    const { column, result, sourceWebsite } = dataPoint;

    // Evaluate domain authority for this source
    const daScore = evaluateDomainAuthority(sourceWebsite);
    const source: SourceWebsite = {
      url: sourceWebsite,
      da: daScore.score,
      tier: daScore.tier,
      factors: daScore.factors,
    };

    // Initialize column group if it doesn't exist
    if (!groupedByColumnAndResult.has(column)) {
      groupedByColumnAndResult.set(column, new Map());
    }

    const columnGroup = groupedByColumnAndResult.get(column)!;

    // Initialize result group if it doesn't exist
    if (!columnGroup.has(result)) {
      columnGroup.set(result, []);
    }

    // Add source to the result group
    columnGroup.get(result)!.push(source);
  });

  // Convert grouped data to final format
  // For each column, return all results grouped by result value
  groupedByColumnAndResult.forEach((resultGroups, column) => {
    const allResults: { result: string; sourceWebsites: SourceWebsite[] }[] = [];

    resultGroups.forEach((sources, result) => {
      // Calculate collective score for this result for sorting
      const totalWeight = sources.reduce((sum, source) => sum + source.da, 0);
      const weightedScore = totalWeight / sources.length;
      const diversityBonus = Math.min(sources.length * 5, 25);
      const finalScore = weightedScore + diversityBonus;

      // Sort sources by domain authority (highest first)
      const sortedSources = [...sources].sort((a, b) => b.da - a.da);

      // Remove duplicate URLs (in case the same website appears multiple times)
      const uniqueSources = sortedSources.filter(
        (source, index, arr) =>
          arr.findIndex((s) => s.url === source.url) === index,
      );

      allResults.push({
        result,
        sourceWebsites: uniqueSources,
        _score: finalScore, // Temporary property for sorting
      } as any);
    });

    // Sort all results by their collective score (highest first)
    allResults.sort((a: any, b: any) => b._score - a._score);
    
    // Remove the temporary _score property
    allResults.forEach((result: any) => delete result._score);

    combined[column] = allResults;
  });

  return combined;
}

/**
 * Calculates metrics for the combined results to help with evaluation
 */
export interface ResultMetrics {
  averageDomainAuthority: number;
  diversityScore: number;
  totalSources: number;
  tierDistribution: Record<string, number>;
  hasHighAuthoritySource: boolean;
  hasPremiumSource: boolean;
}

export function calculateResultMetrics(
  combinedResult: CombinedResult,
): Record<string, ResultMetrics> {
  const metrics: Record<string, ResultMetrics> = {};

  Object.entries(combinedResult).forEach(([column, resultGroups]) => {
    // Flatten all sources from all result groups for column-level metrics
    const allSources = resultGroups.flatMap(group => group.sourceWebsites);

    if (allSources.length === 0) {
      metrics[column] = {
        averageDomainAuthority: 0,
        diversityScore: 0,
        totalSources: 0,
        tierDistribution: {},
        hasHighAuthoritySource: false,
        hasPremiumSource: false,
      };
      return;
    }

    // Calculate average domain authority
    const averageDomainAuthority =
      allSources.reduce((sum, source) => sum + source.da, 0) / allSources.length;

    // Calculate diversity score based on source count
    // 1 source = 30%, 2 sources = 60%, 3+ sources = 100%
    let diversityScore: number;
    
    if (allSources.length === 1) {
      diversityScore = 30;
    } else if (allSources.length === 2) {
      diversityScore = 60;
    } else {
      // 3+ sources get full score, but apply quality multiplier for domain diversity
      const uniqueDomains = new Set();
      const uniqueTLDs = new Set();

      allSources.forEach((s) => {
        try {
          const hostname = new URL(s.url).hostname;
          uniqueDomains.add(hostname);
          const tld = hostname.split(".").pop();
          if (tld) uniqueTLDs.add(tld);
        } catch {
          // Skip invalid URLs
        }
      });

      // Quality multiplier: penalize if all sources are from same domain
      const domainDiversityRatio = uniqueDomains.size / allSources.length;
      const tldDiversityRatio = uniqueTLDs.size / allSources.length;
      
      // Combined diversity ratio (70% domain, 30% TLD weight)
      const qualityMultiplier = (domainDiversityRatio * 0.7) + (tldDiversityRatio * 0.3);
      
      // Base score of 100 for 3+ sources, adjusted by quality
      diversityScore = Math.round(100 * Math.max(0.5, qualityMultiplier));
    }

    // Calculate tier distribution
    const tierDistribution: Record<string, number> = {};
    allSources.forEach((source) => {
      tierDistribution[source.tier] = (tierDistribution[source.tier] || 0) + 1;
    });

    // Check for high authority and premium sources
    const hasHighAuthoritySource = allSources.some((s) => s.da >= 70);
    const hasPremiumSource = allSources.some((s) => s.tier === "premium");

    metrics[column] = {
      averageDomainAuthority,
      diversityScore,
      totalSources: allSources.length,
      tierDistribution,
      hasHighAuthoritySource,
      hasPremiumSource,
    };
  });

  return metrics;
}
