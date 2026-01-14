# Migration Patterns

**Context:** Patterns for database migrations and Next.js version upgrades.

## Database Migration Patterns

### Creating Safe Migrations

```sql
-- 1. Always use IF NOT EXISTS for tables
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'light',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Always enable RLS immediately
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- 3. Add policies before any data
CREATE POLICY "Users manage own settings"
ON user_settings
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

### Altering Tables Safely

```sql
-- Check column exists before adding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'studios' AND column_name = 'settings'
  ) THEN
    ALTER TABLE studios ADD COLUMN settings JSONB DEFAULT '{}';
  END IF;
END $$;

-- Safe enum addition
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('viewer', 'member', 'admin', 'owner');
  END IF;
END $$;
```

### Data Migrations

```sql
-- Migrate data with transaction safety
BEGIN;

-- Add new column
ALTER TABLE projects ADD COLUMN status_v2 TEXT;

-- Migrate data
UPDATE projects
SET status_v2 = CASE
  WHEN status = 0 THEN 'draft'
  WHEN status = 1 THEN 'active'
  WHEN status = 2 THEN 'completed'
  ELSE 'unknown'
END;

-- Make non-nullable after migration
ALTER TABLE projects ALTER COLUMN status_v2 SET NOT NULL;

-- Drop old column
ALTER TABLE projects DROP COLUMN status;

-- Rename new column
ALTER TABLE projects RENAME COLUMN status_v2 TO status;

COMMIT;
```

### Reversible Migrations

```sql
-- Migration file: 00123_add_user_preferences.sql

-- UP Migration
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- DOWN Migration (in comments for documentation)
-- DROP TABLE IF EXISTS user_preferences;
```

### Index Creation Patterns

```sql
-- Create indexes concurrently to avoid locks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_created_at
ON projects(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_studio_status
ON projects(studio_id, status)
WHERE deleted_at IS NULL;

-- Partial indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_projects
ON projects(studio_id)
WHERE status = 'active' AND deleted_at IS NULL;
```

## Next.js 14 to 15 Migration

### Update Dynamic Route Types

```typescript
// 1. Find all dynamic routes
// Look for: app/**/[param]/page.tsx

// Before (Next.js 14)
interface PageProps {
  params: { id: string };
  searchParams: { [key: string]: string };
}

export default function Page({ params, searchParams }: PageProps) {
  const { id } = params;
  const query = searchParams.q;
}

// After (Next.js 15)
interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string }>;
}

export default async function Page({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { q: query } = await searchParams;
}
```

### Update Metadata Functions

```typescript
// Before (Next.js 14)
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = params;
  return {
    title: `Page ${slug}`,
  };
}

// After (Next.js 15)
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Page ${slug}`,
  };
}
```

### Update API Headers Usage

```typescript
// Before (Next.js 14)
import { headers, cookies } from "next/headers";

export async function GET() {
  const headersList = headers();
  const cookieStore = cookies();

  const auth = headersList.get("authorization");
  const session = cookieStore.get("session");
}

// After (Next.js 15)
import { headers, cookies } from "next/headers";

export async function GET() {
  const headersList = await headers();
  const cookieStore = await cookies();

  const auth = headersList.get("authorization");
  const session = cookieStore.get("session");
}
```

### Update Supabase Server Client

```typescript
// Before (Next.js 14)
import { createClient } from "@/libs/supabase/server";

export default function Page() {
  const supabase = createClient();
}

// After (Next.js 15)
import { createClient } from "@/libs/supabase/server";

export default async function Page() {
  const supabase = await createClient(); // Now async!
}
```

## Tailwind v3 to v4 Migration

### Move Config to CSS

```css
/* Before: tailwind.config.js */
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          500: '#570df8',
          600: '#4506cb',
        }
      }
    }
  }
}

/* After: app/globals.css */
@import "tailwindcss";

@theme {
  --color-brand-500: #570df8;
  --color-brand-600: #4506cb;
}
```

### Update Import Statements

```css
/* Before */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* After */
@import "tailwindcss";
```

### Custom Utilities Migration

```css
/* Before: In @layer utilities */
@layer utilities {
  .btn-primary {
    @apply bg-blue-500 text-white px-4 py-2 rounded;
  }
}

/* After: Using @utility */
@utility btn-primary {
  background-color: theme(colors.blue.500);
  color: white;
  padding: theme(spacing.4) theme(spacing.2);
  border-radius: theme(borderRadius.DEFAULT);
}
```

## Migration Workflow

### 1. Plan Migration

```bash
# Create migration branch
git checkout -b migration/nextjs-15-upgrade

# Document changes needed
touch MIGRATION_CHECKLIST.md
```

### 2. Run Codemods (if available)

```bash
# Next.js codemods
npx @next/codemod@latest next-15

# Update imports automatically
npx jscodeshift -t transforms/update-imports.js app/
```

### 3. Manual Updates

```bash
# Find files to update
grep -r "params\." app/
grep -r "headers()" app/
grep -r "cookies()" app/
grep -r "createClient()" app/

# Update systematically
# Start with one file type at a time
```

### 4. Test Incrementally

```bash
# After each major change
npm run build
npm run type-check

# Fix errors before moving on
```

### 5. Update Tests

```typescript
// Update test files to match new patterns
// Before
const params = { id: "123" };

// After
const params = Promise.resolve({ id: "123" });
```

## Common Migration Pitfalls

### 1. Partial Updates

**Problem:** Updating some files but not others

**Solution:** Use global search/replace with regex:
```bash
# Find all params usage
ag "params\s*:\s*\{" app/

# Find all createClient usage
ag "createClient\(\)" --ts
```

### 2. Type Mismatches

**Problem:** TypeScript errors after migration

**Solution:**
```typescript
// Create type helpers
type AwaitedParams<T> = T extends Promise<infer P> ? P : T;

// Use in components
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams: AwaitedParams<typeof params> = await params;
}
```

### 3. Build-Time vs Runtime

**Problem:** Code works in dev but fails in build

**Solution:** Always test production build:
```bash
npm run build
npm run start
```

## Migration Checklist

### Next.js 15 Upgrade

- [ ] Update package.json dependencies
- [ ] Update all dynamic route params to Promise
- [ ] Add await to all params usage
- [ ] Update generateMetadata functions
- [ ] Add await to headers() calls
- [ ] Add await to cookies() calls
- [ ] Update Supabase createClient() calls
- [ ] Update middleware if needed
- [ ] Fix all TypeScript errors
- [ ] Run build and fix errors
- [ ] Test all routes manually
- [ ] Update tests
- [ ] Update documentation

### Database Migration

- [ ] Write migration SQL
- [ ] Test on local database
- [ ] Add rollback instructions
- [ ] Test rollback locally
- [ ] Apply to staging
- [ ] Verify data integrity
- [ ] Apply to production
- [ ] Monitor for errors
- [ ] Update TypeScript types

## Rollback Procedures

### Code Rollback

```bash
# Revert to previous version
git checkout main
git pull
vercel rollback

# Or revert commit
git revert <commit-hash>
git push
```

### Database Rollback

```sql
-- Keep rollback scripts ready
-- In migration file comments

-- Example: Rollback user_preferences
DROP TABLE IF EXISTS user_preferences CASCADE;

-- Restore from backup if needed
```