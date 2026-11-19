# Nodeint template

A TypeScript monorepo template designed for agent-first development: AI agents do the routine work, and
the repository's rules, tooling, and workflows keep that work correct, reviewable, and consistent.

## What you get

- **Agent rules.** [`AGENTS.md`](AGENTS.md) sets working principles: define scope and acceptance criteria
  first, ask when blocked, change the minimum, verify before reporting.
- **Skills.** Task-specific procedures in `.agents/skills/` (design, planning, implementation, review, testing,
  TypeScript, Markdown, pull requests, releases) that agents load on demand.
- **Standard workflows.** [Migent](https://www.npmjs.com/package/@nodeint/migent) workflows in `.migent/` take
  an issue through product, design, plan, implementation, review, and pull request, with human approval at
  each decision.
- **Quality gates.** Strict ESLint, TypeScript, tsdown builds, Vitest (unit, integration, and e2e), knip for
  unused code, jscpd for duplication, and markdownlint, run in git hooks and CI.
- **Enforced conventions.** Branch names, commit subjects, and pull request titles are checked by hooks and CI;
  rulesets protect `main` and `next`.
- **Release automation.** Tagging, GitHub Releases, and npm publishing through trusted publishing.
- **Working example.** `packages/example` keeps CI green from the first commit.

## Set up

1. Click **Use this template** on GitHub.
2. Run `node scripts/init.mjs <repo-name> [--scope @nodeint]` to rename the template references.
3. Run `pnpm install && pnpm setup:git`.
4. Import `.github/main-ruleset.json` and `.github/next-ruleset.json` in the repository settings;
   GitHub does not copy rulesets from a template.
5. Replace `packages/example`; update `docs/` and `AGENTS.md`.
6. [Set up Migent](#set-up-migent).

### Set up Migent

1. Install Migent globally and add its skill:

   ```sh
   npm install -g @nodeint/migent
   migent skill install --global
   ```

2. Copy `.migent/config.local.example.yaml` to `.migent/config.local.yaml` (uncommitted) and set a `model`
   and `effort` for each role. `.migent/config.yaml` defines roles but no agents, because models depend on
   each machine's installed CLIs and accounts.
   - `migent get models` lists the installed models, and `migent get efforts` lists the effort levels per
     model.
   - The Migent extension offers a UI for these settings. Install it from the
     [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=nodeint.migent-vscode) or,
     for other IDEs, [Open VSX](https://open-vsx.org/extension/nodeint/migent-vscode).
3. Run `migent doctor` to check the result.

## Next

Read the [documentation map](docs/README.md) for the layout and workflows, and
[CONTRIBUTING.md](CONTRIBUTING.md) for contribution rules.
