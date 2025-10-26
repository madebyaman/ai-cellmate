import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const EnrichmentColumnSchema = z.object({
  name: z.string().describe("The name of the enrichment column"),
  type: z.enum(["String", "Number", "Boolean"]).describe("The data type of the column"),
  description: z.string().describe("A clear description of what data this column should contain and how to find it"),
});

const GenerateColumnsSchema = z.object({
  columns: z.array(EnrichmentColumnSchema),
});

export async function generateEnrichmentColumns(prompt: string) {
  const { object: result } = await generateObject({
    model: openai("gpt-4o"),
    schema: GenerateColumnsSchema,
    prompt: `Based on the following user request for CSV enrichment, generate a list of column names with their types and descriptions.

User request: "${prompt}"

Generate appropriate column names, their types (String, Number, or Boolean), and clear descriptions that would be needed to fulfill this enrichment request.

For each column, provide:
- name: A clear, concise column name
- type: The appropriate data type (String, Number, or Boolean)
- description: A clear description of what data should be in this column

Examples:
- If they want LinkedIn URLs: { name: "LinkedIn URL", type: "String", description: "The company's official LinkedIn profile URL." }
- If they want employee count: { name: "Employee Count", type: "Number", description: "The total number of employees at the company." }
- If they want to check if B2B: { name: "Is B2B", type: "Boolean", description: "Whether the company primarily serves other businesses (B2B) rather than consumers (B2C)." }

Generate 1-5 relevant columns based on the request.`,
  });

  return result.columns;
}