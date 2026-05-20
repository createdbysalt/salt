---
name: code-structure-cleanup
description: Use after an AI-built feature works but the code has duplicated mechanics, repeated API calls, or messy structure. Guides a cleanup pass that extracts reusable service-layer modules without changing behavior.
version: 1.0.0
author: David Ondrej / Michael Shimeles interview notes
license: MIT
---

# Code Structure Cleanup After Every Feature

See `.cursor/skills/code-structure-cleanup/SKILL.md` for the canonical Cursor copy. Content is identical; keep both in sync when editing.

Run this cleanup pass **after** a feature works, not before. Pair with `code-structure` for extraction rules.

## Cleanup Prompt

```md
The feature is working. Now do a code-structure cleanup pass.

Goal:
- Find duplicated runtime mechanics, repeated API calls, repeated parsing, repeated validation, or repeated business logic.
- Move repeated mechanics into reusable service-layer functions/modules.
- Keep domain policy in the calling route/action/component.
- Do not change user-facing behavior.
- Keep the diff small.

Process:
1. Inspect the files touched by the feature.
2. Identify repeated logic and name the duplication clearly.
3. Propose the smallest service-layer extraction.
4. Implement it.
5. Run the relevant tests/typechecks.
6. Summarize exactly what got simpler.
```
