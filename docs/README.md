# Documentation map

Select the smallest set of documents relevant to a task. Check details against current source.

This file is generated from document front matter by `pnpm docs:generate`; do not edit it by hand.

## Documents

### Architecture

How the repository is structured and why.

| Document | Owns | Read when |
| --- | --- | --- |
| [Architecture](architecture/overview.md) | Package ownership and dependency direction | Adding a package or changing boundaries |
| [Repository layout](architecture/repository-layout.md) | Top-level paths and their purpose | Looking for where something lives |

### Guides

Steps to complete one task.

| Document | Owns | Read when |
| --- | --- | --- |
| [Add a package](guides/add-package.md) | Creating and registering a workspace package | Adding a package |
| [Add a skill](guides/add-skill.md) | Creating and registering an agent skill | Adding a skill |

### Reference

Facts to look up.

| Document | Owns | Read when |
| --- | --- | --- |
| [Migent workflows](reference/migent-workflows.md) | Workflows, lifecycle, and paths from issue to pull request | Choosing a workflow |
| [Quality gates](reference/quality-gates.md) | Checks enforced locally and in CI | Choosing which checks to run |
| [Skills](reference/skills.md) | Skill groups and how skills load | Changing how skills are organized or loaded |
