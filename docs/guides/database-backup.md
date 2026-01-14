# Database Backup Guide

## 🛡️ How to Backup Your Supabase Database

Before applying migrations, it's critical to backup your database. Here are your options:

---

## Method 1: Supabase Dashboard (Recommended - Easiest)

### Steps:
1. Go to your Supabase project at https://supabase.com/dashboard/project/YOUR_PROJECT_ID
2. Click on **Database** in the left sidebar
3. Click on **Backups** tab
4. Click the **"Create Backup"** button
5. Wait for the backup to complete (usually 1-2 minutes)
6. You'll see the backup listed with a timestamp

**Pros:**
- ✅ One-click solution
- ✅ Stored in Supabase's secure infrastructure
- ✅ Easy to restore if needed

**Restore if needed:**
- Go to Backups tab → Click the 3 dots → "Restore"

---

## Method 2: Command Line Export (Full Control)

### Using Supabase CLI:

```bash
# First, make sure you're logged in
npx supabase login

# Link to your project (if not already linked)
npx supabase link --project-ref YOUR_PROJECT_REF

# Create a local backup
npx supabase db dump -f backup-$(date +%Y%m%d-%H%M%S).sql

# This creates a file like: backup-20260104-143022.sql
```

**Pros:**
- ✅ Full local copy you control
- ✅ Can version control in git (if DB is small)
- ✅ Easy to inspect SQL

---

## Method 3: Direct PostgreSQL Dump (Advanced)

If you have your database credentials:

```bash
# Get connection string from: Supabase Dashboard → Settings → Database → Connection String (Direct)

# Export entire database
pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres" > backup-$(date +%Y%m%d).sql

# Export schema only (no data)
pg_dump --schema-only "postgresql://..." > backup-schema-only.sql

# Export data only
pg_dump --data-only "postgresql://..." > backup-data-only.sql
```

**Pros:**
- ✅ Most control over what gets backed up
- ✅ Can exclude specific tables
- ✅ Industry-standard tool

---

## What Gets Backed Up?

All methods backup:
- ✅ All tables and data
- ✅ Database schema (columns, types, constraints)
- ✅ Indexes
- ✅ RLS policies
- ✅ Functions and triggers
- ✅ Views

**Note:** Supabase Storage files (like uploaded images) are separate and need to be backed up differently if you use them.

---

## Verify Your Backup

After creating a backup, verify it's there:

### Dashboard Method:
- Check the Backups tab shows your new backup

### CLI Method:
```bash
# Check the file exists and has content
ls -lh backup-*.sql
# Should show file size (should be > 0 bytes)

# Quick peek at the contents
head -20 backup-*.sql
# Should show SQL commands
```

---

## How to Restore (If Needed)

### From Dashboard Backup:
1. Go to Database → Backups
2. Find your backup
3. Click 3 dots → "Restore"
4. Confirm (this will replace current database)

### From CLI Backup:
```bash
# This will REPLACE your current database!
psql "postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres" < backup-20260104.sql
```

⚠️ **Warning:** Restoring overwrites your current database!

---

## Best Practices

1. **Before migrations:** Always backup first
2. **After migrations:** Create another backup (the "working state")
3. **Regular backups:** Consider daily automated backups for production
4. **Test restores:** Occasionally test restoring to a test project to ensure backups work
5. **Keep multiple:** Don't delete old backups immediately

---

## Storage Limits

- **Free tier:** 1 backup retained for 7 days
- **Pro tier:** 7 backups retained for 30 days
- **CLI backups:** Unlimited (your local storage)

---

## Quick Decision Guide

**Just need safety before migrations?**
→ Use Method 1 (Dashboard) - takes 2 minutes

**Want a local copy you can inspect?**
→ Use Method 2 (CLI) - takes 5 minutes

**Need fine control over what's backed up?**
→ Use Method 3 (pg_dump) - takes 10 minutes

**Safest approach?**
→ Do BOTH Method 1 AND Method 2 for redundancy!

---

## Ready to Apply Migrations?

Once you have a backup, you can safely apply migrations. See [Migration Patterns](./migration-patterns.md) for the next steps.

**Pro tip:** Take a screenshot of your backup confirmation - it's quick proof it was done!