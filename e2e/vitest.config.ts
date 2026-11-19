import { defineConfig } from 'vitest/config';

/** Per-test timeout, in milliseconds. Windows runners start processes and touch files more slowly. */
const TEST_TIMEOUT_MS = 10_000;
const WINDOWS_TEST_TIMEOUT_MS = 30_000;

export default defineConfig({
  test: {
    name: 'e2e',
    include: ['src/**/*.specs.ts'],
    testTimeout: process.platform === 'win32' ? WINDOWS_TEST_TIMEOUT_MS : TEST_TIMEOUT_MS,
    reporters: ['agent'],
    silent: true,
  },
});
