import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const EnrichmentColumnSchema = z.object({
  name: z.string(),
  type: z.enum(["String", "Number", "Boolean"]),
});

const GenerateColumnsSchema = z.object({
  columns: z.array(EnrichmentColumnSchema),
});

export async function generateEnrichmentColumns(prompt: string) {
  const { object: result } = await generateObject({
    model: openai("gpt-4o"),
    schema: GenerateColumnsSchema,
    prompt: `Based on the following user request for CSV enrichment, generate a list of column names with their types.

User request: "${prompt}"

Generate appropriate column names and their types (String, Number, or Boolean) that would be needed to fulfill this enrichment request.
For example:
- If they want LinkedIn URLs, generate { name: "LinkedIn URL", type: "String" }
- If they want employee count, generate { name: "Employee Count", type: "Number" }
- If they want to check if B2B, generate { name: "Is B2B", type: "Boolean" }

Generate 1-5 relevant columns based on the request.`,
  });

  return result.columns;
}