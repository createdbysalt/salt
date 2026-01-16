# 🛡️ Database Safety & Multi-Tenant Architecture

**Context:** You are working with a multi-tenant SaaS database with Row Level Security (RLS).
**CRITICAL:** One mistake here can expose client data across tenants. Follow these rules exactly.

---

## 1. 🚨 HARD CONSTRAINTS (Non-Negotiable)

### Security Rules (Never Violate)
```sql
-- ❌ NEVER disable RLS on tenant-scoped tables
ALTER TABLE studios DISABLE ROW LEVEL SECURITY;  -- FORBIDDEN

-- ❌ NEVER query without tenant context
SELECT * FROM clients;  -- DANGEROUS: Could expose all clients

-- ✅ ALWAYS include tenant scoping
SELECT * FROM clients
WHERE studio_id IN (
  SELECT studio_id FROM studio_members WHERE user_id = auth.uid()
);
```

### Migration Rules
```sql
-- ❌ NEVER add foreign keys without considering cascades
ALTER TABLE projects ADD COLUMN studio_id uuid REFERENCES studios(id);
-- Missing: What happens when studio is deleted?

-- ✅ ALWAYS specify cascade behavior
ALTER TABLE projects
  ADD COLUMN studio_id uuid
  REFERENCES studios(id) ON DELETE CASCADE;  -- Explicit behavior
```

---

## 2. 🏗️ Multi-Tenant Architecture Overview

### Tenant Hierarchy
```mermaid
graph TD
    A[Studios] --> B[Studio Members]
    A --> C[Clients]
    C --> D[Client Users]
    C --> E[Bridge Portals]
    A --> F[Projects]
    C --> F
    F --> G[Project Members]
    F --> H[Tasks]
    F --> I[Milestones]
```

### Core Entities & Relationships
```typescript
// Primary tenant boundary
studios {
  id: uuid (PK)
  owner_id: uuid -> auth.users.id
  slug: text (unique)
  // ... other fields
}

// Tenant membership
studio_members {
  studio_id: uuid -> studios.id ON DELETE CASCADE
  user_id: uuid -> auth.users.id ON DELETE CASCADE
  role: 'owner' | 'admin' | 'member' | 'viewer'
}

// Studio's customers
clients {
  studio_id: uuid -> studios.id ON DELETE CASCADE  // Tenant scoped
  slug: text (unique within studio)
  // ... other fields
}

// Projects belong to both studio AND client
projects {
  studio_id: uuid -> studios.id ON DELETE CASCADE   // Tenant scoped
  client_id: uuid -> clients.id ON DELETE CASCADE   // Customer scoped
  // ... other fields
}
```

---

## 3. 🔐 Row Level Security (RLS) Patterns

### Studio Member Access Pattern
**Most common pattern in the system:**
```sql
-- Pattern: "Studio members can access their studio's data"
CREATE POLICY "policy_name" ON table_name
FOR operation USING (
  studio_id IN (
    SELECT studio_id FROM studio_members
    WHERE user_id = auth.uid()
  )
);
```

### Client User Access Pattern
```sql
-- Pattern: "Client users can access their own data"
CREATE POLICY "client_users_view_own_data" ON projects
FOR SELECT USING (
  client_id IN (
    SELECT client_id FROM client_users
    WHERE user_id = auth.uid()
  )
);
```

### Role-Based Access Pattern
```sql
-- Pattern: "Only admins and owners can modify"
CREATE POLICY "admins_can_manage" ON studio_members
FOR ALL USING (
  studio_id IN (
    SELECT studio_id FROM studio_members
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);
```

---

## 4. 📋 Safe Migration Patterns

### Adding Tenant-Scoped Tables
```sql
-- ✅ Safe pattern for new tenant-scoped table
CREATE TABLE new_tenant_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  -- ... other columns
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes immediately
CREATE INDEX new_tenant_table_studio_id_idx ON new_tenant_table(studio_id);

-- Enable RLS
ALTER TABLE new_tenant_table ENABLE ROW LEVEL SECURITY;

-- Add policies (use existing patterns)
CREATE POLICY "studio_members_can_view" ON new_tenant_table
FOR SELECT USING (
  studio_id IN (
    SELECT studio_id FROM studio_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "studio_members_can_manage" ON new_tenant_table
FOR ALL USING (
  studio_id IN (
    SELECT studio_id FROM studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
);
```

### Adding Non-Tenant Tables (Rare)
```sql
-- ⚠️ Only for truly global data (system settings, etc.)
CREATE TABLE global_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb,
  created_at timestamptz DEFAULT now()
);

-- Still enable RLS for safety
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "admin_only" ON global_settings
FOR ALL USING (
  auth.uid() IN (
    SELECT user_id FROM studio_members
    WHERE role = 'owner' AND studio_id = 'system-admin-studio-id'
  )
);
```

### Adding Columns Safely
```sql
-- ✅ Safe column addition
ALTER TABLE existing_table
ADD COLUMN new_column text;

-- ✅ Safe column with constraints
ALTER TABLE existing_table
ADD COLUMN status text DEFAULT 'active'
CHECK (status IN ('active', 'inactive', 'archived'));

-- ❌ DANGEROUS: Adding non-nullable columns to large tables
ALTER TABLE projects ADD COLUMN required_field text NOT NULL;
-- Can cause downtime! Use DEFAULT first, then remove it.

-- ✅ Safe approach for non-nullable columns
ALTER TABLE projects ADD COLUMN required_field text DEFAULT 'temp';
-- Deploy, update all rows, then:
ALTER TABLE projects ALTER COLUMN required_field DROP DEFAULT;
```

---

## 5. 🔍 Testing RLS Policies

### Pre-Migration Testing
```sql
-- Create test studio and users
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'studio1@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'studio2@example.com');

INSERT INTO studios (id, owner_id, name, slug) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Studio 1', 'studio-1'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Studio 2', 'studio-2');

INSERT INTO studio_members (studio_id, user_id, role, email) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner', 'studio1@example.com'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'owner', 'studio2@example.com');

-- Test isolation: User 1 should NOT see Studio 2's data
SET session.user_id = '11111111-1111-1111-1111-111111111111';
SELECT * FROM studios;  -- Should only return Studio 1

SET session.user_id = '22222222-2222-2222-2222-222222222222';
SELECT * FROM studios;  -- Should only return Studio 2
```

### RLS Testing Queries
```sql
-- Test that users can only see their studio's clients
SELECT
  c.name as client_name,
  s.name as studio_name
FROM clients c
JOIN studios s ON c.studio_id = s.id;

-- Should return results based on auth.uid()'s studio membership only
```

---

## 6. 🔧 Safe Data Access Patterns

### Using Server-Side Supabase Client
```typescript
// ✅ Always use server client for RLS enforcement
import { createClient } from "@/app/_lib/supabase/server"

export async function getStudioClients(studioId: string) {
  const supabase = await createClient()

  // RLS automatically filters to current user's accessible studios
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('studio_id', studioId)  // Additional safety check

  if (error) throw error
  return data
}
```

### DANGEROUS: Bypassing RLS
```typescript
// ❌ NEVER use admin client for regular operations
import { createAdminClient } from "@/app/_lib/supabase/admin"

export async function dangerousOperation() {
  const supabase = createAdminClient()  // ❌ Bypasses RLS!

  // This could return ALL clients across ALL studios
  const { data } = await supabase.from('clients').select('*')
  return data
}

// ✅ Only use admin client for system operations
export async function systemMaintenance() {
  // Only in system admin context, not user-facing operations
  const supabase = createAdminClient()
  // ... system-level operations only
}
```

---

## 7. 📊 Common Tables & Their RLS Patterns

### Studios Table
```sql
-- Users can only see studios they're members of
CREATE POLICY "studio_members_view_studio" ON studios
FOR SELECT USING (
  id IN (
    SELECT studio_id FROM studio_members WHERE user_id = auth.uid()
  )
);

-- Only owners can update studio settings
CREATE POLICY "owners_update_studio" ON studios
FOR UPDATE USING (owner_id = auth.uid());
```

### Clients Table
```sql
-- Studio members can view clients in their studio
CREATE POLICY "studio_members_view_clients" ON clients
FOR SELECT USING (
  studio_id IN (
    SELECT studio_id FROM studio_members WHERE user_id = auth.uid()
  )
);

-- Studio members can manage clients
CREATE POLICY "studio_members_manage_clients" ON clients
FOR ALL USING (
  studio_id IN (
    SELECT studio_id FROM studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
);
```

### Projects Table (Dual Scoping)
```sql
-- Studio members can view projects in their studio
CREATE POLICY "studio_members_view_projects" ON projects
FOR SELECT USING (
  studio_id IN (
    SELECT studio_id FROM studio_members WHERE user_id = auth.uid()
  )
);

-- Client users can view their own projects
CREATE POLICY "client_users_view_projects" ON projects
FOR SELECT USING (
  client_id IN (
    SELECT client_id FROM client_users WHERE user_id = auth.uid()
  )
);
```

---

## 8. 🚨 Emergency Procedures

### If RLS is Accidentally Disabled
```sql
-- Immediately re-enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Check all tables
SELECT
  schemaname,
  tablename,
  rowsecurity,
  hasrls
FROM pg_tables
WHERE schemaname = 'public'
AND hasrls = false;  -- Tables without RLS

-- Should return empty if all tenant-scoped tables have RLS
```

### If Bad Migration is Deployed
```sql
-- Quick rollback strategy
BEGIN;

-- Revert the problematic changes
-- (Have rollback SQL ready before deploying)

-- Test RLS still works
SET session.user_id = 'test-user-id';
SELECT count(*) FROM sensitive_table;  -- Should be scoped

COMMIT;  -- Only if tests pass
```

---

## 9. 💡 Performance Considerations

### RLS Policy Performance
```sql
-- ❌ Slow: Nested subqueries in policies
CREATE POLICY "slow_policy" ON projects USING (
  EXISTS (
    SELECT 1 FROM studio_members sm
    JOIN studios s ON s.id = sm.studio_id
    WHERE sm.user_id = auth.uid()
    AND s.id = projects.studio_id
  )
);

-- ✅ Fast: Use IN with subquery (PostgreSQL optimizes this)
CREATE POLICY "fast_policy" ON projects USING (
  studio_id IN (
    SELECT studio_id FROM studio_members
    WHERE user_id = auth.uid()
  )
);
```

### Index Requirements
```sql
-- ✅ Always index tenant boundary columns
CREATE INDEX table_name_studio_id_idx ON table_name(studio_id);
CREATE INDEX table_name_client_id_idx ON table_name(client_id);

-- ✅ Index user lookup columns
CREATE INDEX studio_members_user_id_idx ON studio_members(user_id);
CREATE INDEX client_users_user_id_idx ON client_users(user_id);
```

---

## 10. ✅ Pre-Deploy Checklist

Before any migration that touches tenant data:

- [ ] **RLS Enabled:** All new tables have `ENABLE ROW LEVEL SECURITY`
- [ ] **Policies Created:** At least SELECT policy exists for new tables
- [ ] **Foreign Keys:** All tenant references have `ON DELETE CASCADE`
- [ ] **Indexes Added:** Tenant boundary columns are indexed
- [ ] **Test Data:** Created test studios/users to verify isolation
- [ ] **Rollback Plan:** Written rollback SQL and tested it
- [ ] **Performance:** Checked that policies use efficient patterns

**Remember:** In multi-tenant systems, security bugs are data breaches. When in doubt, ask for a security review.