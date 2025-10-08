import { generateObject } from "ai";
import { z } from "zod";
import { google } from "@ai-sdk/google";

// Helper function to create schema dynamically based on columns (same as result-extracter.ts)
const createDynamicSchema = (columns: string[]) => {
  const columnSchemas: Record<string, z.ZodOptional<z.ZodObject<any>>> = {};

  for (const column of columns) {
    columnSchemas[column] = z.object({
      result: z.string().describe("The extracted value for this column"),
      source: z.string().describe("The source URL where this information was found"),
    }).optional();
  }

  return z.object(columnSchemas);
};

// Test data
const missingColumns = ["Industry", "Founded Year", "Headquarters"];

const testText = `
OpenAI is an American artificial intelligence research organization founded in December 2015.
The company is headquartered in San Francisco, California.
OpenAI develops artificial intelligence technologies and operates in the AI research industry.
Source: https://en.wikipedia.org/wiki/OpenAI
`;

async function testGeminiStructuredOutput() {
  console.log("Testing Gemini dynamic schema structured output...\n");
  console.log("Missing columns to extract:", missingColumns.join(", "));
  console.log("\nInput text:", testText);

  const dynamicSchema = createDynamicSchema(missingColumns);
  console.log("\nDynamic schema created with properties:", Object.keys(dynamicSchema.shape));

  try {
    const result = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: dynamicSchema,
      system: "You are a CSV data extraction specialist. Extract specific information for the requested columns from the provided text.",
      prompt: `Extract the following information from the text:
${missingColumns.map(col => `- ${col}`).join('\n')}

Text:
${testText}

For each column you can fill, provide the extracted result and the source URL.`,
    });

    console.log("\n✅ Success!");
    console.log("Extracted data:", JSON.stringify(result.object, null, 2));
    console.log("\nUsage:", result.usage);

    // Show which columns were extracted
    const extractedColumns = Object.keys(result.object).filter(key => result.object[key] !== undefined);
    console.log(`\nExtracted ${extractedColumns.length}/${missingColumns.length} columns:`, extractedColumns);
  } catch (error) {
    console.error("\n❌ Error:", error);
    throw error;
  }
}

testGeminiStructuredOutput();
