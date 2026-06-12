---
allowed-tools: Read, Glob, Grep, Edit, Write, Bash
description: "Execute or resume an existing plan file with understand-first protocol. Detects already-completed steps so a lost session costs nothing."
---

# /plan-run - Execute a Plan File (Resume-Safe)

Twice this month a session died mid-plan ("i had a claude session working on this plan but i exited out of it by accident"). This command makes any plan resumable.

## Arguments

Invoked with: `$ARGUMENTS` — a plan file path. If empty, find candidates and pick the most recent, confirming choice:

```bash
ls -t .cursor/plans/*.md docs/plans/*.md ~/.cursor/plans/*.plan.md 2>/dev/null | head -5
```

## Phase 1 — Understand everything first (no code yet)

1. Read the ENTIRE plan file.
2. Read every file the plan references (specs, briefs, the files-to-modify table).
3. Read the relevant nested CLAUDE.md for areas being touched.

## Phase 2 — Reconcile plan vs reality (the resume step)

The plan's checkboxes may lie — a previous session may have done work without ticking them, or ticked steps that were later reverted. Verify against the codebase:

- For each step, check whether its output already exists (`rg` for the functions/components/migrations it creates, `git log --oneline -10` for related commits).
- Produce a reconciliation table: step | plan says | codebase says | verdict (done / partial / not started).
- Update the plan file's checkboxes to match reality.

## Phase 3 — Execute the remainder

- Work through remaining steps **in order**, using each step's assigned `[tool: ...]` (e.g. `/frontend-design` for UI, `/database migration` for schema).
- Tick each checkbox in the plan file as the step completes — this is what makes the next resume free.
- Stop and report at any step that requires a user action (dashboard config, migration approval, key creation) — say exactly what the user must do, then continue when confirmed.

## Phase 4 — Close out

- Run `pnpm lint` and relevant tests.
- Mark plan Status: Complete.
- Summarize: what was already done when you arrived, what you did, what (if anything) remains for the user.
