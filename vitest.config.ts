import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['server/**/__tests__/**/*.test.ts', 'client/**/__tests__/**/*.test.ts', 'client/**/__tests__/**/*.test.tsx'],
    environmentMatchGlobs: [
      ['client/**', 'jsdom'],
    ],
  },
});
