/*
  Chunking helpers for distributing LLM enrichment calls.
  We chunk by rows and optionally by target columns.
*/

export type Chunk<T> = T[];

export function chunkArray<T>(items: T[], chunkSize: number): Chunk<T>[] {
  const size = Math.max(1, Math.floor(chunkSize));
  const chunks: Chunk<T>[] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function mapWithConcurrency<I, O>(
  inputs: I[],
  mapper: (input: I, index: number) => Promise<O>,
  concurrency: number
): Promise<O[]> {
  const limit = Math.max(1, Math.floor(concurrency));
  const results: O[] = new Array(inputs.length) as any;
  let next = 0;

  async function worker() {
    while (true) {
      const current = next++;
      if (current >= inputs.length) break;
      try {
        results[current] = await mapper(inputs[current], current);
      } catch (error) {
        console.error('[chunking] mapper error', { index: current, error });
        throw error;
      }
    }
  }

  const workers = Array.from({ length: limit }, () => worker());
  await Promise.all(workers);
  return results;
}


