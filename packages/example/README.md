# @scope/example

Generic library scaffold. Copy it using the [package guide](../../docs/guides/add-package.md), then rename it.

## Layout

```text
src/
  index.ts
```

| Path | Purpose |
| --- | --- |
| `src/index.ts` | Public package entry |
| `package.json` | Package identity, exports, and build command |
| `tsconfig.json`, `tsdown.config.ts` | Typechecking and bundling |

## Rules

- `src/index.ts` is an empty module; add only what the package needs.
- Keep implementation and tests together by feature as the package grows.
- Export public symbols explicitly by name through `src/index.ts`; use type-only exports for types.
- Follow the [repository testing rules](../../CONTRIBUTING.md#testing) when adding logic.
