# Changelog

## Unreleased

- `node scripts/init.mjs` sets up a template repository in one command: it prompts for the name and scope,
  previews the files it rewrites, asks for confirmation, and runs `pnpm install` and `pnpm setup:git`.
  Agents and CI pass `--yes`; `--skip-install` rewrites only.
- Replace the greeting example with a generic library scaffold and document its package layout.
