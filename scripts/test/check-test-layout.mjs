/**
 * Verifies that each test file sits next to the code it tests.
 *
 * - Package tests live in `packages/<name>/src/` beside their source file.
 * - `<name>.test.ts(x)` and `<name>.integration.test.ts(x)` need a sibling `<name>.ts` or `<name>.tsx`.
 * - `scripts/**` tests (`.mjs`) need a sibling `<name>.mjs`.
 * - `e2e/` holds `*.specs.ts` suites, which are not unit tests, and is exempt.
 *
 * Usage:
 *   node scripts/test/check-test-layout.mjs
 */
import { readdirSync } from 'node:fs';
import { relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { REPO_ROOT } from '../lib/repo.mjs';
import { findLayoutViolations } from './find-layout-violations.mjs';

const SKIPPED_DIRS = new Set(['node_modules', 'dist', 'coverage', '.git']);

/** @param {string} dir Absolute directory. @returns {string[]} Repo-relative POSIX file paths. */
function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIPPED_DIRS.has(entry.name)) return [];
    const path = `${dir}${sep}${entry.name}`;
    return entry.isDirectory()
      ? listFiles(path)
      : [relative(REPO_ROOT, path).split(sep).join('/')];
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const violations = findLayoutViolations(
    ['packages', 'scripts'].flatMap((dir) => listFiles(`${REPO_ROOT}${sep}${dir}`)),
  );
  for (const violation of violations) console.error(violation);
  process.exit(violations.length > 0 ? 1 : 0);
}
