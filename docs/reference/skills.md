---
description: Skill groups and how skills load
read_when: Changing how skills are organized or loaded
---

# Skills

Skills in `.agents/skills/` own task-specific procedures. The table in [AGENTS.md](../../AGENTS.md#skills)
lists each skill and when it loads; workflow stages load skills by name in their instructions.
To add one, see [Add a skill](../guides/add-skill.md).

| Group | Role |
| --- | --- |
| Workflow skills | One per workflow step: issue triage, product, design, planning, implementation, review, pull request |
| Code and content skills | Standards for TypeScript, lint, tests, and Markdown; loaded when matching files change |
| Standalone skills | Tasks outside the workflows, such as creating an issue or releasing |
