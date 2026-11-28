/**
 * Set up a repository created from the template, in one command.
 *
 * Usage: node scripts/init.mjs [<repo-name>] [--scope <scope>] [--yes] [--skip-install]
 *
 * Replaces the `<package>`, `@scope`, `<owner>`, and `<repo>` placeholders in tracked text files and package manifests.
 * When `origin` is a GitHub remote, its owner and repository name are the defaults for owner, name, and scope.
 * Then runs `pnpm install` and `pnpm setup:git`. In a terminal it prompts for missing values and
 * asks for confirmation; without a terminal it needs `<repo-name>` and `--yes`.
 * Uses Node built-ins only, because it runs before `pnpm install`.
 *
 * Exit codes: 0 done; 1 cancelled or a listing, read, write, or pnpm step failed; 2 usage error.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, writeSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { styleText } from 'node:util';

import { REPO_ROOT } from './lib/repo.mjs';

const USAGE = 'usage: node scripts/init.mjs [<repo-name>] [--scope <scope>] [--yes] [--skip-install]';
const NAME_PATTERN = /^[a-z][a-z0-9-]*$/;
// An owner or repository name as GitHub allows it: letters, digits, `-`, `_`, and `.`.
const REMOTE_PART = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
// Paths whose text uses `<owner>` and `<package>` as generic examples, not template placeholders.
// GitHub remote forms: https://[user@]github.com/o/r[.git], ssh://git@github.com[:port]/o/r, git@github.com:o/r.
const REMOTE_URL = /^(?:https?:\/\/(?:[^@/\s]+@)?|ssh:\/\/git@|git@)github\.com(?::\d+)?[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i;
const EXCLUDED_PREFIXES = ['.agents/', '.migent/', 'CHANGELOG.md'];
const SCOPE_PATTERN = /^@[a-z0-9][a-z0-9._-]*$/;
// Prompt default for the repository name when `origin` gives none.
const DEFAULT_NAME = 'my-project';
const PNPM_STEPS =[['install'], ['setup:git']];

/** Write synchronously so output stays ordered with child process output. */
const out = (text) => writeSync(1, `${text}\n`);
const err = (text) => writeSync(2, `${text}\n`);
/** Styles text for a stream; stays plain when the stream is not a color terminal or NO_COLOR is set. */
const paint = (format, text, stream = process.stdout) => styleText(format, text, { stream });
const errPaint = (format, text) => paint(format, text, process.stderr);
/** Prints a section heading preceded by a blank line. */
const heading = (text) => out(`\n${paint(['bold', 'cyan'], text)}`);

class Cancelled extends Error {}

/** Tracks whether the readline interface closed (Ctrl+C or end of input) so later prompts cancel too. */
const closed = new WeakSet();

/** Returns a reason when the name is invalid, otherwise undefined. */
function nameProblem(name) {
  return NAME_PATTERN.test(name)
    ? undefined
    : `Invalid name "${name}": use lowercase letters, digits, and hyphens, starting with a letter.`;
}

/** Derives a valid package name from a repository name (`Cool.Repo` becomes `cool-repo`); undefined when none fits. */
function packageNameFrom(repo) {
  const slug = repo.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  // Names must start with a letter, so a leading digit gets a `pkg-` prefix (`3d-tools` becomes `pkg-3d-tools`).
  const name = /^[0-9]/.test(slug) ? `pkg-${slug}` : slug;
  return nameProblem(name) ? undefined : name;
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
function rewrite(content, { name, scope, owner, repo }) {
  return content
    .replaceAll('<owner>', owner)
    .replaceAll('<repo>', repo)
    .replaceAll('<package>', name)
    .replaceAll('@scope', scope);
}

/** Reads owner and repository name from a GitHub `origin` remote, keeping their case; returns `{}` when there is none. */
function detectRemote() {
  let url;
  try {
    url = execFileSync('git', ['remote', 'get-url', 'origin'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return {};
  }
  const match = REMOTE_URL.exec(url);
  if (!match || !REMOTE_PART.test(match[1]) || !REMOTE_PART.test(match[2])) return {};
  return { owner: match[1], repo: match[2] };
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
    const answer = (await ask(rl, `${paint('bold', label)}${fallback ? paint('dim', ` [${fallback}]`) : ''}: `)) || fallback || '';
    const problem = check(answer);
    if (!problem) return answer;
    err(errPaint('red', problem));
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
    .filter((file) => /\.(json|md|ya?ml|mjs|ts)$/.test(file) && !file.startsWith('scripts/init') && !EXCLUDED_PREFIXES.some((prefix) => file.startsWith(prefix)));
}

/** Reads every candidate and returns the changes to apply; exits 1 when a file cannot be read. */
function planChanges(files, values) {
  const changes = [];
  for (const file of files) {
    let before;
    try {
      before = readFileSync(`${REPO_ROOT}/${file}`, 'utf8');
    } catch (error) {
      err(`Cannot read ${file}: ${error.message}`);
      process.exit(1);
    }
    const after = rewrite(before, values);
    if (after !== before) changes.push({ file, before, after });
  }
  return changes;
}

function printSummary({ name, scope, owner, repo }, changes, skipInstall) {
  const commands = skipInstall ? 'none (--skip-install)' : PNPM_STEPS.map((s) => `pnpm ${s[0]}`).join(', ');
  const row = (label, value) => out(`  ${paint('dim', label)} ${paint('cyan', value)}`);
  heading('Template init summary');
  row('Repository name:', name);
  row('npm scope:      ', scope);
  row('GitHub repo:    ', `${owner}/${repo}`);
  out(paint('dim', changes.length === 0 ? '  Files to rewrite (0): none' : `  Files to rewrite (${changes.length}):`));
  for (const { file } of changes) out(paint('dim', `    ${file}`));
  row('Commands to run:', commands);
  out('');
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
  out(paint('green', `Rewrote ${changes.length} files.`));
}

/** Runs the pnpm steps in order; on failure reports what remains and exits 1. */
function runPnpm() {
  // Ctrl+C reaches this process as well as the child; stay alive so the failure report below prints.
  process.on('SIGINT', () => {});
  for (const [index, args] of PNPM_STEPS.entries()) {
    const command = `pnpm ${args.join(' ')}`;
    heading(`Running: ${command}`);
    const options = {
      cwd: REPO_ROOT,
      // On Windows pnpm is a .cmd launcher run through cmd.exe, which asks "Terminate batch job (Y/N)?" on Ctrl+C
      // when it reads the console. Without console input it exits at once, so one Ctrl+C reaches the failure report.
      stdio: [process.platform === 'win32' ? 'ignore' : 'inherit', 'inherit', 'inherit'],
    };
    // Windows needs a shell for the .cmd launcher. Pass one command string: shell mode with an args array is
    // deprecated (DEP0190). The arguments are fixed constants, so nothing needs escaping.
    const result =
      process.platform === 'win32' ? spawnSync(command, { ...options, shell: true }) : spawnSync('pnpm', args, options);
    if (result.status !== 0) {
      err(errPaint('red', `Command failed: ${command}. If pnpm is not installed, install it first.`));
      err('Rewritten files were kept. Steps still to run manually:');
      for (const rest of PNPM_STEPS.slice(index)) err(`  pnpm ${rest.join(' ')}`);
      process.exit(1);
    }
  }
}

function printCompletion({ name, scope }, skipInstall) {
  const steps = [
    'Delete scripts/init.mjs and scripts/init.integration.test.mjs, and remove "init:template" from package.json.',
    'Import .github/main-ruleset.json and .github/next-ruleset.json in the repository settings.',
    'Replace packages/example; update docs/ and AGENTS.md.',
    'Set up Migent: see README.md#set-up-migent.',
  ];
  if (skipInstall) steps.unshift('Run pnpm install && pnpm setup:git.');
  out('');
  out(paint(['bold', 'green'], `Initialized as ${name} (${scope}).`));
  heading('Remaining manual steps');
  for (const [index, step] of steps.entries()) out(`  ${paint('yellow', `${index + 1}.`)} ${step}`);
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.error) usageError(parsed.error);
  const { options } = parsed;
  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);

  const rl = interactive ? createInterface({ input: process.stdin, output: process.stdout }) : undefined;
  rl?.on('close', () => closed.add(rl));
  rl?.on('SIGINT', () => rl.close());

  try {
    const remote = detectRemote();
    const defaultName = remote.repo ? packageNameFrom(remote.repo) : undefined;
    const name =
      options.name ??
      (interactive ? await promptValue(rl, 'Repository name', nameProblem, defaultName ?? DEFAULT_NAME) : defaultName);
    if (name === undefined) usageError('Missing repository name: pass <repo-name> or add a GitHub origin remote.');
    const remoteScope = remote.owner && !scopeProblem(`@${remote.owner.toLowerCase()}`) ? `@${remote.owner.toLowerCase()}` : undefined;
    const scope =
      options.scope ??
      (interactive ? await promptValue(rl, 'npm scope', scopeProblem, remoteScope ?? `@${name}`) : remoteScope);
    if (scope === undefined) usageError('Missing npm scope: pass --scope or add a GitHub origin remote.');
    // The repository identity comes from `origin` when present; the package name and scope never change it.
    const values = { name, scope, owner: remote.owner ?? scope.slice(1), repo: remote.repo ?? name };

    const changes = planChanges(listCandidates(), values);
    printSummary(values, changes, options.skipInstall);

    if (!options.yes) {
      if (!interactive) {
        err('Confirmation required: re-run with --yes to apply these changes.');
        process.exit(2);
      }
      const answer = (await ask(rl, `${paint('bold', 'Proceed?')} ${paint('dim', '[Y/n]')} `)).toLowerCase();
      if (answer !== '' && answer !== 'y' && answer !== 'yes') throw new Cancelled();
    }
    rl?.close();

    applyChanges(changes);
    if (!options.skipInstall) runPnpm();
    printCompletion(values, options.skipInstall);
  } catch (error) {
    if (!(error instanceof Cancelled)) throw error;
    out('Cancelled. No files were changed.');
    process.exit(1);
  }
}

await main();
