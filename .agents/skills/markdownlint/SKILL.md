---
name: markdownlint
description: >
  Run the repository Markdown checks: style lint and link check.
  Use when validating Markdown after creating or changing it.
user-invocable: true
---

# Markdownlint

Run commands from the repository root.

## Style lint

Runs `markdownlint-cli2` with `.markdownlint-cli2.jsonc`, including its ignored paths.

Check every Markdown file included by the repository configuration:

```bash
pnpm lint:md
```

Check only selected files or directories:

```bash
pnpm lint:md -- <paths>
```

Apply supported automatic fixes only when the user requested them:

```bash
pnpm lint:md:fix -- <paths>
```

Confirm the output names the files that were linted;
zero findings do not verify a requested file when the command reports that it linted zero files.

## Link check

Repository script, separate from markdownlint. Run it when links changed or link validity matters.

Check local links across the repository:

```bash
pnpm lint:md:links
```

Limit the check to selected paths:

```bash
pnpm lint:md:links -- --path <dir>
```

Optional flags: `--no-fragments`, `--no-symbols`, `--json`, `--http` (network, slow).

## Handoff

Name any requested file that configuration excluded from the run.
