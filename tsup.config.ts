import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['worker.ts'],
  format: ['esm'],
  outDir: 'build/worker',
  target: 'node20',
  clean: true,
  external: [
    '@prisma-app/client', // Custom Prisma client path
  ],
  noExternal: [
    // Bundle everything else
  ],
});
