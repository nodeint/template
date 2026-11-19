# @nodeint/e2e

Private package of end-to-end tests. It is never published and has no version.

## Rules

- Use other packages only through their package name, as a consumer would; never import their `src/`.
- Tests need built packages: run `pnpm build` first, then `pnpm test:e2e`.
- Put a test here only when it needs the built output across a package boundary; otherwise it belongs beside its source.
