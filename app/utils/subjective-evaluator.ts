import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { CombinedResult } from "./result-combiner";

export interface ResultGroupEvaluation {
  confidence: number;
  search_query?: string;
  reasoning: string;
}

export interface EvaluationResult {
  [column: string]: ResultGroupEvaluation[];
}

const resultGroupEvaluationSchema = z.object({
  confidence: z.number().describe("Confidence score from 0-5"),
  reasoning: z
    .string()
    .describe("Detailed reasoning for this confidence score"),
  search_query: z
    .string()
    .optional()
    .describe("Search query recommendation if confidence is low (≤2)"),
});

const evaluationResultSchema = z.record(
  z.string().describe("The name of the column"),
  z.array(resultGroupEvaluationSchema),
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
  5: "Very High - Premium sources with exceptional authority and excellent diversity",
} as const;

/**
 * Performs subjective evaluation using LLM to assess confidence based on
 * domain authority, diversity, commonality, and relevance
 *
 * Example output:
 * {
 *   "email": [
 *     {
 *       "confidence": 4,
 *       "reasoning": "High confidence - found official company website with contact info",
 *       "search_query": undefined
 *     }
 *   ],
 *   "phone": [
 *     {
 *       "confidence": 2,
 *       "reasoning": "Low confidence - only social media sources found",
 *       "search_query": "site:company.com contact phone number"
 *     }
 *   ]
 * }
 */
export async function evaluateResultsSubjectively(
  combinedResults: CombinedResult,
  originalRow: Record<string, string>,
  originalSearchQueries: string[],
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
4. Source Relevance: How well the source website type matches the data being sought
5. Commonality: Multiple sources agreeing increases confidence

SOURCE RELEVANCE GUIDELINES:
Evaluate how well each source type matches the data being filled:
- Professional data (job titles, companies, work history): LinkedIn, corporate websites, professional directories are highly relevant
- Contact information (emails, phones): Official company websites, professional directories, verified profiles are most relevant
- Personal information (names, locations): Social media, public records, news articles, official profiles are relevant
- Company data (addresses, descriptions): Official company websites, business directories, SEC filings are highly relevant
- Financial data: Financial websites, SEC filings, official company reports are most relevant
- Academic information: University websites, academic publications, research databases are most relevant
- News/events: News websites, press releases, official announcements are most relevant

Consider source relevance as a critical factor - even high-authority sources get lower confidence if they're not relevant to the data type.

SEARCH QUERY RECOMMENDATIONS:
- If confidence ≤ 2, provide a more specific search query recommendation
- Focus on finding more authoritative AND relevant sources for the specific data type
- Consider domain-specific search terms or site-specific searches (e.g., "site:linkedin.com" for professional info)`,

    prompt: `Evaluate the confidence of filled data for each column.

Original Row: ${JSON.stringify(originalRow)}

Original Search Queries Used:
${originalSearchQueries.map((query, index) => `${index + 1}. "${query}"`).join("\n")}

Results and Sources:
${Object.entries(combinedResults)
  .map(([column, resultGroups]) => {
    if (resultGroups.length === 0) {
      return `
Column: ${column}
Result Groups: 0
No results found`;
    }
    return `
Column: ${column}
Result Groups: ${resultGroups.length}
${resultGroups
  .map(
    (group, index) => `
  Group ${index + 1}:
    Filled Value: ${group.result}
    Sources (${group.sourceWebsites.length}):
${group.sourceWebsites.map((source) => `      - ${source.url} (DA: ${source.da}, Tier: ${source.tier})`).join("\n")}`,
  )
  .join("\n")}
`;
  })
  .join("\n")}

For each column, evaluate ALL result groups and provide an array of evaluations:
1. Confidence score (0-5) for each result group based on the evaluation factors
2. Clear reasoning for each score considering source relevance and quality
3. Search query recommendation if confidence ≤ 2 for any result group
4. Return the evaluations in the same order as the result groups (Group 1, Group 2, etc.)

IMPORTANT: When providing search query recommendations, DO NOT repeat or suggest variations of the original search queries that were already used. Instead, suggest completely different search approaches, keywords, that could find more relevant and authoritative sources.

Example output format:
{
  "email": [
    {
      "confidence": 4,
      "reasoning": "High confidence - found official company website with contact info",
      "search_query": undefined
    }
  ],
  "phone": [
    {
      "confidence": 2,
      "reasoning": "Low confidence - only social media sources found",
      "search_query": "company.com contact phone number"
    }
  ]
}`,
  });

  return result.object;
}

/**
 * Determines if results need optimization based on confidence scores and returns the most confident result for each column
 */
export function needsOptimization(
  evaluation: EvaluationResult,
  combinedResults: CombinedResult,
): {
  needsOptimization: boolean;
  lowConfidenceColumns: string[];
  recommendations: Record<string, string[]>;
  bestResults: Record<string, string>;
} {
  const lowConfidenceColumns: string[] = [];
  const recommendations: Record<string, string[]> = {};
  const bestResults: Record<string, string> = {};

  Object.entries(evaluation).forEach(([column, resultGroups]) => {
    // Find the result group with the highest confidence score
    let bestConfidenceScore = -1;
    let bestResultIndex = 0;

    resultGroups.forEach((group, index) => {
      if (group.confidence > bestConfidenceScore) {
        bestConfidenceScore = group.confidence;
        bestResultIndex = index;
      }
    });

    // Get the most confident result from combinedResults
    const columnResults = combinedResults[column];
    if (columnResults && columnResults[bestResultIndex]) {
      bestResults[column] = columnResults[bestResultIndex].result;
    } else {
      bestResults[column] = "";
    }

    // Check if ALL result groups have low confidence (≤2) - only then trigger optimization
    const allHaveLowConfidence = resultGroups.every(
      (group) => group.confidence <= 2,
    );

    if (allHaveLowConfidence && resultGroups.length > 0) {
      lowConfidenceColumns.push(column);

      // Collect all recommendations for this column
      const columnRecommendations = resultGroups
        .filter((group) => group.search_query)
        .map((group) => group.search_query!);

      if (columnRecommendations.length > 0) {
        recommendations[column] = columnRecommendations;
      }
    }
  });

  return {
    needsOptimization: lowConfidenceColumns.length > 0,
    lowConfidenceColumns,
    recommendations,
    bestResults,
  };
}
