# CSV Enrichment Worker Flow Documentation

This document provides a detailed line-by-line explanation of how the CSV enrichment worker processes jobs in the AI Cellmate application.

## Overview

The CSV enrichment worker (`app/queues/workers/csv-enrichment.worker.ts`) is responsible for processing uploaded CSV files and enriching them with additional data found through AI-powered web searches and content scraping.

## Architecture Components

### Dependencies and Setup (Lines 1-33)

```typescript
import { Worker } from "bullmq";
import { redisConnection } from "../config";
import type { CsvEnrichmentJobData, CsvEnrichmentJobDataUnion, CsvEnrichmentJobResult } from "../types";
import { readFile } from "fs/promises";
import { Langfuse } from "langfuse";
import { fillRow } from "~/utils/fill-row";
import { combineResults, calculateResultMetrics } from "~/utils/result-combiner";
import { evaluateResultsSubjectively, needsOptimization } from "~/utils/subjective-evaluator";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseExporter } from "langfuse-vercel";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
```

**What happens**: The worker imports all necessary dependencies for:
- **BullMQ**: Queue management and job processing
- **Redis**: Connection management for the queue
- **Type definitions**: TypeScript types for job data structures
- **File system**: Reading CSV files from disk
- **Telemetry**: Langfuse for LLM observability and OpenTelemetry for distributed tracing
- **Core utilities**: Row enrichment, result combination, and evaluation logic

```typescript
const langfuse = new Langfuse({
  environment: process.env.NODE_ENV ?? "development",
  secretKey: process.env.LANGFUSE_SECRET_KEY ?? "",
  publicKey: process.env.LANGFUSE_PUBLIC_KEY ?? "",
  baseUrl: process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com",
});

const sdk = new NodeSDK({
  traceExporter: new LangfuseExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});
```

**What happens**: Initializes monitoring and observability tools:
- **Langfuse client**: Tracks LLM calls, costs, and performance metrics
- **OpenTelemetry SDK**: Provides distributed tracing for debugging and monitoring

## Worker Creation (Lines 35-54)

```typescript
export function createCsvEnrichmentWorker(): Worker<CsvEnrichmentJobDataUnion, CsvEnrichmentJobResult, string> {
  return new Worker<CsvEnrichmentJobDataUnion, CsvEnrichmentJobResult, string>(
    "csv-enrichment",
    async (job) => {
      console.log(`Processing CSV enrichment job: ${job.name}:${job.id}`);

      switch (job.name) {
        case "enrich-csv":
          return await processCsvEnrichment(job.data as CsvEnrichmentJobData);
        default:
          throw new Error(`Unknown CSV enrichment job type: ${job.name}`);
      }
    },
    { connection: redisConnection },
  );
}
```

**What happens when a job is received**:
1. **Job Reception**: BullMQ delivers a job from the "csv-enrichment" queue
2. **Logging**: Logs the job name and unique ID for tracking
3. **Job Type Routing**: Checks the job name (currently only "enrich-csv" is supported)
4. **Processing Dispatch**: Calls `processCsvEnrichment()` with the job data
5. **Error Handling**: Throws an error for unknown job types

## Main Processing Function (Lines 56-244)

### Initialization and Data Retrieval (Lines 56-92)

```typescript
async function processCsvEnrichment(data: CsvEnrichmentJobData): Promise<CsvEnrichmentJobResult> {
  sdk.start();
  const { csvUrl, csvContent, enrichmentPrompt = "Enhance the data in this CSV", userId } = data;
```

**What happens**:
1. **Telemetry Start**: Begins OpenTelemetry tracing for the entire job
2. **Data Extraction**: Destructures job data to get:
   - `csvUrl`: URL or file path to the CSV
   - `csvContent`: Raw CSV content (if provided directly)
   - `enrichmentPrompt`: User's instructions for enrichment (defaults to generic prompt)
   - `userId`: User identifier for session tracking

### CSV Data Loading (Lines 68-92)

```typescript
let csvData: string;
if (csvContent) {
  // Use provided content directly
  csvData = csvContent;
  console.log(`Using provided CSV content (${csvContent.length} characters)`);
} else if (csvUrl?.startsWith("file://")) {
  // Handle local file URLs
  const filePath = csvUrl.replace("file://", "");
  csvData = await readFile(filePath, "utf-8");
  console.log(`Reading CSV from file: ${filePath}`);
} else if (csvUrl) {
  // Handle HTTP/HTTPS URLs
  const csvResponse = await fetch(csvUrl);
  if (!csvResponse.ok) {
    throw new Error(`Failed to fetch CSV: ${csvResponse.statusText}`);
  }
  csvData = await csvResponse.text();
  console.log(`Fetched CSV from URL: ${csvUrl}`);
} else {
  throw new Error("Either csvUrl or csvContent must be provided");
}
```

**What happens**: Three-tier CSV loading strategy:
1. **Direct Content**: If `csvContent` is provided, use it immediately
2. **Local Files**: If URL starts with "file://", read from filesystem using Node.js `fs.readFile`
3. **Remote URLs**: If HTTP/HTTPS URL, fetch using standard `fetch()` API
4. **Validation**: Ensures at least one data source is provided

### CSV Parsing (Lines 93-96)

```typescript
const { headers, rows } = parseCsvToRowObjects(csvData);
const enrichedRows: Array<Record<string, string>> = [];
```

**What happens**:
1. **Parsing**: Calls `parseCsvToRowObjects()` to convert raw CSV text into structured data
2. **Structure Creation**: Returns `headers` (column names) and `rows` (array of objects with header:value pairs)
3. **Result Initialization**: Creates empty array to store enriched row results

## Row-by-Row Processing Loop (Lines 98-224)

### Per-Row Initialization (Lines 98-118)

```typescript
for (let i = 0; i < rows.length; i++) {
  const row = rows[i];

  const rowTrace = langfuse.trace({
    sessionId: userId,
    name: `enrich-row-${i + 1}`,
    input: { row, headers },
    metadata: {
      rowIndex: i + 1,
      totalRows: rows.length,
    },
  });
```

**What happens for each row**:
1. **Row Selection**: Gets the current row object (e.g., `{name: "John", company: "", email: ""}`)
2. **Telemetry Setup**: Creates a Langfuse trace for this specific row to track:
   - User session for cost attribution
   - Row number and total count for progress tracking
   - Input data for debugging failed enrichments

### Multi-Attempt Processing Strategy (Lines 111-209)

```typescript
let searchQueryRecommendations: string[] = [];
let attempt = 0;
const maxAttempts = 2; // Original attempt + 1 optimization attempt
let currentRow = { ...row }; // Track the current state of the row

while (attempt < maxAttempts) {
  attempt++;
  console.log(`Attempt ${attempt} for row ${i + 1}`);
```

**What happens**: Implements a two-attempt strategy:
1. **State Tracking**: Maintains `currentRow` with accumulated data from previous attempts
2. **Query Learning**: `searchQueryRecommendations` accumulates better search terms over attempts
3. **Progress Logging**: Tracks attempt numbers for debugging

### Step 1: Row Data Enrichment (Lines 123-141)

```typescript
const { result: enrichedData, searchQueries } = await fillRow({
  headers,
  row: currentRow, // Pass the updated row with previously found data
  searchQueryRecommendations, // Pass full array instead of single string
  telemetry: {
    isEnabled: true,
    functionId: "fill-row",
    metadata: {
      langfuseTraceId: rowTrace.id,
      attempt,
    },
  },
});
```

**What happens**: Calls the core `fillRow` utility which:
1. **AI Analysis**: Uses LLM to analyze the row and determine what data is missing
2. **Search Strategy**: Generates web search queries based on existing data and recommendations
3. **Web Search**: Uses Serper API to search for relevant information (10 results per query)
4. **Content Scraping**: Scrapes 4-6 most relevant URLs using ScrapingBee
5. **Data Extraction**: Uses AI to extract relevant data from scraped content
6. **Returns**: Enriched data array and the search queries used

### Step 2: Result Combination (Lines 142-143)

```typescript
const combinedResults = combineResults(enrichedData);
```

**What happens**: Processes multiple search results to find the best data:
1. **Deduplication**: Removes duplicate information across different sources
2. **Domain Authority**: Scores sources based on domain credibility
3. **Confidence Scoring**: Assigns confidence levels to each piece of data
4. **Best Result Selection**: Picks the highest-confidence data for each field

### Step 3: Quality Evaluation (Lines 148-154)

```typescript
const evaluation = await evaluateResultsSubjectively(
  combinedResults,
  row,
  searchQueries,
);
```

**What happens**: Uses LLM to subjectively evaluate the results:
1. **Quality Assessment**: AI judges the relevance and accuracy of found data
2. **Confidence Scoring**: Assigns confidence scores (0-100) for each field
3. **Gap Identification**: Identifies fields that still need better data
4. **Search Improvement**: Suggests better search queries for missing data

### Step 4: Optimization Decision (Lines 156-209)

```typescript
const optimization = needsOptimization(evaluation, combinedResults);

if (!optimization.needsOptimization || attempt === maxAttempts) {
  // Use the best results
  const finalRow = { ...currentRow, ...optimization.bestResults };
  enrichedRows.push(finalRow);
  // ... logging and completion
  break;
} else {
  // Optimization needed - use search query recommendations
  searchQueryRecommendations = Object.values(optimization.recommendations).flat();
  currentRow = { ...currentRow, ...optimization.bestResults };
  // ... continue to next attempt
}
```

**What happens**: Decides whether to try again or accept current results:

**If optimization is NOT needed OR max attempts reached**:
1. **Final Assembly**: Combines original row data with best found results
2. **Result Storage**: Adds completed row to `enrichedRows` array
3. **Telemetry Update**: Records final results, evaluation, and attempt count
4. **Logging**: Outputs confidence scores for each column
5. **Loop Exit**: Breaks out of attempt loop to process next row

**If optimization IS needed AND attempts remain**:
1. **Query Enhancement**: Extracts recommended search queries from evaluation
2. **State Update**: Merges best results found so far into `currentRow`
3. **Logging**: Outputs which columns need better data and new search queries
4. **Loop Continue**: Attempts another enrichment cycle with improved queries

### Error Handling (Lines 210-223)

```typescript
} catch (error) {
  console.error(`Error processing row ${i + 1}:`, error);
  rowTrace.span({
    level: "ERROR",
    statusMessage: error instanceof Error ? error.message : "Unknown error",
    metadata: { langfuseTraceId: rowTrace.id },
  });
  // Add the original row on error
  enrichedRows.push(row);
}
```

**What happens on errors**:
1. **Error Logging**: Logs the specific row number and error details
2. **Telemetry Recording**: Creates error span in Langfuse for debugging
3. **Graceful Degradation**: Adds the original, unenriched row to results
4. **Processing Continuation**: Continues with the next row instead of failing entirely

## Job Completion (Lines 225-243)

```typescript
await sdk.shutdown();

console.log(`CSV enrichment completed for user: ${userId}. Processed ${enrichedRows.length} rows.`);
return {
  success: true,
  userId,
  processedAt: new Date().toISOString(),
};
```

**What happens when all rows are processed**:
1. **Telemetry Cleanup**: Shuts down OpenTelemetry SDK to flush remaining traces
2. **Success Logging**: Reports completion with row count
3. **Result Return**: Returns success status with metadata for the job requester

### Global Error Handling (Lines 238-243)

```typescript
} catch (error) {
  console.error("CSV enrichment failed:", error);
  throw new Error(`CSV enrichment failed: ${error instanceof Error ? error.message : "Unknown error"}`);
}
```

**What happens on job-level failures**:
1. **Error Logging**: Logs the top-level error
2. **Error Re-throwing**: Converts to a standardized error format
3. **Job Failure**: BullMQ marks the job as failed, potentially triggering retries

## CSV Parsing Utilities (Lines 246-290)

### Main Parser Function (Lines 247-276)

```typescript
function parseCsvToRowObjects(csvText: string): {
  headers: string[];
  rows: Array<Record<string, string>>;
} {
  const normalized = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rawLines = normalized.split("\n");
  const lines = rawLines.map((l) => l.trim()).filter((l) => l.length > 0 && l !== "-");

  if (lines.length === 0) return { headers: [], rows: [] };

  const delimiter = detectDelimiter(lines[0]);
  const headers = lines[0].split(delimiter).map((h) => h.trim()).filter((h) => h.length > 0);

  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(delimiter).map((p) => p.trim());
    const row: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      row[headers[c]] = parts[c] ?? "";
    }
    rows.push(row);
  }

  return { headers, rows };
}
```

**What happens during CSV parsing**:
1. **Line Normalization**: Converts all line endings to consistent `\n` format
2. **Cleanup**: Removes empty lines and lines containing only "-"
3. **Delimiter Detection**: Automatically detects whether CSV uses commas, pipes, tabs, or semicolons
4. **Header Extraction**: Gets column names from first row
5. **Row Conversion**: Converts each data row into an object with header:value pairs
6. **Missing Data Handling**: Uses empty strings for missing column values

### Delimiter Detection (Lines 278-290)

```typescript
function detectDelimiter(headerLine: string): string {
  const candidates = [",", "|", "\t", ";"];
  let best = ",";
  let bestCount = -1;
  for (const d of candidates) {
    const count = (headerLine.match(new RegExp(`\\\\${d}`, "g")) || []).length;
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}
```

**What happens**: Automatically detects CSV delimiter by:
1. **Testing Candidates**: Tries common delimiters (comma, pipe, tab, semicolon)
2. **Counting Occurrences**: Counts how many times each delimiter appears in the header row
3. **Best Match Selection**: Chooses the delimiter that appears most frequently
4. **Default Fallback**: Uses comma as default if no clear winner

## Integration Points

### Queue System Integration
- **Job Reception**: BullMQ delivers jobs from the "csv-enrichment" queue
- **Redis Connection**: Uses shared Redis connection for job state management
- **Result Handling**: Returns structured results that BullMQ can serialize and store

### AI Services Integration
- **fillRow utility**: Orchestrates AI-powered data enrichment with web search and scraping
- **Evaluation utilities**: Uses LLMs for quality assessment and optimization decisions
- **Result combination**: Implements domain authority scoring and confidence analysis

### Monitoring Integration
- **Langfuse**: Tracks LLM costs, performance, and debugging information
- **OpenTelemetry**: Provides distributed tracing for debugging and monitoring
- **Console Logging**: Provides real-time progress updates during processing

This worker represents a sophisticated AI-powered data enrichment pipeline that combines web search, content scraping, LLM reasoning, and quality optimization to automatically enhance CSV data with high accuracy and reliability.