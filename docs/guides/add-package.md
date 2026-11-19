---
description: Creating and registering a workspace package
read_when: Adding a package
---

# Add a package

1. Copy `packages/example` and rename the directory.
2. Update the name and repository directory in its `package.json`.
3. Register it in the root `tsconfig.json`.
4. Declare `typescript` and `tsdown` in its `devDependencies` as `"catalog:"`, then run `pnpm install`.
   The root keeps TypeScript 6 for ESLint; each package builds with the version in the
   [catalog](../../pnpm-workspace.yaml).
5. Document its purpose and rules in its `README.md` and in the package table of
   [CONTRIBUTING.md](../../CONTRIBUTING.md#packages).
6. Run the [checks relevant to the change](../../CONTRIBUTING.md#verify-changes).

## Package layout

The [example package](../../packages/example/README.md#layout) provides this library scaffold:

```text
packages/<name>/
  README.md
  package.json
  tsconfig.json
  tsdown.config.ts
  src/
    index.ts
    constants.ts
    types.ts
    utils/
      index.ts
```

| Path | Responsibility | Exports |
| --- | --- | --- |
| `README.md` | Package purpose, usage, and ownership rules | — |
| `package.json` | Package identity, public entry points, published files, build command, and build tool versions from the catalog | — |
| `tsconfig.json` | Package typechecking configuration | — |
| `tsdown.config.ts` | Package bundling configuration | Build configuration |
| `src/index.ts` | Public package entry | Public symbols explicitly by name; use `export type` for types |
| `src/constants.ts` | Constants shared across the package | Constants only |
| `src/types.ts` | Types shared across the package | Types only; use `export type` for re-exports |
| `src/utils/` | Utilities shared across the package | Utility functions |
| `src/utils/index.ts` | Entry for shared utilities | Utility functions explicitly by name |

- Each subdirectory under `src/` exposes its public symbols through its own `index.ts`.
- Code outside a subdirectory imports from that entry instead of its implementation files.
- `src/index.ts` re-exports the package's public symbols by name from those subdirectory entries.
- Do not use wildcard exports in index files, including `export *` and `export type *`.
- Keep feature-specific implementation and tests together; add feature directories as needed.
- Add errors, IO adapters, or additional entry points only when required by the package.
- Follow the [testing rules](../../CONTRIBUTING.md#testing) when adding logic; the scaffold has no unit tests.
