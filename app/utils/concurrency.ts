export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const safeConcurrency = Math.max(1, Math.floor(concurrency || 1));
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  console.log('[concurrency] start', {
    total: items.length,
    concurrency: safeConcurrency,
  });

  async function worker(workerId: number) {
    while (true) {
      const currentIndex = nextIndex;
      if (currentIndex >= items.length) break;
      nextIndex++;

      try {
        console.log('[concurrency] worker picking', { workerId, index: currentIndex });
        const value = await mapper(items[currentIndex], currentIndex);
        results[currentIndex] = value;
        console.log('[concurrency] worker done', { workerId, index: currentIndex });
      } catch (error) {
        console.error('[concurrency] worker error', {
          workerId,
          index: currentIndex,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    }
  }

  const workers = Array.from({ length: Math.min(safeConcurrency, items.length) }, (_, i) =>
    worker(i)
  );
  await Promise.all(workers);

  console.log('[concurrency] complete', { total: items.length });
  return results;
}


