import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { CombinedResult, ResultMetrics } from './result-combiner';

export interface ConfidenceScore {
  score: 0 | 1 | 2 | 3 | 4 | 5;
  description: string;
  reasoning: string;
}

export interface EvaluationResult {
  [column: string]: {
    confidence: ConfidenceScore;
    searchQueryRecommendation?: string;
  };
}

const confidenceScoreSchema = z.object({
  score: z.enum([0, 1, 2, 3, 4, 5]).describe("Confidence score from 0-5"),
  description: z.string().describe("Brief description of the confidence level"),
  reasoning: z.string().describe("Detailed reasoning for this confidence score"),
});

const evaluationResultSchema = z.record(
  z.string(),
  z.object({
    confidence: confidenceScoreSchema,
    searchQueryRecommendation: z.string().optional().describe("Search query recommendation if confidence is low (≤2)"),
  })
);

/**
 * Maps confidence scores to their semantic meanings
 */
export const CONFIDENCE_LEVELS = {
  0: "No Result - No data found for this column",
  1: "Very Low - Poor quality sources with questionable reliability",
  2: "Low - Limited sources with moderate quality but lacking diversity",
  3: "Moderate - Good quality sources with reasonable diversity and authority",
  4: "High - Excellent sources with high authority and good diversity",
  5: "Very High - Premium sources with exceptional authority and excellent diversity"
} as const;

/**
 * Performs subjective evaluation using LLM to assess confidence based on
 * domain authority, diversity, commonality, and relevance
 */
export async function evaluateResultsSubjectively(
  combinedResults: CombinedResult,
  metrics: Record<string, ResultMetrics>,
  originalRow: Record<string, string>
): Promise<EvaluationResult> {
  
  const result = await generateObject({
    model: openai("gpt-4o"),
    schema: evaluationResultSchema,
    system: `You are a data quality evaluator. You assess the confidence level of filled data based on multiple factors:

CONFIDENCE SCALE (0-5):
0 = No Result - No data found for this column
1 = Very Low - Poor quality sources with questionable reliability  
2 = Low - Limited sources with moderate quality but lacking diversity
3 = Moderate - Good quality sources with reasonable diversity and authority
4 = High - Excellent sources with high authority and good diversity
5 = Very High - Premium sources with exceptional authority and excellent diversity

EVALUATION FACTORS:
1. Domain Authority (DA): Higher DA scores (70+) indicate more trustworthy sources
2. Source Diversity: Multiple different domains/TLDs provide better validation
3. Source Tier: Premium/high tier sources are more reliable than low tier
4. Relevance: How well the sources relate to the specific data being filled
5. Commonality: Multiple sources agreeing increases confidence

SEARCH QUERY RECOMMENDATIONS:
- If confidence ≤ 2, provide a more specific search query recommendation
- Focus on finding more authoritative sources or different search angles
- Consider alternative keywords or more specific terms`,

    prompt: `Evaluate the confidence of filled data for each column.

Original Row: ${JSON.stringify(originalRow)}

Results and Sources:
${Object.entries(combinedResults).map(([column, data]) => `
Column: ${column}
Filled Value: ${data.result}
Sources (${data.sourceWebsites.length}):
${data.sourceWebsites.map(source => `  - ${source.url} (DA: ${source.da}, Tier: ${source.tier})`).join('\n')}
`).join('\n')}

Metrics:
${Object.entries(metrics).map(([column, metric]) => `
${column}:
  - Average DA: ${metric.averageDomainAuthority.toFixed(1)}
  - Diversity Score: ${metric.diversityScore.toFixed(1)}
  - Total Sources: ${metric.totalSources}
  - Has High Authority: ${metric.hasHighAuthoritySource}
  - Has Premium Source: ${metric.hasPremiumSource}
  - Tier Distribution: ${JSON.stringify(metric.tierDistribution)}
`).join('\n')}

For each column, provide:
1. Confidence score (0-5) based on the evaluation factors
2. Clear reasoning for the score
3. Search query recommendation if confidence ≤ 2`,
  });

  return result.object;
}

/**
 * Determines if results need optimization based on confidence scores
 */
export function needsOptimization(evaluation: EvaluationResult): {
  needsOptimization: boolean;
  lowConfidenceColumns: string[];
  recommendations: Record<string, string>;
} {
  const lowConfidenceColumns: string[] = [];
  const recommendations: Record<string, string> = {};

  Object.entries(evaluation).forEach(([column, result]) => {
    if (result.confidence.score <= 2) {
      lowConfidenceColumns.push(column);
      if (result.searchQueryRecommendation) {
        recommendations[column] = result.searchQueryRecommendation;
      }
    }
  });

  return {
    needsOptimization: lowConfidenceColumns.length > 0,
    lowConfidenceColumns,
    recommendations,
  };
}