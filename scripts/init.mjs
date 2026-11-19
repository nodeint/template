/**
 * Rename the template after "Use this template".
 *
 * Usage: node scripts/init.mjs <repo-name> [--scope @nodeint]
 * Rewrites `template`/`@nodeint/example` references in tracked text files and package manifests.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

import { REPO_ROOT } from './lib/repo.mjs';

const [name, ...rest] = process.argv.slice(2);
if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error('usage: node scripts/init.mjs <repo-name> [--scope @scope]');
  process.exit(2);
}
const scopeIndex = rest.indexOf('--scope');
const scope = scopeIndex === -1 ? '@nodeint' : rest[scopeIndex + 1];

const files = execFileSync('git', ['ls-files'], { cwd: REPO_ROOT, encoding: 'utf8' })
  .split('\n')
  .filter((file) => /\.(json|md|ya?ml|mjs|ts)$/.test(file) && file !== 'pnpm-lock.yaml' && file !== 'scripts/init.mjs');

for (const file of files) {
  const before = readFileSync(`${REPO_ROOT}/${file}`, 'utf8');
  const after = before
    .replaceAll('nodeint/template', `nodeint/${name}`)
    .replaceAll('"name": "template"', `"name": "${name}"`)
    .replaceAll('@nodeint/<name>', `${scope}/<name>`)
    .replaceAll('@nodeint/example', `${scope}/example`);
  if (after !== before) writeFileSync(`${REPO_ROOT}/${file}`, after);
}
console.log(`Initialized as ${name} (${scope}). Run: pnpm install && pnpm setup:git`);
