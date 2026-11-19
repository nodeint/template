---
description: Top-level paths and their purpose
read_when: Looking for where something lives
---

# Repository layout

Where each part of the repository lives. Setup steps are in the [README](../../README.md#set-up).

| Path | Purpose |
| --- | --- |
| `packages/` | Workspace packages, each with its own `README.md` |
| `e2e/` | Private `@nodeint/e2e` package: tests that use built packages as a consumer would |
| `scripts/` | Repository tooling, grouped by purpose in subdirectories |
| `docs/` | Documentation; [README.md](../README.md) maps each document to the task that needs it |
| `.githooks/` | Git hooks installed by `pnpm setup:git` |
| `.github/` | Workflows, rulesets, issue and pull request templates |
| `.agents/skills/` | Agent skills, one directory per skill with a `SKILL.md` |
| `.migent/` | Migent roles and workflows |
| `AGENTS.md` | Agent working principles and the skill table |

Commands are defined in the `scripts` of the root `package.json`.
Tool configuration sits at the repository root, one file per tool (TypeScript, Vitest, ESLint, knip, jscpd,
markdownlint).
