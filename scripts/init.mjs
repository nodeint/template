/**
 * Set up a repository created from the template, in one command.
 *
 * Usage: node scripts/init.mjs [<repo-name>] [--scope <scope>] [--yes] [--skip-install]
 *
 * Rewrites `template`/`@nodeint/example` references in tracked text files and package manifests,
 * then runs `pnpm install` and `pnpm setup:git`. In a terminal it prompts for missing values and
 * asks for confirmation; without a terminal it needs `<repo-name>` and `--yes`.
 * Uses Node built-ins only, because it runs before `pnpm install`.
 *
 * Exit codes: 0 done; 1 cancelled or a listing, read, write, or pnpm step failed; 2 usage error.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, writeSync } from 'node:fs';
import { createInterface } from 'node:readline';

import { REPO_ROOT } from './lib/repo.mjs';

const USAGE = 'usage: node scripts/init.mjs [<repo-name>] [--scope <scope>] [--yes] [--skip-install]';
const DEFAULT_SCOPE = '@nodeint';
const NAME_PATTERN = /^[a-z][a-z0-9-]*$/;
const SCOPE_PATTERN = /^@[a-z0-9][a-z0-9._-]*$/;
const PNPM_STEPS = [['install'], ['setup:git']];

/** Write synchronously so output stays ordered with child process output. */
const out = (text) => writeSync(1, `${text}\n`);
const err = (text) => writeSync(2, `${text}\n`);

class Cancelled extends Error {}

/** Tracks whether the readline interface closed (Ctrl+C or end of input) so later prompts cancel too. */
const closed = new WeakSet();

/** Returns a reason when the name is invalid, otherwise undefined. */
function nameProblem(name) {
  return NAME_PATTERN.test(name)
    ? undefined
    : `Invalid name "${name}": use lowercase letters, digits, and hyphens, starting with a letter.`;
}

/** Returns a reason when the scope is invalid, otherwise undefined. */
function scopeProblem(scope) {
  return SCOPE_PATTERN.test(scope)
    ? undefined
    : `Invalid scope "${scope}": use @ followed by lowercase letters, digits, "-", ".", or "_".`;
}

/** Parses arguments; returns `{ error }` on a usage error. */
function parseArgs(argv) {
  const options = { name: undefined, scope: undefined, yes: false, skipInstall: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--yes') options.yes = true;
    else if (arg === '--skip-install') options.skipInstall = true;
    else if (arg === '--scope' || arg.startsWith('--scope=')) {
      const value = arg === '--scope' ? argv[++i] : arg.slice('--scope='.length);
      if (value === undefined || value === '' || value.startsWith('--')) return { error: '--scope needs a value.' };
      const problem = scopeProblem(value);
      if (problem) return { error: problem };
      options.scope = value;
    } else if (arg.startsWith('-')) return { error: `Unknown flag: ${arg}` };
    else if (options.name === undefined) options.name = arg;
    else return { error: `Unexpected argument: ${arg}` };
  }
  const problem =
    (options.name !== undefined && nameProblem(options.name)) ||
    (options.scope !== undefined && scopeProblem(options.scope));
  return problem ? { error: problem } : { options };
}

/** Applies the template replacements to one file's content. */
function rewrite(content, name, scope) {
  return content
    .replaceAll('nodeint/template', `nodeint/${name}`)
    .replaceAll('"name": "template"', `"name": "${name}"`)
    .replaceAll('@nodeint/<name>', `${scope}/<name>`)
    .replaceAll('@nodeint/example', `${scope}/example`);
}

function usageError(message) {
  err(message);
  err(USAGE);
  process.exit(2);
}

/** Asks one question; rejects with `Cancelled` on Ctrl+C or end of input. */
function ask(rl, question) {
  return new Promise((resolve, reject) => {
    if (closed.has(rl)) return reject(new Cancelled());
    const onClose = () => reject(new Cancelled());
    rl.once('close', onClose);
    rl.question(question, (answer) => {
      rl.off('close', onClose);
      resolve(answer.trim());
    });
  });
}

/** Prompts until the answer passes `check`; an empty answer uses `fallback` when given. */
async function promptValue(rl, label, check, fallback) {
  for (;;) {
    const answer = (await ask(rl, fallback ? `${label} [${fallback}]: ` : `${label}: `)) || fallback || '';
    const problem = check(answer);
    if (!problem) return answer;
    err(problem);
  }
}

/** Lists tracked files the rewrite considers; exits 1 on failure. */
function listCandidates() {
  let listing;
  try {
    listing = execFileSync('git', ['ls-files'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const reason = String(error.stderr ?? '').trim() || error.message;
    err(`Cannot list repository files: ${reason}`);
    process.exit(1);
  }
  return listing
    .split(/\r?\n/)
    .filter((file) => /\.(json|md|ya?ml|mjs|ts)$/.test(file) && file !== 'pnpm-lock.yaml' && file !== 'scripts/init.mjs');
}

/** Reads every candidate and returns the changes to apply; exits 1 when a file cannot be read. */
function planChanges(files, name, scope) {
  const changes = [];
  for (const file of files) {
    let before;
    try {
      before = readFileSync(`${REPO_ROOT}/${file}`, 'utf8');
    } catch (error) {
      err(`Cannot read ${file}: ${error.message}`);
      process.exit(1);
    }
    const after = rewrite(before, name, scope);
    if (after !== before) changes.push({ file, before, after });
  }
  return changes;
}

function printSummary(name, scope, changes, skipInstall) {
  const commands = skipInstall ? 'none (--skip-install)' : PNPM_STEPS.map((s) => `pnpm ${s[0]}`).join(', ');
  out('Template init summary');
  out(`  Repository name: ${name}`);
  out(`  npm scope:       ${scope}`);
  out(changes.length === 0 ? '  Files to rewrite (0): none' : `  Files to rewrite (${changes.length}):`);
  for (const { file } of changes) out(`    ${file}`);
  out(`  Commands to run: ${commands}`);
}

/** Exits 1 before any write when a listed file no longer matches the content the summary was built from. */
function ensureUnchangedSincePreview(changes) {
  for (const { file, before } of changes) {
    let current;
    try {
      current = readFileSync(`${REPO_ROOT}/${file}`, 'utf8');
    } catch (error) {
      err(`Cannot read ${file}: ${error.message}`);
      err('No files were changed. Fix the cause and re-run to review a fresh summary.');
      process.exit(1);
    }
    if (current !== before) {
      err(`${file} changed after the summary was printed. No files were changed.`);
      err('Re-run without --yes to review a fresh summary.');
      process.exit(1);
    }
  }
}

/** Writes the changes; on failure reports progress and exits 1. */
function applyChanges(changes) {
  ensureUnchangedSincePreview(changes);
  for (const [index, { file, after }] of changes.entries()) {
    try {
      writeFileSync(`${REPO_ROOT}/${file}`, after);
    } catch (error) {
      const list = (items) => items.map((item) => `    ${item.file}`);
      const done = changes.slice(0, index);
      const rest = changes.slice(index + 1);
      err(`Failed to rewrite ${file}: ${error.message}`);
      err(`Rewritten before the failure (${done.length}):`);
      for (const line of list(done)) err(line);
      err(`Failed, may be partially written (1):`);
      err(`    ${file}`);
      err(`Not rewritten (${rest.length}):`);
      for (const line of list(rest)) err(line);
      err(
        `Check the failed file with "git diff -- ${file}", fix the cause, ` +
          'then re-run without --yes to review the summary before applying.',
      );
      process.exit(1);
    }
  }
  out(`Rewrote ${changes.length} files.`);
}

/** Runs the pnpm steps in order; on failure reports what remains and exits 1. */
function runPnpm() {
  // Ctrl+C reaches this process as well as the child; stay alive so the failure report below prints.
  process.on('SIGINT', () => {});
  for (const [index, args] of PNPM_STEPS.entries()) {
    const command = `pnpm ${args.join(' ')}`;
    out(`Running: ${command}`);
    const result = spawnSync('pnpm', args, {
      cwd: REPO_ROOT,
      // On Windows pnpm is a .cmd launcher run through cmd.exe, which asks "Terminate batch job (Y/N)?" on Ctrl+C
      // when it reads the console. Without console input it exits at once, so one Ctrl+C reaches the failure report.
      stdio: [process.platform === 'win32' ? 'ignore' : 'inherit', 'inherit', 'inherit'],
      shell: process.platform === 'win32',
    });
    if (result.status !== 0) {
      err(`Command failed: ${command}. If pnpm is not installed, install it first.`);
      err('Rewritten files were kept. Steps still to run manually:');
      for (const rest of PNPM_STEPS.slice(index)) err(`  pnpm ${rest.join(' ')}`);
      process.exit(1);
    }
  }
}

function printCompletion(name, scope, skipInstall) {
  const steps = [
    'Import .github/main-ruleset.json and .github/next-ruleset.json in the repository settings.',
    'Replace packages/example; update docs/ and AGENTS.md.',
    'Set up Migent: see README.md#set-up-migent.',
  ];
  if (skipInstall) steps.unshift('Run pnpm install && pnpm setup:git.');
  out(`Initialized as ${name} (${scope}).`);
  out('Remaining manual steps:');
  for (const [index, step] of steps.entries()) out(`  ${index + 1}. ${step}`);
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.error) usageError(parsed.error);
  const { options } = parsed;
  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);

  if (!interactive && options.name === undefined) usageError('Missing repository name.');

  const rl = interactive ? createInterface({ input: process.stdin, output: process.stdout }) : undefined;
  rl?.on('close', () => closed.add(rl));
  rl?.on('SIGINT', () => rl.close());

  try {
    const name = options.name ?? (await promptValue(rl, 'Repository name', nameProblem));
    const scope = options.scope ?? (interactive ? await promptValue(rl, 'npm scope', scopeProblem, DEFAULT_SCOPE) : DEFAULT_SCOPE);

    const changes = planChanges(listCandidates(), name, scope);
    printSummary(name, scope, changes, options.skipInstall);

    if (!options.yes) {
      if (!interactive) {
        err('Confirmation required: re-run with --yes to apply these changes.');
        process.exit(2);
      }
      const answer = (await ask(rl, 'Proceed? [y/N] ')).toLowerCase();
      if (answer !== 'y' && answer !== 'yes') throw new Cancelled();
    }
    rl?.close();

    applyChanges(changes);
    if (!options.skipInstall) runPnpm();
    printCompletion(name, scope, options.skipInstall);
  } catch (error) {
    if (!(error instanceof Cancelled)) throw error;
    out('Cancelled. No files were changed.');
    process.exit(1);
  }
}

await main();
