# 🚀 Quick Deploy: Database Hardening Migrations

**Ready to deploy?** Follow these steps in your Supabase Dashboard SQL Editor:

---

## ⚡ 30-Second Deploy Guide

### Step 1: Backup (2 min)
Dashboard → Settings → Database → Backup → **Create new backup**

### Step 2: Batch A - Security (30 sec)
1. Open file: `supabase/migrations/20260104000100_security_advisor_fixes_batch_a.sql`
2. Copy entire contents
3. Paste into SQL Editor
4. Click **Run**
5. ✅ Verify success messages appear

### Step 3: Batch B - Performance (2 min)
1. Open file: `supabase/migrations/20260104000200_performance_advisor_fixes_batch_b.sql`
2. Run each statement **separately** (4 statements total):
   - `CREATE INDEX CONCURRENTLY` (×2)
   - `DROP INDEX CONCURRENTLY` (×2)
3. Wait for each to complete before running next

### Step 4: Verify (1 min)
```sql
-- Quick check: Should return 3 policies
SELECT COUNT(*) FROM pg_policies WHERE tablename = 'ai_audits';

-- Quick check: Should return 2 new indexes
SELECT COUNT(*) FROM pg_indexes 
WHERE indexname IN ('idx_tag_assignments_tag_id_studio_id', 'idx_project_milestones_depends_on');

-- Quick check: Should return 0 (duplicates removed)
SELECT COUNT(*) FROM pg_indexes 
WHERE tablename = 'tasks' 
  AND indexname IN ('tasks_project_id_idx', 'tasks_status_idx');
```

---

## 📊 What Gets Fixed

| Issue | Fix | Impact |
|-------|-----|--------|
| `ai_audits` locked (no policies) | Added 3 RLS policies | Table now usable ✅ |
| `studio_mrr` bypass risk | SECURITY INVOKER view | Enforces RLS ✅ |
| 12 functions vulnerable | Set search_path | Blocks attacks ✅ |
| Missing FK indexes | Added 2 indexes | Faster queries ✅ |
| Duplicate indexes | Removed 2 indexes | Less overhead ✅ |

---

## 🎯 Expected Results

**Security Advisor:** 4 fewer critical warnings  
**Performance Advisor:** 5 fewer warnings  
**Query performance:** 10-20% faster on tag/milestone operations  
**Storage:** ~50-300KB reduction (net)  
**Downtime:** Zero ⚡

---

## 🔧 If Something Goes Wrong

**Batch A fails?** → Auto-rollback (transaction), safe to retry  
**Batch B fails?** → Each index is independent, safe to skip failed ones  
**Need full rollback?** → See rollback SQL in `docs/database/DATABASE_HARDENING_RUNBOOK.md`

---

## 📚 Full Documentation

- **Runbook:** [docs/database/DATABASE_HARDENING_RUNBOOK.md](../docs/database/DATABASE_HARDENING_RUNBOOK.md) (detailed instructions)
- **Summary:** [docs/database/DATABASE_HARDENING_SUMMARY.md](../docs/database/DATABASE_HARDENING_SUMMARY.md) (full analysis)
- **Migration Guide:** [docs/migrations/MIGRATION_GUIDE.md](../docs/migrations/MIGRATION_GUIDE.md) (updated with hardening section)

---

**Ready?** 🚀 Start with Step 1 (Backup) above!

