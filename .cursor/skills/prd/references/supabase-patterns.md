# Supabase Database Patterns

Database story patterns for Supabase migrations, RLS policies, and type generation.

---

## Core Principles

1. **All migrations belong in Foundation stream**
2. **RLS policies immediately after table creation**
3. **Type generation after all migrations**
4. **Use snake_case for database, camelCase for TypeScript**

---

## Migration Story Template

```json
{
  "id": "S1-001",
  "title": "Create [feature] database schema",
  "description": "Add all tables needed for [feature] system",
  "acceptanceCriteria": [
    "Create [table_name] table with fields: id, [columns], created_at",
    "Create [related_table] table with foreign key to [table_name]",
    "Add indexes on foreign keys and commonly queried columns",
    "Migration runs without errors",
    "Typecheck passes after type generation"
  ],
  "implementationSteps": [
    "1. Read docs/architecture/database-schema.md for conventions",
    "2. Create migration file: supabase/migrations/YYYYMMDDHHMMSS_add_[feature]_tables.sql",
    "3. Define tables with snake_case column names",
    "4. Add primary keys as UUID with gen_random_uuid()",
    "5. Add created_at with default now()",
    "6. Add foreign key constraints",
    "7. Add indexes on foreign keys",
    "8. Run: pnpm dlx supabase db push"
  ],
  "doNotChange": [
    "Existing migration files",
    "profiles table schema",
    "Auth-related tables"
  ]
}
```

---

## RLS Policy Story Template

```json
{
  "id": "S1-002",
  "title": "Add RLS policies for [feature] tables",
  "description": "Secure [feature] tables with row-level security",
  "acceptanceCriteria": [
    "Enable RLS on [table_name]",
    "SELECT policy: authenticated users can read own/studio data",
    "INSERT policy: authenticated users can create own/studio data",
    "UPDATE policy: users can update own/studio data only",
    "DELETE policy: users can delete own/studio data only",
    "Typecheck passes"
  ],
  "implementationSteps": [
    "1. Create migration: supabase/migrations/YYYYMMDDHHMMSS_add_[feature]_rls.sql",
    "2. Enable RLS: ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY",
    "3. Create SELECT policy with studio/user filtering",
    "4. Create INSERT policy with auth.uid() check",
    "5. Create UPDATE policy matching INSERT",
    "6. Create DELETE policy matching UPDATE",
    "7. Run: pnpm dlx supabase db push"
  ],
  "doNotChange": [
    "Existing RLS policies",
    "Auth policies"
  ]
}
```

---

## Type Generation Story Template

```json
{
  "id": "S1-003",
  "title": "Generate TypeScript types for [feature]",
  "description": "Update database types after schema changes",
  "acceptanceCriteria": [
    "Types regenerated from database schema",
    "New tables appear in Database type",
    "Typecheck passes across codebase"
  ],
  "implementationSteps": [
    "1. Ensure all migrations have run successfully",
    "2. Run: pnpm dlx supabase gen types typescript --local > app/_lib/supabase/database.types.ts",
    "3. Run: pnpm typecheck to verify no breaks"
  ],
  "doNotChange": []
}
```

---

## Common Table Patterns

### Standard Fields

Every table should have:

```sql
CREATE TABLE table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- domain fields here
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

### Studio Tenancy (Multi-Tenant Pattern)

Multi-tenant tables need studio_id with proper RLS:

```sql
CREATE TABLE feature_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  -- other fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Index tenant column
CREATE INDEX feature_items_studio_id_idx ON feature_items(studio_id);

-- Enable RLS
ALTER TABLE feature_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy using studio_members subquery (CORRECT PATTERN)
CREATE POLICY "studio_members_view_feature_items"
  ON feature_items FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "studio_members_manage_feature_items"
  ON feature_items FOR ALL
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_feature_items_updated_at
  BEFORE UPDATE ON feature_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Important:** Never use `studio_id = auth.uid()` - this is incorrect. Always use the `studio_members` subquery pattern.

### User Ownership

For user-owned (not studio) data:

```sql
CREATE TABLE user_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- other fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- RLS Policy
ALTER TABLE user_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own items"
  ON user_items FOR ALL
  USING (user_id = auth.uid());
```

---

## RLS Policy Patterns

### Basic Select Policy

```sql
CREATE POLICY "Authenticated users can view own data"
  ON table_name FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
```

### Studio Tenancy Policy (Correct Pattern)

```sql
-- SELECT: Studio members can view
CREATE POLICY "studio_members_view_[table]"
  ON table_name FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members WHERE user_id = auth.uid()
    )
  );

-- ALL (INSERT/UPDATE/DELETE): Studio members with appropriate roles
CREATE POLICY "studio_members_manage_[table]"
  ON table_name FOR ALL
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );
```

**Warning:** Never use `studio_id = auth.uid()`. Always use the `studio_members` subquery.

### Public Read, Owner Write

```sql
CREATE POLICY "Anyone can read"
  ON table_name FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Owner can write"
  ON table_name FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner can update"
  ON table_name FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
```

---

## Enum Patterns

### Create Enum Type

```sql
CREATE TYPE feature_status AS ENUM ('draft', 'active', 'archived');
```

### Use in Table

```sql
CREATE TABLE features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status feature_status DEFAULT 'draft' NOT NULL,
  -- other fields
);
```

---

## Migration Naming Convention

```
YYYYMMDDHHMMSS_description.sql
```

**Examples:**
- `20260130100000_add_intake_tables.sql`
- `20260130100100_add_intake_rls.sql`
- `20260130110000_add_proposal_tables.sql`

**Timestamp Coordination:**
- Foundation stream: `YYYYMMDD100000` through `YYYYMMDD109999`
- Each feature stream gets a 10000 range if needed
- Or consolidate all migrations in foundation (preferred)

---

## Database Keeper Agent Integration

The `database-keeper` agent provides AI-assisted schema exploration and migration authoring.

### Using Database Keeper in PRD Workflow

**Phase 0: Research existing patterns**
```bash
/database explore "How are similar features stored?"
/database audit  # Check RLS coverage before adding new tables
```

**Phase 1: Draft migration**
```bash
/database migration "Add [feature] tables with studio tenancy"
```

The agent drafts SQL to `.claude/ralph/migrations/draft-*.sql` for human review.

### Story Template with Agent

```json
{
  "id": "S1-001",
  "title": "Create [feature] database schema",
  "description": "Add all tables needed for [feature] system",
  "acceptanceCriteria": [
    "Create [table_name] table following studio tenancy pattern",
    "RLS policies using studio_members subquery pattern",
    "ON DELETE CASCADE for all studio/client foreign keys",
    "Indexes on studio_id and commonly queried columns",
    "Migration validated by /database audit"
  ],
  "implementationSteps": [
    "1. Run: /database explore \"similar features\" to find patterns",
    "2. Run: /database migration \"Add [feature] tables\"",
    "3. Review draft in .claude/ralph/migrations/",
    "4. Move to supabase/migrations/ with timestamp naming",
    "5. Run: pnpm dlx supabase db push",
    "6. Run: /database audit to verify RLS coverage"
  ]
}
```

### Tiered Permission Model

| Tier | Command | Description |
|------|---------|-------------|
| 1 | `/database explore` | Read-only schema discovery |
| 1 | `/database analyze` | Query performance analysis |
| 1 | `/database audit` | RLS policy validation |
| 2 | `/database migration` | Draft SQL (human executes) |

**Note:** The agent never auto-executes migrations. All DDL requires human review and `pnpm dlx supabase db push`.

---

## Reference Docs

Before writing database stories, consult:
- `docs/architecture/database-schema.md` — Existing tables and conventions
- `docs/guides/coding-conventions.md` — Naming conventions
- `supabase/CLAUDE.md` — RLS patterns and security constraints (Section 11 for agent integration)
- `docs/guides/database-migrations.md` — Migration workflow with agent

---

## Anti-Patterns

### Don't Split Migration and RLS

**Bad:** Migration in story 1, RLS in story 5
**Good:** RLS immediately follows migration (story 1, story 2)

### Don't Create Types Before Migration

**Bad:** Type generation before migration runs
**Good:** Type generation after ALL migrations complete

### Don't Modify Existing Migrations

**Bad:** Edit `20260101_initial.sql` to add columns
**Good:** Create new migration `20260130_add_columns.sql`

### Don't Skip RLS

**Bad:** Table without RLS policies
**Good:** Every table has RLS enabled with appropriate policies

### Don't Use Wrong RLS Pattern

**Bad:** `USING (studio_id = auth.uid())` — This is incorrect!
**Good:** `USING (studio_id IN (SELECT studio_id FROM studio_members WHERE user_id = auth.uid()))`

The `studio_members` subquery pattern ensures proper multi-tenant isolation.

### Don't Forget Cascades

**Bad:** `REFERENCES studios(id)` without cascade behavior
**Good:** `REFERENCES studios(id) ON DELETE CASCADE`

All foreign keys to tenant entities (studios, clients) must have explicit cascade behavior.

### Don't Skip Indexes on Tenant Columns

**Bad:** No index on `studio_id`
**Good:** `CREATE INDEX [table]_studio_id_idx ON [table](studio_id)`

Always index tenant boundary columns for RLS policy performance.
