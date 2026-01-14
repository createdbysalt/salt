# Deployment Guide

**Context:** Step-by-step deployment procedures for Salt Core.

## Quick Deploy: Database Hardening Migrations

### Prerequisites

1. Access to Supabase Dashboard
2. SQL Editor permissions
3. ~5 minutes for deployment

### Deployment Steps

#### Step 1: Create Backup (2 min)

Navigate to: Dashboard → Settings → Database → Backup → **Create new backup**

Always backup before migrations. See [database-backup.md](./database-backup.md) for detailed procedures.

#### Step 2: Apply Security Fixes (30 sec)

1. Open migration file: `supabase/migrations/20260104000100_security_advisor_fixes_batch_a.sql`
2. Copy entire contents
3. Paste into SQL Editor
4. Click **Run**
5. Verify success messages appear

This batch fixes:
- `ai_audits` RLS policies (adds 3 policies)
- `studio_mrr` SECURITY INVOKER view
- Function search_path vulnerabilities (12 functions)

#### Step 3: Apply Performance Fixes (2 min)

Run each statement **separately** from `supabase/migrations/20260104000200_performance_advisor_fixes_batch_b.sql`:

```sql
-- 1. Create index on tag_assignments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tag_assignments_tag_id_studio_id
  ON public.tag_assignments(tag_id, studio_id);

-- 2. Create index on project_milestones
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_milestones_depends_on
  ON public.project_milestones(depends_on_milestone_id)
  WHERE depends_on_milestone_id IS NOT NULL;

-- 3. Drop duplicate index: tasks_project_id_idx
DROP INDEX CONCURRENTLY IF EXISTS public.tasks_project_id_idx;

-- 4. Drop duplicate index: tasks_status_idx
DROP INDEX CONCURRENTLY IF EXISTS public.tasks_status_idx;
```

**Important:** Wait for each statement to complete before running the next.

#### Step 4: Verify Deployment

Run verification queries:

```sql
-- Should return 3 policies
SELECT COUNT(*) FROM pg_policies WHERE tablename = 'ai_audits';

-- Should return 2 new indexes
SELECT COUNT(*) FROM pg_indexes
WHERE indexname IN ('idx_tag_assignments_tag_id_studio_id', 'idx_project_milestones_depends_on');

-- Should return 0 (duplicates removed)
SELECT COUNT(*) FROM pg_indexes
WHERE tablename = 'tasks'
  AND indexname IN ('tasks_project_id_idx', 'tasks_status_idx');
```

### Expected Results

| Metric | Before | After | Impact |
|--------|--------|-------|--------|
| Security Warnings | 16+ | 12 | -4 critical |
| Performance Warnings | 10+ | 5 | -5 warnings |
| Query Performance | Baseline | +10-20% | Tag/milestone ops |
| Storage | Baseline | -50-300KB | Removed duplicates |
| Downtime | N/A | Zero | No interruption |

### Rollback Procedures

**If Batch A fails:**
- Transaction auto-rollback occurs
- Safe to retry immediately
- Check error message for details

**If Batch B fails:**
- Each index operation is independent
- Safe to skip failed statements
- Continue with remaining operations

**Full rollback SQL available in:** [database-hardening.md](./database-hardening.md)

### Post-Deployment

1. **Monitor for 15 minutes:**
   - Check application logs for database errors
   - Verify key user workflows function normally
   - Watch Supabase Dashboard logs

2. **Test key features:**
   - Studio member dashboard access
   - Client portal access
   - AI audit functionality
   - Tag assignments

3. **Re-run Supabase Advisors:**
   - Security Advisor should show 4 fewer warnings
   - Performance Advisor should show 5 fewer warnings

### Related Documentation

- [Database Hardening Details](./database-hardening.md) - Full runbook with technical details
- [Database Backup Guide](./database-backup.md) - Backup procedures
- [Migration Patterns](./migration-patterns.md) - General migration guidelines