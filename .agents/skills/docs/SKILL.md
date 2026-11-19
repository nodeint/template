---
name: docs
description: >
  Manage documents under `docs/`: where a document goes, its front matter, and the generated catalog.
  Use when adding, moving, removing, retitling, or reviewing a document under `docs/`.
---

# Docs

Rules for the documents under `docs/` and their generated catalog.
Content and file-structure rules are in the `writing` skill; run the checks below from the repository root.

## Placement

- Put each document in the directory that matches how it is read:
  - `architecture/`: how the repository is structured and why.
  - `guides/`: steps to complete one task.
  - `reference/`: facts to look up.
- `docs/` holds only `README.md` and those directories. Add a directory by extending `SECTIONS` in
  `scripts/docs/catalog.mjs`.
- Extend an existing document before creating one; keep one topic per document.

## Front matter

Every document except `docs/README.md` needs a `# Title` heading and this front matter:

```yaml
---
description: What the document owns
read_when: When a reader should open it
---
```

Each value is a single line of plain text. The catalog takes the title from the `#` heading.

## Catalog

`docs/README.md` is generated from the documents and `scripts/docs/catalog.template.md`. Never edit it by hand.

Regenerate it after adding, moving, removing, or retitling a document, or changing its front matter:

```bash
pnpm docs:generate
```

Verify it. The check fails when a document lacks `description` or `read_when`, sits outside a known directory,
or `docs/README.md` differs from the generated catalog:

```bash
pnpm lint:docs
```

## Handoff

Run `pnpm docs:generate`, then `pnpm lint:docs`.
