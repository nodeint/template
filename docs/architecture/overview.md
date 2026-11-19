---
description: Package ownership and dependency direction
read_when: Adding a package or changing boundaries
---

# Architecture

Describe package ownership and dependency direction here. Packages live in `packages/<name>` and
depend on each other only by package name through `workspace:*`.

`e2e/` is a private workspace package outside `packages/`. It depends on built packages by name, nothing depends on it,
and releases never include it.
