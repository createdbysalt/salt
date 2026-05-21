---
name: database-keeper
description: Supabase schema exploration, query analysis, RLS audits, and migration drafting for Salt. Use when the user says qdb, database explore, RLS audit, or migration draft. Read-only by default; never auto-execute DDL.
---

# Database Keeper (Supabase)

Port of `.claude/commands/database.md` for Cursor. Agent: `.claude/agents/database-keeper.md`.

## Before anything

1. Read **`supabase/CLAUDE.md`**
2. Skim recent files in `supabase/migrations/`
3. Use **Supabase MCP** tools when available (`list_tables`, `execute_sql`, etc.)

## Modes (parse user intent)

| Mode | Trigger examples | Tier |
|------|------------------|------|
| **explore** | "how is X stored", `qdb explore clients` | 1 read-only |
| **analyze** | "analyze this query", EXPLAIN | 1 read-only |
| **audit** | `qdb audit`, RLS audit | 1 read-only |
| **migration** | "draft migration for …" | 2 draft only |

## explore

- List tables and relationships for the topic
- Document columns, FKs, indexes, RLS pattern
- Output structured schema summary (tables, relationships, RLS)

## analyze

- `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)` on the query (read-only)
- Flag sequential scans, RLS overhead, missing indexes
- Suggest concrete index or query changes

## audit

```sql
-- RLS enabled?
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Policies
SELECT tablename, policyname, cmd, qual FROM pg_policies WHERE schemaname = 'public';
```

Report: critical (no RLS / `USING (true)`), medium (missing DELETE policy), low (perf), passed.

## migration (Tier 2 — never auto-run)

**NEVER** execute DDL. **NEVER** call `apply_migration`.

1. Follow patterns in `supabase/migrations/`
2. Draft SQL with: `studio_id` scoping, RLS, indexes on tenant columns, `ON DELETE CASCADE`, `updated_at` trigger
3. Write draft to `supabase/migrations/` only after human review — or scratch under `docs/plans/` for review first
4. Human runs: `pnpm dlx supabase db push`

## Non-negotiable (from supabase/CLAUDE.md)

- Never disable RLS on tenant tables
- Always tenant-scope (`studio_id` / `client_id`)
- Index tenant columns
- FKs to tenant parents use `ON DELETE CASCADE`

## Claude Code

Slash command: `/database explore "…"` | `/database audit` | `/database migration "…"`
