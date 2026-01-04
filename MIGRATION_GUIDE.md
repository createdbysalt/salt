# Migration Guide: Applying Relationship Intelligence Updates

## ⚠️ Important: Current Status

The codebase has been updated with relationship intelligence features, but **the database migrations have not been applied to your live Supabase database yet**. The code is currently running in **backward-compatible mode**, which means:

- ✅ The app will still work with the old schema
- ⚠️ New features (meetings, milestones, health scores) will be gracefully skipped  
- ✅ Once migrations are applied, all features will activate automatically

## Quick Fix for Current Error

The error you're seeing is because the new database tables don't exist yet. **The code has been updated to handle this gracefully**. Refresh your page and the error should be gone. The app will work with reduced functionality until migrations are applied.

## Step 1: Backup Your Database

Before applying migrations, **always backup your production database**:

```bash
# Via Supabase Dashboard
# Settings → Database → Backup → Create new backup

# Or via CLI
npx supabase db dump --db-url "postgresql://..." > backup-$(date +%Y%m%d).sql
```

## Step 2: Review Migration Files

All new migrations are in `supabase/migrations/`:

### Phase 0: Reconciliation (Required First)
1. `20260104000000_reconcile_tags_constraints.sql` - Allow 'task' type in tags
2. `20260104000001_reconcile_tasks_urgent_fields.sql` - Add is_urgent, revenue_blocker
3. `20260104000002_reconcile_tasks_studio_id.sql` - Backfill and enforce studio_id

### Phase 1: Meetings & Calendar
4. `20260104000003_create_client_meetings.sql` - Core meetings table
5. `20260104000004_create_calendar_connections.sql` - OAuth token storage
6. `20260104000005_create_meeting_templates.sql` - Reusable meeting presets

### Phase 2: Project Intelligence
7. `20260104000006_create_project_milestones.sql` - Milestone tracking
8. `20260104000007_link_tasks_to_milestones.sql` - Add milestone_id to tasks
9. `20260104000008_add_client_intelligence_columns.sql` - Health score columns

## Step 3: Apply Migrations

### Recommended: Via Supabase Dashboard SQL Editor

1. Go to your Supabase project → **SQL Editor**
2. For each migration file (in order), copy the entire SQL content and run it
3. Verify no errors before proceeding to the next migration

**This is the safest approach for production databases.**

### Alternative: Via Supabase CLI

```bash
# Link to your project
npx supabase link --project-ref YOUR_PROJECT_REF

# Apply each migration manually via SQL Editor, OR
# If migration history is clean:
npx supabase db push
```

## Step 4: Verify Migrations

```sql
-- Check new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('client_meetings', 'calendar_connections', 'meeting_templates', 'project_milestones');

-- Should return 4 rows

-- Check new columns on clients
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'clients' 
  AND column_name IN ('status', 'contact_name', 'last_contact_at');

-- Should return 3 rows
```

## Step 5: Configure Environment Variables

Add to `.env.local` and your deployment platform:

```bash
# Google Calendar (optional, for calendar integration)
GOOGLE_CALENDAR_CLIENT_ID=your_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_client_secret

# Token encryption (required if using calendar)
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
CALENDAR_TOKEN_ENCRYPTION_KEY=your_64_char_hex_key

# Your app URL
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Step 6: Test Features

After applying migrations:

1. Visit `/dashboard/clients` - should show health scores
2. Visit `/dashboard/meetings` - should allow creating meetings
3. Visit `/dashboard/projects` - should show milestone options

## Rollback (If Needed)

```sql
-- Drop new tables
DROP TABLE IF EXISTS public.project_milestones CASCADE;
DROP TABLE IF EXISTS public.meeting_templates CASCADE;
DROP TABLE IF EXISTS public.calendar_connections CASCADE;
DROP TABLE IF EXISTS public.client_meetings CASCADE;

-- Remove new columns
ALTER TABLE public.clients 
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS contact_name,
  DROP COLUMN IF EXISTS last_contact_at,
  DROP COLUMN IF EXISTS archived_at;

ALTER TABLE public.tasks DROP COLUMN IF EXISTS milestone_id;
```

## Common Issues

### "relation client_meetings does not exist"
- **Cause**: Migrations not applied
- **Solution**: Code is now defensive and will skip this feature. Apply migrations when ready.

### "column does not exist"
- **Cause**: Migration 20260104000008 not applied
- **Solution**: Code falls back to old JSONB fields. Apply migration for full functionality.

## Post-Migration Checklist

- [ ] All 9 migrations applied
- [ ] New tables verified (4 tables)
- [ ] New columns verified (clients table)
- [ ] No errors on `/dashboard/clients`
- [ ] No errors on `/dashboard/meetings`
- [ ] No errors on `/dashboard/projects`

## Security & Performance Hardening (January 2026)

After the relationship intelligence migrations, we identified and fixed security/performance issues via Supabase Advisors:

### Additional Migrations (Applied via MCP)
10. `20260104000100_security_advisor_fixes_batch_a.sql` - RLS policies, view security, function hardening
11. `20260104000200_performance_advisor_fixes_batch_b.sql` - Index optimization (concurrent)

**See [DATABASE_HARDENING_RUNBOOK.md](DATABASE_HARDENING_RUNBOOK.md) for detailed execution instructions.**

### Key Fixes:
- ✅ Added RLS policies to `ai_audits` table (was locked with no policies)
- ✅ Replaced `studio_mrr` view with SECURITY INVOKER version (eliminates privilege bypass)
- ✅ Set immutable `search_path` on 12 functions (prevents shadowing attacks)
- ✅ Added missing FK indexes on `tag_assignments`, `project_milestones`
- ✅ Removed duplicate indexes on `tasks` table

---

## Need Help?

The code is designed to work both before and after migrations, so you can apply them at your convenience. All new features will automatically activate once the database schema is updated.
