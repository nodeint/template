import { spawnSync } from 'node:child_process';
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, expect, test } from 'vitest';

// Built by concatenation so the rewrite rules in init.mjs do not change these fixtures after setup.
const TEMPLATE_REF = 'nodeint/' + 'template';
const NAME_REF = '"name": "' + 'template"';
const EXAMPLE_REF = '@nodeint/' + 'example';

const SCRIPTS_DIR = fileURLToPath(new URL('.', import.meta.url));

/** @type {string} */
let repo;
/** @type {string} */
let bin;
/** @type {string} */
let log;

function git(...args) {
  const result = spawnSync('git', args, { cwd: repo, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout;
}

/** Creates a fake `pnpm` that logs its arguments and fails for the listed first arguments. */
function installFakePnpm(failing) {
  const body = `echo "$*" >> "${log.replaceAll('\\', '/')}"\ncase "$1" in ${failing.map((f) => `${f}) exit 1;;`).join(' ')} esac\nexit 0\n`;
  writeFileSync(join(bin, 'pnpm'), `#!/bin/sh\n${body}`);
  chmodSync(join(bin, 'pnpm'), 0o755);
  const cmdFailing = failing.map((f) => `if "%1"=="${f}" exit /b 1`).join('\r\n');
  writeFileSync(join(bin, 'pnpm.cmd'), `@echo off\r\necho %* >> "${log}"\r\n${cmdFailing}\r\nexit /b 0\r\n`);
}

function run(args, env = {}) {
  const result = spawnSync(process.execPath, ['scripts/init.mjs', ...args], {
    cwd: repo,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH}`, ...env },
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

const pnpmCalls = () => {
  try {
    return readFileSync(log, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  } catch {
    return [];
  }
};

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'init-repo-'));
  bin = mkdtempSync(join(tmpdir(), 'init-bin-'));
  log = join(bin, 'pnpm.log');
  mkdirSync(join(repo, 'scripts', 'lib'), { recursive: true });
  cpSync(join(SCRIPTS_DIR, 'init.mjs'), join(repo, 'scripts', 'init.mjs'));
  cpSync(join(SCRIPTS_DIR, 'lib', 'repo.mjs'), join(repo, 'scripts', 'lib', 'repo.mjs'));
  writeFileSync(join(repo, 'README.md'), `see ${TEMPLATE_REF}\n`);
  writeFileSync(join(repo, 'package.json'), `{ ${NAME_REF}, "dep": "${EXAMPLE_REF}" }\n`);
  writeFileSync(join(repo, 'zlast.md'), `last ${TEMPLATE_REF}\n`);
  writeFileSync(join(repo, 'notes.md'), 'nothing here\n');
  git('init', '-q');
  git('add', '-A');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'init');
  installFakePnpm([]);
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
  rmSync(bin, { recursive: true, force: true });
});

test('--yes rewrites files, runs both pnpm steps in order, and exits 0', () => {
  const { code, stdout } = run(['my-repo', '--scope', '@acme', '--yes']);
  expect(code).toBe(0);
  const order = ['Template init summary', 'Rewrote 3 files.', 'Running: pnpm install', 'Running: pnpm setup:git', 'Initialized as my-repo (@acme).'];
  const positions = order.map((text) => stdout.indexOf(text));
  expect(positions.every((p) => p >= 0)).toBe(true);
  expect(positions).toEqual([...positions].sort((a, b) => a - b));
  expect(pnpmCalls()).toEqual(['install', 'setup:git']);
  expect(readFileSync(join(repo, 'README.md'), 'utf8')).toBe('see nodeint/my-repo\n');
  expect(readFileSync(join(repo, 'package.json'), 'utf8')).toBe('{ "name": "my-repo", "dep": "@acme/example" }\n');
});

test('without --yes and without a TTY it prints the summary, writes nothing, and exits 2', () => {
  const { code, stdout, stderr } = run(['my-repo']);
  expect(code).toBe(2);
  expect(stdout).toContain('Files to rewrite (3):\n    README.md\n    package.json\n    zlast.md\n');
  expect(stdout).toContain('npm scope:       @nodeint');
  expect(stderr).toContain('Confirmation required: re-run with --yes to apply these changes.');
  expect(git('diff', '--name-only')).toBe('');
  expect(pnpmCalls()).toEqual([]);
});

test.each([
  [[], 'Missing repository name.'],
  [['My Repo', '--yes'], 'Invalid name "My Repo": use lowercase letters, digits, and hyphens, starting with a letter.'],
  [['my-repo', '--scope', 'acme', '--yes'], 'Invalid scope "acme": use @ followed by lowercase letters, digits, "-", ".", or "_".'],
  [['my-repo', '--scope', 'bad', '--scope', '@ok', '--yes'], 'Invalid scope "bad"'],
  [['my-repo', '--scope'],'--scope needs a value.'],
  [['my-repo', '--bogus'], 'Unknown flag: --bogus'],
])('usage error for %j exits 2 with a reason and the usage line', (args, reason) => {
  const { code, stderr } = run(args);
  expect(code).toBe(2);
  expect(stderr).toContain(reason);
  expect(stderr).toContain('usage: node scripts/init.mjs');
  expect(git('diff', '--name-only')).toBe('');
});

test('--skip-install runs no pnpm command and lists the install step as remaining', () => {
  const { code, stdout } = run(['my-repo', '--yes', '--skip-install']);
  expect(code).toBe(0);
  expect(stdout).toContain('Commands to run: none (--skip-install)');
  expect(stdout).toContain('  1. Run pnpm install && pnpm setup:git.');
  expect(pnpmCalls()).toEqual([]);
});

test('the summary list equals the files git reports as changed after the run', () => {
  const { stdout } = run(['my-repo', '--yes', '--skip-install']);
  const listed = stdout.match(/^ {4}(\S.*)$/gm).map((l) => l.trim());
  expect(listed).toEqual(git('diff', '--name-only').trim().split('\n'));
});

test('a failing pnpm install skips setup:git, keeps the rewrite, and exits 1', () => {
  installFakePnpm(['install']);
  const { code, stderr } = run(['my-repo', '--yes']);
  expect(code).toBe(1);
  expect(stderr).toContain('Command failed: pnpm install.');
  expect(stderr).toContain('  pnpm install\n  pnpm setup:git\n');
  expect(pnpmCalls()).toEqual(['install']);
  expect(readFileSync(join(repo, 'README.md'), 'utf8')).toBe('see nodeint/my-repo\n');
});

test('a failing setup:git is named as the only remaining step and exits 1', () => {
  installFakePnpm(['setup:git']);
  const { code, stderr } = run(['my-repo', '--yes']);
  expect(code).toBe(1);
  expect(stderr).toContain('Command failed: pnpm setup:git.');
  expect(stderr).toContain('Steps still to run manually:\n  pnpm setup:git\n');
  expect(pnpmCalls()).toEqual(['install', 'setup:git']);
});

test('outside a git repository it reports the listing failure and exits 1 without a summary', () => {
  rmSync(join(repo, '.git'), { recursive: true, force: true });
  const { code, stdout, stderr } = run(['my-repo', '--yes'], { GIT_CEILING_DIRECTORIES: tmpdir() });
  expect(code).toBe(1);
  expect(stderr).toContain('Cannot list repository files:');
  expect(stdout).not.toContain('Template init summary');
  expect(pnpmCalls()).toEqual([]);
});

test('without --yes a listing failure exits 1 before the confirmation message', () => {
  rmSync(join(repo, '.git'), { recursive: true, force: true });
  const { code, stderr } = run(['my-repo'], { GIT_CEILING_DIRECTORIES: tmpdir() });
  expect(code).toBe(1);
  expect(stderr).not.toContain('Confirmation required');
});

test('an unreadable candidate file exits 1 with no summary and no change', () => {
  rmSync(join(repo, 'notes.md'));
  const { code, stdout, stderr } = run(['my-repo', '--yes']);
  expect(code).toBe(1);
  expect(stderr).toContain('Cannot read notes.md:');
  expect(stdout).not.toContain('Template init summary');
  expect(readFileSync(join(repo, 'README.md'), 'utf8')).toBe(`see ${TEMPLATE_REF}\n`);
  expect(pnpmCalls()).toEqual([]);
});

test('without --yes an unreadable candidate file exits 1 and prints no confirmation message', () => {
  rmSync(join(repo, 'notes.md'));
  const { code, stdout, stderr } = run(['my-repo']);
  expect(code).toBe(1);
  expect(stderr).toContain('Cannot read notes.md:');
  expect(stderr).not.toContain('Confirmation required');
  expect(stdout).not.toContain('Template init summary');
});

test('a write failure reports progress, keeps user edits, and a re-run completes the rest', () => {
  const readme = join(repo, 'README.md');
  const manifest = join(repo, 'package.json');
  const last = join(repo, 'zlast.md');
  writeFileSync(readme, `see ${TEMPLATE_REF}\nuser edit\n`);
  writeFileSync(last, `last ${TEMPLATE_REF}\nuser edit\n`);
  chmodSync(manifest, 0o444);
  const probe = spawnSync(process.execPath, ['-e', `require('fs').writeFileSync(${JSON.stringify(manifest)}, '')`]);
  expect(probe.status, 'the read-only file must reject writes (run as a non-root user)').not.toBe(0);

  const failed = run(['my-repo', '--yes']);
  expect(failed.code).toBe(1);
  expect(failed.stderr).toContain('Failed to rewrite package.json:');
  expect(failed.stderr).toContain('Rewritten before the failure (1):\n    README.md\n');
  expect(failed.stderr).toContain('Failed, may be partially written (1):\n    package.json\n');
  expect(failed.stderr).toContain('Not rewritten (1):\n    zlast.md\n');
  expect(failed.stderr).not.toContain('git checkout');
  expect(pnpmCalls()).toEqual([]);
  expect(readFileSync(readme, 'utf8')).toBe('see nodeint/my-repo\nuser edit\n');
  expect(readFileSync(last, 'utf8')).toBe(`last ${TEMPLATE_REF}\nuser edit\n`);

  chmodSync(manifest, 0o644);
  const retry = run(['my-repo', '--yes']);
  expect(retry.code).toBe(0);
  expect(retry.stdout).toContain('Files to rewrite (2):\n    package.json\n    zlast.md\n');
  expect(readFileSync(readme, 'utf8')).toBe('see nodeint/my-repo\nuser edit\n');
  expect(readFileSync(last, 'utf8')).toBe('last nodeint/my-repo\nuser edit\n');
});
