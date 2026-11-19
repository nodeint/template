import { posix } from 'node:path';

const TEST_FILE = /^(?<base>.+?)(?:\.integration)?\.test\.[cm]?[jt]sx?$/;
const PACKAGE_TEST_DIR = /^packages\/[^/]+\/test\//;
const PACKAGE_SRC = /^packages\/[^/]+\/src\//;
const SCRIPTS = /^scripts\//;

/**
 * Lists layout violations for a set of repository files.
 *
 * @param {readonly string[]} files Repo-relative POSIX paths.
 * @returns {string[]} One message per violation.
 */
export function findLayoutViolations(files) {
  const known = new Set(files);
  /** @type {string[]} */
  const violations = [];

  for (const file of files) {
    const match = TEST_FILE.exec(posix.basename(file));
    if (!match?.groups) continue;
    const { base } = match.groups;

    if (PACKAGE_TEST_DIR.test(file)) {
      violations.push(`${file}: move the test next to its source file in src/`);
      continue;
    }

    const inPackageSrc = PACKAGE_SRC.test(file);
    if (!inPackageSrc && !SCRIPTS.test(file)) continue;

    const dir = posix.dirname(file);
    const candidates = inPackageSrc
      ? [`${base}.ts`, `${base}.tsx`]
      : [`${base}.mjs`];
    if (!candidates.some((name) => known.has(posix.join(dir, name)))) {
      violations.push(`${file}: orphan test, no sibling ${candidates.join(' or ')}`);
    }
  }

  return violations;
}
