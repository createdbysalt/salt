# Database Migration Guide

## Running the Multi-Tenant Migration

The migration `20251228010000_multi_tenant_architecture.sql` transforms Salt Core from single-user to multi-tenant SaaS.

### ⚠️ Important Notes
- This migration **drops and recreates** the `projects`, `tasks`, and `ai_audits` tables
- If you have existing data in these tables, it will be **lost**
- Backup your database before running this migration
- This is intended for fresh installations or early-stage development

---

## Option 1: Supabase CLI (Recommended)

### Prerequisites
```bash
npm install -g supabase
supabase login
```

### Link Your Project
```bash
# If not already linked
supabase link --project-ref YOUR_PROJECT_REF
```

### Run Migration
```bash
# Push to remote Supabase project
supabase db push

# Or reset local database (if using local Supabase)
supabase db reset
```

---

## Option 2: Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open `supabase/migrations/20251228010000_multi_tenant_architecture.sql`
4. Copy the entire contents
5. Paste into SQL Editor
6. Click **Run**

---

## Option 3: Direct SQL (Advanced)

If you have direct database access:

```bash
psql YOUR_DATABASE_URL -f supabase/migrations/20251228010000_multi_tenant_architecture.sql
```

---

## Verification

After running the migration, verify it worked:

### Check Tables Exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'studios',
  'studio_members',
  'clients',
  'client_users',
  'projects',
  'bridge_portals',
  'portal_domains'
);
```

Should return 7 tables.

### Check RLS is Enabled
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'studios',
  'studio_members',
  'clients',
  'client_users',
  'projects',
  'bridge_portals',
  'portal_domains'
);
```

All should have `rowsecurity = true`.

### Test Auto-Studio Creation
1. Sign up a new user via your app
2. Check that a studio was created:

```sql
SELECT 
  studios.id,
  studios.name,
  studios.slug,
  studio_members.role
FROM studios
JOIN studio_members ON studios.id = studio_members.studio_id
WHERE studios.owner_id = 'YOUR_USER_ID';
```

---

## Rollback (If Needed)

If something goes wrong, you can rollback by:

1. Dropping the new tables:
```sql
DROP TABLE IF EXISTS portal_domains CASCADE;
DROP TABLE IF EXISTS bridge_portals CASCADE;
DROP TABLE IF EXISTS client_users CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS studio_members CASCADE;
DROP TABLE IF EXISTS studios CASCADE;
```

2. Restoring the old schema:
```sql
-- Run the original migration: 20251228000500_init_profiles_and_salt_core.sql
```

3. Restore data from backup.

---

## Common Issues

### Issue: "relation already exists"
**Solution**: Drop existing tables first, or use `DROP TABLE IF EXISTS` in migration.

### Issue: "RLS policy error"
**Solution**: Ensure you're testing with an authenticated user. RLS blocks anonymous queries.

### Issue: "Function handle_new_user already exists"
**Solution**: The migration uses `CREATE OR REPLACE FUNCTION`, so this shouldn't happen. If it does, manually drop and recreate.

### Issue: "Permission denied"
**Solution**: Make sure you're running migrations with proper database permissions (service role, not anon key).

---

## Next Steps After Migration

1. **Update your app code** to use the new multi-tenant tables
2. **Test tenant isolation** by creating multiple studios/clients
3. **Verify RLS policies** by trying to access data from different users
4. **Run the app** and test signup → studio creation flow

---

## Development vs Production

### Development (Local Supabase)
```bash
supabase start
supabase db reset  # Applies all migrations
npm run dev
```

### Production (Remote Supabase)
```bash
supabase db push  # Push migrations to remote
# Deploy your app
```

---

## Backup Reminder

**Before running any migration on production:**
1. Take a Supabase snapshot (Dashboard → Database → Backups)
2. Export critical data
3. Test migration on staging first
4. Have a rollback plan ready

---

**Questions?** Check `PHASE_0_COMPLETE.md` or open an issue.

