import { defineConfig } from 'vitest/config';

/** Per-test timeout, in milliseconds. Windows runners start processes and touch files more slowly. */
const TEST_TIMEOUT_MS = 10_000;
const WINDOWS_TEST_TIMEOUT_MS = 30_000;

export default defineConfig({
  test: {
    testTimeout: process.platform === 'win32' ? WINDOWS_TEST_TIMEOUT_MS : TEST_TIMEOUT_MS,
    // Print failures only: no per-test dots, no passing output.
    reporters: ['agent'],
    silent: true,
    setupFiles: ['scripts/test/vitest-quiet-setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/*.d.ts', '**/dist/**'],
      reporter: ['text-summary', 'json-summary'],
      reportsDirectory: 'coverage',
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['packages/**/*.test.{ts,tsx}'],
          exclude: ['**/node_modules/**', '**/*.integration.test.{ts,tsx}'],
        },
      },
      {
        extends: true,
        test: {
          name: 'scripts',
          include: ['scripts/**/*.test.mjs'],
          exclude: ['**/node_modules/**'],
          // Includes `*.integration.test.mjs`, which run real `git` processes.
          fileParallelism: false,
        },
      },
      {
        // Real child processes and sockets: run apart from the parallel unit pool.
        extends: true,
        test: {
          name: 'integration',
          include: ['packages/**/*.integration.test.{ts,tsx}'],
          fileParallelism: false,
        },
      },
      // Built packages consumed as a user would; configured in e2e/vitest.config.ts, needs `pnpm build` first.
      'e2e',
    ],
  },
});
