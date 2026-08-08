---
description: Check if documentation is in sync with code
allowed-tools: Read, Glob, Grep, Bash(git:*)
---

# Documentation Sync

Check if documentation matches the current code state.

## Instructions

1. **Find recent code changes**:
   ```bash
   git log --since="30 days ago" --name-only --pretty=format: -- "*.ts" "*.tsx" | grep -v "ralph-worktrees" | grep -v "_archived" | sort -u
   ```

2. **Extract rename/delete signals** (the highest-drift-risk changes). From the diff, collect:
   - Deleted or renamed **routes** (`app/**/page.tsx`, `app/**/route.ts` removals/moves, redirect-map edits in `app/_features/shell/routes.ts` / `middleware.ts`)
   - Deleted or renamed **tables/columns** (`supabase/migrations/` with `DROP`/`RENAME`)
   - Deleted or renamed **exported functions/modules** (removed files, renamed exports)
   ```bash
   git diff --diff-filter=D --name-only origin/main...HEAD
   git diff origin/main...HEAD -- supabase/migrations/ | grep -iE "DROP (TABLE|COLUMN)|RENAME TO"
   ```

3. **Flag docs that reference the old names** — for each dead identifier, grep the doc surfaces and report every hit as stale:
   ```bash
   rg -n "<old-name>" docs/ brand-identity/ CLAUDE.md AGENTS.md app/**/CLAUDE.md packages/**/CLAUDE.md
   ```
   A doc referencing a deleted route/table/function is WRONG by definition — flag it even if the surrounding prose is fine.

4. **Find related documentation**:
   - Search `/docs/` for files mentioning changed code
   - Check CLAUDE.md files near changed code
   - Look for TSDoc comments in changed files

5. **Verify documentation accuracy**:
   - Do code examples still work?
   - Are API signatures correct?
   - Are prop types up to date?

6. **Report only actual problems**:
   - Documentation is a living document
   - Only flag things that are WRONG, not missing
   - Don't suggest documentation for documentation's sake

7. **Output a checklist** of documentation that needs updating