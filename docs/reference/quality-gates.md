---
description: Checks enforced locally and in CI
read_when: Choosing which checks to run
---

# Quality gates

The repository enforces the same checks locally and in CI: build, tests, lint, unused code, duplicate code,
and Markdown. [CONTRIBUTING.md](../../CONTRIBUTING.md#verify-changes) lists the commands.
Git hooks check branch names, commit subjects, and pushes; the workflows in `.github/workflows/` run the
checks on pull requests and publish releases.
