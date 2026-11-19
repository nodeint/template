# Contributing

Repository: `nodeint/template`. Run `node scripts/init.mjs <repo-name>` once after creating a repo from it.

## Setup

Node.js ≥22 (CI: 24), pnpm 12.6.0; macOS, Linux, Windows. Run from repo root:

```bash
pnpm install
pnpm setup:git # before branching/committing; rerun after hook changes
pnpm build
```

## Packages

Paths are `packages/<name>`; names are `@nodeint/<name>`.

| Name | Owns |
| --- | --- |
| example | Placeholder package; replace it |
| e2e | Private end-to-end tests at `e2e/`; never released, has no version |

- Read each affected package's `README.md`; import cross-package code by package name.
- Never hand-edit `dist/`.
- Release and version steps cover `packages/*` only; `e2e` is private and excluded.

## Testing

Tests use Vitest with explicit imports (`import { expect, test } from 'vitest'`; no globals).
Package tests sit beside the source file they test (`src/foo.ts` → `src/foo.test.ts`).
Tests that use built packages as a consumer would live in the `e2e` package as `src/*.specs.ts`,
so they never match unit test globs.
`pnpm test:layout` fails on a test without a sibling source file or kept in a separate `test/` directory.

| Kind | File | Run | Use for |
| --- | --- | --- | --- |
| Unit | `*.test.ts`, `*.test.tsx` | `pnpm test:unit` | Input and output of one function |
| Scripts | `scripts/**/*.test.mjs`, `scripts/**/*.integration.test.mjs` | `pnpm test:scripts` | Repository scripts, including those that run real `git` processes |
| Integration | `*.integration.test.ts`, `*.integration.test.tsx` | `pnpm test:integration` (build first) | Functions across modules combined; real IO, processes, sockets, `git` |
| E2E | `e2e/src/**/*.specs.ts` | `pnpm test:e2e` (build first) | Built packages as a consumer would; only when the user asks |

- Decide whether a test should exist, and its kind, with the `testing` skill: tests protect logic, not coverage.
- Name each test as a behavior sentence and test one behavior per test.
- Give each test a fresh temp directory and remove it afterwards.
- Tests must pass on Ubuntu, macOS, and Windows.

## Verify changes

Scope each check to the change; full runs are slow.

| Check | Command |
| --- | --- |
| Lint | `pnpm lint -- <paths>` |
| Unit tests | `pnpm test:unit --file <suite> [--case <name>]` |
| Scripts tests | `pnpm test:scripts --file <suite> [--case <name>]` |
| Test layout | `pnpm test:layout` |
| Integration tests | `pnpm test:integration --file <suite> [--case <name>]` |
| E2E tests | `pnpm test:e2e` |
| Typecheck and build | `pnpm build` |
| Unused code and exports | `pnpm knip` |
| Duplicate code | `pnpm jscpd` |
| Markdown | `pnpm lint:md -- <paths>`, `pnpm lint:md:links -- --path <directory>`, `pnpm docs:generate` then `pnpm lint:docs` after changing `docs/` |

Report each command with its result, and name any check not run with the reason.

## Work types

| Type | Meaning | Branch | Label |
| --- | --- | --- | --- |
| feature | New observable capability | `feat/<slug>` | `enhancement` |
| bugfix | Restore promised behavior | `fix/<slug>` | `bug` |
| refactor | Restructure; preserve behavior | `refactor/<slug>` | None |
| migration | Staged compatibility or cutover | `feat/<slug>` | None |
| docs | Documentation only | `docs/<slug>` | None |
| chore | Tooling, dependencies, or CI | `chore/<slug>` | None |

Issues use `.github/ISSUE_TEMPLATE/<type>.yml`; write them in English.

## Branch and pull request rules

- `next` is the integration/default branch; `main` holds the latest release, advanced by `release.yml`.
  Never commit or push directly to either, force-push, or use `--no-verify`.
- Branch from `origin/next`; all changes enter via draft PRs, squash-merged.
- Branch: `<type>/<issue-number>-<slug>` (omit the number without an issue).
- Commit and PR: `<type>: <imperative summary>`; short English line, no scope or final period.
- Release: `release/X.Y.Z` → `Release X.Y.Z`.
- Fill `.github/pull_request_template.md`; link closing issues with `Fixes #<n>`.
- User-visible changes add a bullet under `## Unreleased` in `CHANGELOG.md`, in the same PR.
- Import the rulesets in `.github/*-ruleset.json` in repository settings.

## Release policy

- Only releases change versions; all workspace package versions match.
- `release.yml` tags `vX.Y.Z`, fast-forwards `main`, creates the GitHub Release, and publishes via npm OIDC.
- Configure each package's npm trusted publisher: repository, workflow `release.yml`, empty environment.
