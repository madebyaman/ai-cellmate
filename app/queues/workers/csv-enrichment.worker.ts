import { Worker } from 'bullmq';
import { redisConnection } from '../config';
import type { CsvEnrichmentJobData, CsvEnrichmentJobDataUnion, CsvEnrichmentJobResult } from '../types';
import { readFile } from 'fs/promises';

export function createCsvEnrichmentWorker(): Worker<CsvEnrichmentJobDataUnion, CsvEnrichmentJobResult, string> {
  return new Worker<CsvEnrichmentJobDataUnion, CsvEnrichmentJobResult, string>(
    'csv-enrichment',
    async (job) => {
      console.log(`Processing CSV enrichment job: ${job.name}:${job.id}`);

      switch (job.name) {
        case 'enrich-csv':
          return await processCsvEnrichment(job.data as CsvEnrichmentJobData);
        default:
          throw new Error(`Unknown CSV enrichment job type: ${job.name}`);
      }
    },
    { connection: redisConnection }
  );
}

async function processCsvEnrichment(data: CsvEnrichmentJobData): Promise<CsvEnrichmentJobResult> {
  const { csvUrl, csvContent, enrichmentPrompt = 'Enhance the data in this CSV', userId } = data;

  console.log(`Starting CSV enrichment`);
  console.log(`Enrichment prompt: ${enrichmentPrompt}`);

  try {
    // Step 1: Get the CSV data
    let csvData: string;
    if (csvContent) {
      // Use provided content directly
      csvData = csvContent;
      console.log(`Using provided CSV content (${csvContent.length} characters)`);
    } else if (csvUrl?.startsWith('file://')) {
      // Handle local file URLs
      const filePath = csvUrl.replace('file://', '');
      csvData = await readFile(filePath, 'utf-8');
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
      throw new Error('Either csvUrl or csvContent must be provided');
    }

    // Step 2: Process with LLM (placeholder for now)
    // In a real implementation, you would:
    // - Parse the CSV
    // - Send chunks to your LLM provider (OpenAI, Anthropic, etc.)
    // - Process the enhanced data
    // - Save to storage or return enhanced CSV
    
    console.log(`CSV data length: ${csvData.length} characters`);
    console.log('LLM enrichment processing...');
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    const result: CsvEnrichmentJobResult = {
      success: true,
      originalCsvUrl: csvUrl || 'direct-content',
      enrichedDataPreview: csvData.substring(0, 200) + '... [ENHANCED]',
      rowsProcessed: csvData.split('\n').length - 1,
      userId,
      processedAt: new Date().toISOString()
    };

    console.log(`CSV enrichment completed for user: ${userId}`);
    return result;

  } catch (error) {
    console.error('CSV enrichment failed:', error);
    throw new Error(`CSV enrichment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}