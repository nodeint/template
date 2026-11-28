# Changelog

## Unreleased

- `node scripts/init.mjs` sets up a template repository in one command: it prompts for the name and scope,
  previews the files it rewrites, asks for confirmation, and runs `pnpm install` and `pnpm setup:git`.
  Agents and CI pass `--yes`; `--skip-install` rewrites only.
  Template files use `<package>`, `@scope`, `<owner>`, and `<repo>` placeholders, and a GitHub `origin` remote
  supplies the defaults; without a terminal and without a usable remote, pass the name and `--scope`.
  In a terminal, blank answers use the remote defaults, then `my-project` and `@<name>`, and confirmation
  defaults to yes.
- Replace the greeting example with a generic library scaffold and document its package layout.
