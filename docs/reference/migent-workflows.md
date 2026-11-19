---
description: Workflows, lifecycle, and paths from issue to pull request
read_when: Choosing a workflow
---

# Migent workflows

`.migent/workflows/` holds the workflows that take a GitHub issue to a pull request.
Each workflow is a separate session, and each stage runs as a role defined in `.migent/config.yaml`.
Assign an agent to each role first; see [Set up Migent](../../README.md#set-up-migent).
Workflow syntax and the CLI are documented with the [Migent CLI](https://www.npmjs.com/package/@nodeint/migent).

## Workflows

| Workflow | Purpose |
| --- | --- |
| `issue` | Triage a GitHub issue, create the working branch, recommend the next workflow |
| `product` | Define requirements, user scenarios, and acceptance criteria |
| `design` | Decide the solution, structure, and contracts |
| `plan` | Split an approved design into independently verifiable phases |
| `implement` | Implement a task, a design, or a plan, then review it |
| `implement_plan` | Implement and commit one plan phase per session |
| `pr` | Commit, push, open the pull request, report CI |

Each workflow file declares its own artifacts and suggested next workflows.

## Lifecycle

```text
issue ─► product ─► design ─► plan ─► implement_plan (once per phase) ─► pr
  │         │          │                                                  ▲
  └─────────┴──────────┴────────────► implement ─────────────────────────┘
```

- `issue` is the entry point. It recommends a path from its evidence; the human decides.
- Authoring workflows (`product`, `design`, `plan`) write a document, then a reviewer approves it or sends it
  back for revision. They never modify source code.
- `implement` writes code, then a reviewer approves it or sends it back.
- `implement_plan` completes one phase per session; repeat it until every phase is committed, then run `pr`.
- A stage that needs a human decision stops and asks.
- A completed workflow only suggests the next one; the human starts it.

| Situation | Path |
| --- | --- |
| Requirements or scope are unclear | `issue` → `product` → `design` → `plan` → `implement_plan` → `pr` |
| The change crosses contracts or packages, or a bug's cause is unclear | `issue` → `design` → `plan` → `implement_plan` → `pr` |
| One module owns the change and the solution is obvious | `issue` → `implement` → `pr` |
