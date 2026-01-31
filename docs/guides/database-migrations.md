# Database Migrations Guide

**Context:** Comprehensive guide for applying Salt Core database migrations.

## Current Migration Status

Salt Core includes relationship intelligence features requiring database migrations. The application operates in **backward-compatible mode** until migrations are applied.

### Features Awaiting Migration

- **Client Meetings** - Schedule and track client interactions
- **Calendar Integration** - Connect Google Calendar for automated scheduling
- **Project Milestones** - Track project progress with dependencies
- **Client Health Scores** - Monitor client relationship health

## Pre-Migration Requirements

### 1. Database Backup

**Critical:** Always backup before migrations. See [database-backup.md](./database-backup.md) for detailed procedures.

```bash
# Quick backup via Dashboard
Settings → Database → Backup → Create new backup

# CLI backup
npx supabase db dump --db-url "postgresql://..." > backup-$(date +%Y%m%d).sql
```

### 2. Environment Variables

Add these to `.env.local` and your deployment platform:

```bash
# Google Calendar (optional)
GOOGLE_CALENDAR_CLIENT_ID=your_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_client_secret

# Token encryption (required if using calendar)
CALENDAR_TOKEN_ENCRYPTION_KEY=your_64_char_hex_key

# App URL
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Migration Phases

### Phase 0: Schema Reconciliation (Required First)

These migrations align the existing schema with code expectations:

1. **`20260104000000_reconcile_tags_constraints.sql`**
   - Allows 'task' type in tags enum
   - Required for task management features

2. **`20260104000001_reconcile_tasks_urgent_fields.sql`**
   - Adds `is_urgent` and `revenue_blocker` columns
   - Enables priority task filtering

3. **`20260104000002_reconcile_tasks_studio_id.sql`**
   - Backfills and enforces `studio_id` on tasks
   - Ensures proper tenant isolation

### Phase 1: Meetings & Calendar

Core meeting infrastructure:

4. **`20260104000003_create_client_meetings.sql`**
   - Creates `client_meetings` table
   - Stores meeting details, attendees, outcomes

5. **`20260104000004_create_calendar_connections.sql`**
   - OAuth token storage for calendar providers
   - Encrypted refresh tokens

6. **`20260104000005_create_meeting_templates.sql`**
   - Reusable meeting configurations
   - Default agendas and settings

### Phase 2: Project Intelligence

Enhanced project tracking:

7. **`20260104000006_create_project_milestones.sql`**
   - Milestone definitions with dependencies
   - Progress tracking

8. **`20260104000007_link_tasks_to_milestones.sql`**
   - Connects tasks to milestones
   - Enables milestone completion tracking

9. **`20260104000008_add_client_intelligence_columns.sql`**
   - Client health score fields
   - Contact tracking columns

### Phase 3: Security & Performance Hardening

Security and performance optimizations:

10. **`20260104000100_security_advisor_fixes_batch_a.sql`**
    - RLS policies for `ai_audits`
    - SECURITY INVOKER views
    - Function search_path hardening

11. **`20260104000200_performance_advisor_fixes_batch_b.sql`**
    - Missing foreign key indexes
    - Remove duplicate indexes

## Step-by-Step Application

### Method 1: Supabase Dashboard (Recommended)

1. **Open SQL Editor**
   ```
   Your Project → SQL Editor
   ```

2. **Apply Phase 0 (Reconciliation)**
   - Copy contents of each file (000000, 000001, 000002)
   - Paste and run one at a time
   - Verify success before proceeding

3. **Apply Phase 1 (Meetings)**
   - Apply migrations 000003, 000004, 000005
   - Each in a separate transaction

4. **Apply Phase 2 (Intelligence)**
   - Apply migrations 000006, 000007, 000008
   - Verify new columns exist

5. **Apply Phase 3 (Hardening)**

   **Batch A** (000100):
   - Copy entire file
   - Run as single transaction

   **Batch B** (000200) - IMPORTANT:
   - Run each statement SEPARATELY
   - Cannot use transactions with CONCURRENT operations
   ```sql
   -- Run these one at a time:
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tag_assignments_tag_id_studio_id...
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_milestones_depends_on...
   DROP INDEX CONCURRENTLY IF EXISTS public.tasks_project_id_idx;
   DROP INDEX CONCURRENTLY IF EXISTS public.tasks_status_idx;
   ```

### Method 2: CLI Application

```bash
# Link to project
npx supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations
npx supabase db push

# Or reset in development
npx supabase db reset
```

## Verification Queries

### Basic Health Check

```sql
-- New tables (should return 4)
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'client_meetings',
    'calendar_connections',
    'meeting_templates',
    'project_milestones'
  );

-- New client columns (should return 3)
SELECT COUNT(*) FROM information_schema.columns
WHERE table_name = 'clients'
  AND column_name IN ('status', 'contact_name', 'last_contact_at');

-- AI audits policies (should return 3)
SELECT COUNT(*) FROM pg_policies
WHERE tablename = 'ai_audits';

-- New indexes (should return 2)
SELECT COUNT(*) FROM pg_indexes
WHERE indexname IN (
  'idx_tag_assignments_tag_id_studio_id',
  'idx_project_milestones_depends_on'
);
```

### Feature Verification

Test these pages after migration:

- `/dashboard/clients` - Health scores visible
- `/dashboard/meetings` - Meeting creation works
- `/dashboard/projects` - Milestone features active
- `/dashboard/insights` - Analytics functioning

## Rollback Procedures

### Emergency Full Rollback

```sql
BEGIN;

-- Phase 2 rollback
ALTER TABLE tasks DROP COLUMN IF EXISTS milestone_id;
DROP TABLE IF EXISTS project_milestones CASCADE;
ALTER TABLE clients
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS contact_name,
  DROP COLUMN IF EXISTS last_contact_at,
  DROP COLUMN IF EXISTS archived_at;

-- Phase 1 rollback
DROP TABLE IF EXISTS meeting_templates CASCADE;
DROP TABLE IF EXISTS calendar_connections CASCADE;
DROP TABLE IF EXISTS client_meetings CASCADE;

-- Phase 0 rollback
ALTER TABLE tasks
  DROP COLUMN IF EXISTS is_urgent,
  DROP COLUMN IF EXISTS revenue_blocker;

COMMIT;
```

### Hardening Rollback

See [database-hardening.md](./database-hardening.md) for detailed rollback procedures.

## Troubleshooting

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "relation client_meetings does not exist" | Phase 1 not applied | Run migrations 000003-000005 |
| "column clients.status does not exist" | Phase 2 incomplete | Run migration 000008 |
| "cannot CREATE INDEX CONCURRENTLY in transaction" | Wrong execution method | Run each statement separately |
| "permission denied for table" | Missing RLS policy | Check Phase 3 migrations |

### Graceful Degradation

The codebase handles missing tables/columns gracefully:

```typescript
// Code automatically falls back when tables don't exist
try {
  const meetings = await supabase.from('client_meetings').select('*');
} catch (error) {
  // Falls back to limited functionality
  console.log('Meetings feature not yet available');
}
```

### State Recovery

Check migration status:

```sql
-- View applied migrations
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC;

-- Manually mark as complete (use cautiously)
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260104000003');
```

## Post-Migration Checklist

- [ ] All 11 migrations applied successfully
- [ ] Verification queries return expected counts
- [ ] No errors on dashboard pages
- [ ] Calendar integration configured (if using)
- [ ] Team notified of new features
- [ ] Monitoring for 24 hours

## Migration Timeline

- **Phase 0-2**: ~5 minutes total
- **Phase 3 Batch A**: ~30 seconds
- **Phase 3 Batch B**: ~2 minutes (concurrent indexes)
- **Verification**: ~2 minutes
- **Total**: ~10 minutes

## AI-Assisted Migration Authoring

Salt Core includes a `database-keeper` agent that can help draft migrations following established patterns.

### Using the Database Keeper

```bash
# Explore existing schema patterns
/database explore "How are notifications stored?"

# Audit RLS policies before migration
/database audit

# Draft a new migration (Tier 2 - human review required)
/database migration "Add client notifications table"
```

### Tiered Permission Model

| Tier | Operations | Description |
|------|------------|-------------|
| **1 (Default)** | explore, analyze, audit | Read-only schema discovery |
| **2 (Explicit)** | migration | Drafts SQL for human review |
| **3 (Never)** | production write | Human-only |

### Migration Workflow with Agent

1. **Research patterns**: `/database explore "similar tables"`
2. **Draft migration**: `/database migration "description"`
3. **Review output**: Check `.claude/ralph/migrations/draft-*.sql`
4. **Move to migrations**: Copy to `supabase/migrations/` with timestamp
5. **Apply**: `pnpm dlx supabase db push`

### Audit Logging

All agent database operations are logged to `agent_audit_log` for security auditing:

```sql
SELECT agent_id, operation_type, target_tables, result_status, created_at
FROM agent_audit_log
WHERE agent_id = 'database-keeper'
ORDER BY created_at DESC;
```

See `supabase/CLAUDE.md` Section 11 for complete agent integration details.

---

## Related Documentation

- [Database Backup Guide](./database-backup.md) - Backup procedures
- [Database Hardening](./database-hardening.md) - Security details
- [Deployment Guide](./deployment.md) - Production deployment
- [Migration Patterns](./migration-patterns.md) - General patterns