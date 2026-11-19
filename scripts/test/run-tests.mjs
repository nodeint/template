/**
 * Test runner with scoped selection, shared by every vitest project.
 *
 * Wraps `vitest run --project <project>`:
 *   --file <suite>  Run only test files whose path contains <suite>; repeatable.
 *   --case <name>   Run only tests whose full name matches <name> (`vitest -t`); once.
 *   other args      Pass through to vitest unchanged.
 *
 * Usage:
 *   node scripts/test/run-tests.mjs <project> [--file <suite>] [--case <name>] [vitest args]
 *   node scripts/test/run-tests.mjs integration --file cancel --case "stops the run"
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { REPO_ROOT } from '../lib/repo.mjs';
import { buildVitestArgs } from './build-vitest-args.mjs';

function main() {
  const [project, ...argv] = process.argv.slice(2);
  /** @type {string[]} */
  let vitestArgs;
  try {
    vitestArgs = buildVitestArgs(project, argv);
  } catch (error) {
    console.error(`run-tests: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(2);
  }

  const require = createRequire(import.meta.url);
  const packageDir = dirname(require.resolve('vitest/package.json'));
  const { bin } = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
  const vitestBin = join(packageDir, typeof bin === 'string' ? bin : bin.vitest);

  const selected = vitestArgs.some((arg, index) => index >= 3 && !arg.startsWith('-'));
  const reportDir = selected ? mkdtempSync(join(tmpdir(), 'template-tests-')) : undefined;
  const reportFile = reportDir && join(reportDir, 'report.json');
  // A selection must run at least one test: vitest exits 0 when -t skips everything.
  const reporterArgs = reportFile
    ? ['--reporter=agent', '--reporter=json', `--outputFile.json=${reportFile}`]
    : [];

  try {
    const result = spawnSync(process.execPath, [vitestBin, ...vitestArgs, ...reporterArgs], {
      cwd: REPO_ROOT,
      stdio: 'inherit',
      env: process.env,
    });
    if (result.error) {
      console.error(result.error);
      process.exit(1);
    }
    const status = result.status === null ? 1 : result.status;
    if (status === 0 && reportFile && executedTests(reportFile) === 0) {
      console.error('run-tests: the selection ran no tests (all skipped or none matched)');
      process.exit(1);
    }
    process.exit(status);
  } finally {
    if (reportDir) rmSync(reportDir, { recursive: true, force: true });
  }
}

/**
 * Count the tests that actually ran, from a vitest JSON report.
 *
 * @param {string} reportFile
 * @returns {number}
 */
function executedTests(reportFile) {
  const report = JSON.parse(readFileSync(reportFile, 'utf8'));
  return report.numPassedTests + report.numFailedTests;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
