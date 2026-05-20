---
name: pragmatic-code-review
description: Conducts a Pragmatic Quality code review of the current branch diff — rigorous standards balanced with startup velocity. Use before merge, after Greptile feedback, or when the user asks for a principal-engineer review.
---

# Pragmatic Code Review

Principal-engineer review for SALT: high standards without bikeshedding. Pair with `grep-loop-review-workflow` (Greptile fixes) — this skill focuses on architecture, correctness, and maintainability.

**Source:** `.claude/commands/pragmatic-code-review.md`

## When to Use

- Before merging a PR (especially after Greptile or human comments are addressed)
- User says `qreview-pragmatic`, "pragmatic review", or "principal engineer review"
- Large diffs touching auth, payments, RLS, or server actions

## Process

1. **Gather scope** (run in repo root):
   ```bash
   git status
   git diff --name-only origin/main...HEAD 2>/dev/null || git diff --name-only main...HEAD
   git log --oneline -10 origin/main...HEAD 2>/dev/null || git log --oneline -10 main...HEAD
   git diff origin/main...HEAD 2>/dev/null || git diff main...HEAD
   ```
   If no `origin/main`, use `git merge-base HEAD main` and diff from there.

2. **Read changed files** — especially `app/_features/`, `app/_lib/`, `supabase/migrations/`, `app/actions/`.

3. **Review against SALT standards** (see `.cursorrules`, `CLAUDE.md`, nested `CLAUDE.md` for touched areas):
   - Server actions return `Result<T, E>`; DAL in `app/_lib/dal/`
   - No `any`, no `@ts-ignore`
   - RLS and multi-tenant safety for Supabase changes
   - Vitest for logic, Playwright patterns for E2E
   - shadcn/`@repo/ui` for UI (see `frontend-design` skill)

4. **Pragmatic Quality lens** — flag only issues that matter:
   - Security / data leaks / auth bypass
   - Correctness bugs and race conditions
   - Breaking API contracts
   - Missing tests on risky logic
   - Duplicated mechanics (suggest `code-structure` extraction)
   - Defer: style nits already covered by lint, subjective naming unless confusing

5. **Output** — markdown report only:

```markdown
# Pragmatic Code Review

**Branch:** …
**Scope:** N files

## Summary
[1-2 sentences]

## Must fix
- [ ] …

## Should fix
- [ ] …

## Notes / praise
- …
```

## Do Not

- Rewrite unrelated code
- Block on preferences that lint already enforces
- Replace this with Greptile — use both: Greptile for line comments, this for holistic review
