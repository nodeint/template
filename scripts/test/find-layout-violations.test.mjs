import { expect, test } from 'vitest';

import { findLayoutViolations } from './find-layout-violations.mjs';

test('accepts a package test beside its source file', () => {
  expect(findLayoutViolations(['packages/a/src/x.ts', 'packages/a/src/x.test.ts'])).toEqual([]);
});

test('accepts an integration test beside a tsx source file', () => {
  expect(
    findLayoutViolations(['packages/a/src/x.tsx', 'packages/a/src/x.integration.test.ts']),
  ).toEqual([]);
});

test('reports a package test without a sibling source file', () => {
  expect(findLayoutViolations(['packages/a/src/x.test.ts', 'packages/a/src/y.ts'])).toEqual([
    'packages/a/src/x.test.ts: orphan test, no sibling x.ts or x.tsx',
  ]);
});

test('reports a package test kept in a separate test directory', () => {
  expect(findLayoutViolations(['packages/a/src/x.ts', 'packages/a/test/x.test.ts'])).toEqual([
    'packages/a/test/x.test.ts: move the test next to its source file in src/',
  ]);
});

test('reports a script test without a sibling script', () => {
  expect(findLayoutViolations(['scripts/a.test.mjs', 'scripts/b.mjs'])).toEqual([
    'scripts/a.test.mjs: orphan test, no sibling a.mjs',
  ]);
});

test('ignores e2e specs', () => {
  expect(findLayoutViolations(['e2e/src/smoke.specs.ts'])).toEqual([]);
});
