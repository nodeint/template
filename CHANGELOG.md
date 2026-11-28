# Changelog

## Unreleased

## 0.1.0

### Breaking

- `node scripts/init.mjs` now runs `pnpm install` and `pnpm setup:git` and needs `--yes` without a terminal;
  run `node scripts/init.mjs <repo-name> --scope <scope> --yes` (add `--skip-install` to rewrite only).
  The scope now defaults to the `origin` remote owner instead of `@nodeint`, so pass `--scope` without a remote.
  ([#2](https://github.com/nodeint/template/pull/2))
- Migent configuration moves to schema 8: set `schema_version: 8` in `.migent/config.local.yaml`, rename a
  `product` role override to `product_analyst`, and add `product_reviewer`, `architect_reviewer`, and
  `planner_reviewer` overrides where you set review models. ([#2](https://github.com/nodeint/template/pull/2))

### Added

- `node scripts/init.mjs` sets up a template repository in one command: it prompts for the name and scope,
  previews the files it rewrites, asks for confirmation, and runs `pnpm install` and `pnpm setup:git`.
  In a terminal, blank answers use the `origin` remote defaults, then `my-project` and `@<name>`,
  and confirmation defaults to yes. ([#2](https://github.com/nodeint/template/pull/2))
- Template files now use `<package>`, `@scope`, `<owner>`, and `<repo>` placeholders, which init replaces.
  ([#2](https://github.com/nodeint/template/pull/2))

### Changed

- Remove the empty starter modules (`constants.ts`, `types.ts`, `utils/`) from `packages/example`;
  its package layout now lists only `src/index.ts`. ([#2](https://github.com/nodeint/template/pull/2))
