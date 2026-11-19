# @nodeint/example

Generic library scaffold. Copy it using the [package guide](../../docs/guides/add-package.md), then rename it.

## Layout

```text
src/
  index.ts
  constants.ts
  types.ts
  utils/
    index.ts
```

| Path | Purpose |
| --- | --- |
| `src/index.ts` | Public package entry |
| `src/constants.ts` | Shared constants |
| `src/types.ts` | Shared types |
| `src/utils/` | Shared utilities |
| `package.json` | Package identity, exports, and build command |
| `tsconfig.json`, `tsdown.config.ts` | Typechecking and bundling |

## Rules

- The source files are empty modules; add only what the package needs.
- Keep implementation and tests together by feature as the package grows.
- Export public symbols explicitly by name through `src/index.ts`; use type-only exports for types.
- Follow the [repository testing rules](../../CONTRIBUTING.md#testing) when adding logic.
