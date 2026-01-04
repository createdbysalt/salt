# Database Security & Performance Hardening Runbook

**Last Updated:** January 4, 2026  
**Target:** Production Supabase  
**Migrations:** `20260104000100_security_advisor_fixes_batch_a.sql` + `20260104000200_performance_advisor_fixes_batch_b.sql`

---

## Overview

This runbook applies security and performance fixes identified by Supabase Advisors:

**Security Fixes:**
- ✅ Add RLS policies to `ai_audits` (table was locked with RLS enabled but no policies)
- ✅ Replace `studio_mrr` view with SECURITY INVOKER version (eliminates privilege bypass risk)
- ✅ Lock down function `search_path` on 12 functions (prevents object-shadowing attacks)

**Performance Fixes:**
- ✅ Add missing FK indexes on `tag_assignments` and `project_milestones`
- ✅ Remove duplicate indexes on `tasks` table (reduces storage + write overhead)

---

## Pre-Migration Checklist

### 1. Backup Your Database (REQUIRED)

```bash
# Via Supabase Dashboard
# Settings → Database → Backup → Create new backup

# Or via CLI
npx supabase db dump --db-url "postgresql://postgres.[YOUR-REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres" > backup-security-hardening-$(date +%Y%m%d-%H%M%S).sql
```

**Save backup location:** _____________________________

### 2. Verify Current Database State

```sql
-- Confirm ai_audits has no policies
SELECT COUNT(*) FROM pg_policies WHERE tablename = 'ai_audits';
-- Expected: 0

-- Confirm studio_mrr view exists
SELECT viewname FROM pg_views WHERE viewname = 'studio_mrr';
-- Expected: 1 row

-- Check for active long-running queries (avoid conflicts)
SELECT pid, usename, query_start, state, query
FROM pg_stat_activity
WHERE state = 'active'
  AND query NOT ILIKE '%pg_stat_activity%'
  AND query_start < now() - interval '5 minutes';
-- Expected: 0 rows (or wait for long queries to finish)
```

### 3. Notify Team (Recommended)

**Estimated downtime:** None (zero-downtime migration)  
**Estimated duration:** 2-5 minutes  
**User impact:** None (no breaking changes)

---

## Migration Execution

### BATCH A: Security Fixes (Transaction-safe)

**File:** `supabase/migrations/20260104000100_security_advisor_fixes_batch_a.sql`

**Steps:**

1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `20260104000100_security_advisor_fixes_batch_a.sql`
3. Paste into SQL Editor
4. Click **Run** (will execute as a single transaction)
5. Verify success messages in output:
   - ✅ `Successfully created 3 RLS policies for ai_audits`
   - ✅ `Successfully recreated studio_mrr view as SECURITY INVOKER`
   - ✅ `Successfully set search_path on 12 functions`

**Expected duration:** ~2-5 seconds

**If errors occur:**
- Transaction will auto-rollback
- Review error message
- Check if any object names changed
- Contact database admin if needed

---

### BATCH B: Performance Fixes (CONCURRENT - NO TRANSACTION)

**File:** `supabase/migrations/20260104000200_performance_advisor_fixes_batch_b.sql`

⚠️ **CRITICAL:** Run each statement **separately** (CONCURRENTLY cannot run in transactions)

**Steps:**

#### B1a) Create index on tag_assignments

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tag_assignments_tag_id_studio_id 
  ON public.tag_assignments(tag_id, studio_id);
```

- Click **Run**
- Wait for completion (should be instant, `tag_assignments` is small)
- Verify: No errors

#### B1b) Create index on project_milestones

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_milestones_depends_on 
  ON public.project_milestones(depends_on_milestone_id)
  WHERE depends_on_milestone_id IS NOT NULL;
```

- Click **Run**
- Wait for completion
- Verify: No errors

#### B2a) Drop duplicate index: tasks_project_id_idx

```sql
DROP INDEX CONCURRENTLY IF EXISTS public.tasks_project_id_idx;
```

- Click **Run**
- Wait for completion (~1-2 seconds)
- Verify: Success

#### B2b) Drop duplicate index: tasks_status_idx

```sql
DROP INDEX CONCURRENTLY IF EXISTS public.tasks_status_idx;
```

- Click **Run**
- Wait for completion
- Verify: Success

**Expected total duration:** 5-15 seconds

---

## Post-Migration Verification

### 1. Verify RLS Policies on ai_audits

```sql
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'ai_audits'
ORDER BY policyname;
```

**Expected output:** 3 rows
- `Service role can manage all audits` (ALL, service_role)
- `Studio members can create audits for their projects` (INSERT, authenticated)
- `Studio members can view their project audits` (SELECT, authenticated)

### 2. Test studio_mrr View (as non-superuser)

```sql
-- Should return MRR for studios you have access to
SELECT * FROM public.studio_mrr LIMIT 5;
```

**Expected:** Rows returned (no permission errors)

### 3. Verify Function search_path

```sql
SELECT 
  proname, 
  proconfig 
FROM pg_proc p 
JOIN pg_namespace n ON n.oid = p.pronamespace 
WHERE n.nspname = 'public'
  AND proname IN ('verify_studio_domain', 'cleanup_expired_invoice_tokens', 'auto_activate_client_user')
ORDER BY proname;
```

**Expected:** Each function should have `proconfig` like `{search_path=pg_catalog,public}`

### 4. Verify New Indexes

```sql
-- Check tag_assignments index
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'tag_assignments' 
  AND indexname = 'idx_tag_assignments_tag_id_studio_id';

-- Check project_milestones index
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'project_milestones' 
  AND indexname = 'idx_project_milestones_depends_on';
```

**Expected:** 2 rows total

### 5. Verify Duplicate Indexes Removed

```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'tasks' 
  AND indexname IN ('tasks_project_id_idx', 'tasks_status_idx');
```

**Expected:** 0 rows

### 6. Re-run Supabase Advisors

**Security Advisor:**
- Go to Dashboard → Database → Advisor → Security
- ✅ `ai_audits` RLS warning should be **gone**
- ✅ `studio_mrr` SECURITY DEFINER warning should be **gone**
- ✅ Function search_path warnings should be **reduced** (from 12 to 0)

**Performance Advisor:**
- Go to Dashboard → Database → Advisor → Performance
- ✅ `tag_assignments` unindexed FK warning should be **gone**
- ✅ `project_milestones` unindexed FK warning should be **gone**
- ✅ Duplicate index warnings on `tasks` should be **gone**

---

## Rollback Instructions

### If You Need to Revert Batch A

```sql
BEGIN;

-- Remove ai_audits policies
DROP POLICY IF EXISTS "Studio members can view their project audits" ON public.ai_audits;
DROP POLICY IF EXISTS "Studio members can create audits for their projects" ON public.ai_audits;
DROP POLICY IF EXISTS "Service role can manage all audits" ON public.ai_audits;

-- Revert studio_mrr to old version (SECURITY DEFINER)
DROP VIEW IF EXISTS public.studio_mrr;

CREATE VIEW public.studio_mrr AS
SELECT 
  studio_id,
  SUM(
    CASE
      WHEN interval = 'month'::text THEN amount_cents::numeric / 100.0
      WHEN interval = 'year'::text THEN amount_cents::numeric / 100.0 / 12::numeric
      ELSE 0::numeric
    END
  ) AS mrr_usd,
  COUNT(*) AS active_subscriptions
FROM public.bridge_client_subscriptions
WHERE status = ANY (ARRAY['active'::text, 'trialing'::text])
GROUP BY studio_id;

-- Reset function search_path (NOT RECOMMENDED - leaves vulnerability)
ALTER FUNCTION public.auto_activate_client_user() RESET search_path;
ALTER FUNCTION public.cleanup_expired_invoice_tokens() RESET search_path;
-- (repeat for all 12 functions if needed)

COMMIT;
```

### If You Need to Revert Batch B

```sql
-- Recreate old duplicate indexes
CREATE INDEX CONCURRENTLY tasks_project_id_idx ON public.tasks(project_id);
CREATE INDEX CONCURRENTLY tasks_status_idx ON public.tasks(status);

-- Remove new indexes
DROP INDEX CONCURRENTLY IF EXISTS public.idx_tag_assignments_tag_id_studio_id;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_project_milestones_depends_on;
```

---

## Troubleshooting

### Error: "cannot CREATE INDEX CONCURRENTLY within a transaction block"

**Cause:** You wrapped Batch B in `BEGIN/COMMIT`  
**Fix:** Run each `CREATE INDEX CONCURRENTLY` statement separately without transaction wrapper

### Error: "relation does not exist"

**Cause:** Table/index name typo or already dropped  
**Fix:** Verify object exists with `\d+ table_name` or skip statement

### Error: "duplicate key value violates unique constraint"

**Cause:** Data integrity issue (shouldn't happen with these migrations)  
**Fix:** Investigate data before proceeding

### Performance: Index creation taking too long

**Cause:** Large table or high write load  
**Fix:** `CONCURRENTLY` allows reads/writes to continue. Wait for completion. Check progress:

```sql
SELECT 
  query,
  state,
  wait_event_type,
  wait_event
FROM pg_stat_activity
WHERE query ILIKE '%CREATE INDEX%';
```

---

## Post-Deployment Health Check

### 1. Monitor for Errors (15 minutes)

- Check Next.js server logs for database errors
- Check Supabase logs: Dashboard → Logs → Database
- Watch for any unexpected RLS policy rejections

### 2. Test Key Workflows

- [ ] Studio member can view `/dashboard/clients` (uses `studio_mrr` view)
- [ ] Studio member can view AI audit data (uses `ai_audits` table)
- [ ] Client user can view their projects (uses multi-policy RLS)
- [ ] Create a test tag assignment (uses new composite index)

### 3. Performance Baseline

Run before/after comparison:

```sql
-- Check query performance on affected tables
EXPLAIN ANALYZE
SELECT * FROM public.ai_audits
WHERE project_id IN (
  SELECT id FROM public.projects WHERE studio_id = 'YOUR_STUDIO_ID'
)
LIMIT 10;

-- Should show index usage on new covering indexes
EXPLAIN ANALYZE
SELECT * FROM public.tag_assignments
WHERE tag_id = 'some-tag-id' AND studio_id = 'YOUR_STUDIO_ID';
```

---

## Cost Impact

**Expected changes:**
- **Storage:** -100KB to -500KB (removed duplicate indexes on `tasks`)
- **Storage:** +50KB to +200KB (new indexes on `tag_assignments`, `project_milestones`)
- **Compute:** Slight improvement (fewer indexes to maintain on writes)
- **Query performance:** Faster JOINs on `tag_assignments`, faster milestone dependency queries

**Net impact:** Minimal cost change, better performance

---

## Security Impact

**Risk Level:** ✅ **LOW** (Security improvements only, no data exposure)

**Before:**
- ❌ `ai_audits` table unusable for authenticated users (RLS locked with no policies)
- ⚠️ `studio_mrr` view could bypass RLS on `bridge_client_subscriptions` (ran as `postgres` role)
- ⚠️ Functions vulnerable to search_path shadowing attacks

**After:**
- ✅ `ai_audits` secured with proper studio-scoped RLS policies
- ✅ `studio_mrr` respects caller's permissions (SECURITY INVOKER)
- ✅ All functions protected from schema manipulation attacks

---

## Timeline

**Total estimated time:** 10-15 minutes

1. **Pre-flight checks:** 2 minutes
2. **Backup creation:** 1-2 minutes (auto)
3. **Batch A execution:** 5-10 seconds
4. **Batch B execution:** 5-20 seconds (depends on table sizes)
5. **Verification:** 3-5 minutes
6. **Health monitoring:** 15 minutes (passive)

---

## Success Criteria

- [x] Database backup created and saved
- [ ] Batch A migration completed without errors
- [ ] Batch B migration completed without errors
- [ ] All verification queries return expected results
- [ ] Security Advisor shows 3+ fewer warnings
- [ ] Performance Advisor shows 4+ fewer warnings
- [ ] No application errors in 15-minute monitoring window
- [ ] Key workflows tested and working

---

## Emergency Contacts

**If critical issues arise:**
1. Take immediate backup snapshot via Dashboard
2. Run rollback SQL (see Rollback Instructions above)
3. Check Supabase status page: https://status.supabase.com
4. Contact: [Your DBA/DevOps lead]

---

## Notes for Future Maintenance

**Remaining Advisor Warnings (Lower Priority):**

1. **Auth RLS InitPlan warnings** (40+ occurrences):
   - Many policies use `auth.uid()` without `(select ...)` wrapper
   - Impact: Slight performance overhead at scale (re-evaluates per row)
   - Fix: Gradually update to `(select auth.uid())` in future migrations
   - Priority: LOW (won't cause errors, just suboptimal performance)

2. **Multiple Permissive Policies** (20+ tables):
   - Many tables have 2-3 policies per action (e.g., studio + client access)
   - Impact: Postgres evaluates all permissive policies (slight overhead)
   - Fix: Consider consolidating into single policies with OR conditions
   - Priority: LOW (performance impact minimal until very high scale)

3. **Unused Indexes** (50+ indexes):
   - Many indexes haven't been used yet (new features, low data volume)
   - Impact: Slight write overhead, storage cost
   - Fix: Monitor over 30-60 days, drop truly unused indexes
   - Priority: LOW (wait for production usage patterns to emerge)

4. **Auth Leaked Password Protection** (disabled):
   - Supabase Auth not checking HaveIBeenPwned.org for compromised passwords
   - Impact: Users can use known-compromised passwords
   - Fix: Enable in Dashboard → Authentication → Settings
   - Priority: MEDIUM (security best practice)

**Recommendation:** Schedule next hardening pass in 30-60 days after production usage data accumulates.

---

## Related Documentation

- [MIGRATION_GUIDE.md](/Users/gabriellamartins/Documents/GitHub/SALT/salt-core/MIGRATION_GUIDE.md) - General migration instructions
- [DATABASE_BACKUP_GUIDE.md](/Users/gabriellamartins/Documents/GitHub/SALT/salt-core/DATABASE_BACKUP_GUIDE.md) - Backup procedures
- [Supabase Database Linter Docs](https://supabase.com/docs/guides/database/database-linter) - Advisor reference
- [Supabase RLS Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) - RLS best practices

