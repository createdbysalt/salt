# Architecture Transition: Master Plan

**Date:** 2026-05-14  
**Status:** Active  
**Supersedes:** `2026-05-13-relationships-transition.md`, `2026-05-14-entity-architecture-plan.md`

---

## What's Already Done

| Phase | Status | What Was Completed |
|-------|--------|-------------------|
| Route Aliasing | **DONE** | `/relationships` routes created alongside `/clients` |
| Feature Module Rename | **DONE** | `_features/clients/` → `_features/relationships/` |
| Sidebar Navigation | **DONE** | Relationships app detected, shows correct nav items |
| Logo SVGs | **DONE** | Text-based SVGs for relationships.svg and hq.svg |

---

## Current Database Schema (What We Have)

```
studios                    -- The workspace/agency
├── owner_id → users
├── studio_members         -- Internal team (users in workspace)
│   ├── user_id → users
│   └── role: owner|admin|member|viewer
│
├── clients                -- External entities (will become people + organizations)
│   ├── client_type: individual|organization
│   ├── lifecycle_stage: prospect|discovery|pitch|client|complete|on-hold|lost
│   └── client_users       -- Portal access for contacts
│
├── companies              -- Separate companies table (underutilized)
│
└── projects               -- Work
    ├── studio_id
    └── client_id
```

---

## Target Database Schema (Where We're Going)

```
workspaces                 -- Renamed from studios (multi-workspace ready)
├── owner_id → users
├── workspace_memberships  -- Renamed from studio_members
│   ├── user_id → users
│   └── role: owner|admin|member|guest
│
├── teams                  -- NEW: groups within workspace
│   └── team_members       -- Junction to workspace_memberships
│
├── organizations          -- Evolved from companies (external companies)
│   └── relationship_status: prospect|client|past_client|partner|vendor
│
├── people                 -- NEW: external contacts (replaces clients as entity)
│   ├── relationship_status: prospect|client|past_client|partner|vendor
│   ├── organization_id (optional)
│   └── portal_user_id (optional, for The Table access)
│
├── organization_people    -- Junction: person works at organization
│   ├── role: primary_contact|billing|technical|etc
│   └── is_primary: boolean
│
├── entity_relations       -- NEW: Obsidian-style linking
│   ├── from_entity_type + from_entity_id
│   ├── to_entity_type + to_entity_id
│   └── relation_type: works_at|contact_for|related_to|mentioned_in
│
└── projects               -- Enhanced
    ├── workspace_id
    ├── organization_id (optional, replaces client_id)
    ├── team_id (optional)
    └── primary_contact_id → people
```

---

## Implementation Phases

### Phase 1: Schema Foundation (Non-Breaking)
**Timeline:** 3-5 days  
**Risk:** LOW  
**Visible Changes:** None (backend only)

**Goal:** Add new tables alongside existing ones. No data migration yet, no UI changes.

**Tasks:**

| # | Task | Type | Details |
|---|------|------|---------|
| 1.1 | Create `organizations` table | Migration | Copy structure from `companies`, add `relationship_status` |
| 1.2 | Create `people` table | Migration | New table for external contacts |
| 1.3 | Create `organization_people` junction | Migration | Links people to organizations |
| 1.4 | Create `teams` table | Migration | Groups within workspace |
| 1.5 | Create `team_members` junction | Migration | Links studio_members to teams |
| 1.6 | Create `entity_relations` table | Migration | For Obsidian-style linking |
| 1.7 | Add `workspace_id` alias to studios | Migration | `ALTER TABLE studios ADD COLUMN workspace_id UUID GENERATED ALWAYS AS (id) STORED` or create view |
| 1.8 | Create compatibility views | Migration | `CREATE VIEW workspaces AS SELECT * FROM studios` |

**SQL Preview:**

```sql
-- organizations (evolve from companies concept)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship_status TEXT DEFAULT 'prospect' 
    CHECK (relationship_status IN ('prospect', 'client', 'past_client', 'partner', 'vendor', 'other')),
  website TEXT,
  industry TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- people (external contacts)
CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  title TEXT,
  relationship_status TEXT DEFAULT 'other'
    CHECK (relationship_status IN ('prospect', 'client', 'past_client', 'partner', 'vendor', 'other')),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  avatar_url TEXT,
  portal_user_id UUID REFERENCES auth.users(id), -- For The Table access
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- organization_people junction
CREATE TABLE organization_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  role TEXT, -- 'Primary Contact', 'Billing', 'Technical'
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, person_id)
);

-- teams
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT, -- For UI display
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- team_members
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  studio_member_id UUID NOT NULL REFERENCES studio_members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, studio_member_id)
);

-- entity_relations (Obsidian-style linking)
CREATE TABLE entity_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  from_entity_type TEXT NOT NULL, -- 'person', 'organization', 'project', 'note'
  from_entity_id UUID NOT NULL,
  to_entity_type TEXT NOT NULL,
  to_entity_id UUID NOT NULL,
  relation_type TEXT, -- 'works_at', 'contact_for', 'related_to', 'mentioned_in'
  context TEXT, -- Optional description
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(studio_id, from_entity_type, from_entity_id, to_entity_type, to_entity_id, relation_type)
);

-- Indexes for backlinks queries
CREATE INDEX idx_entity_relations_to ON entity_relations(to_entity_type, to_entity_id);
CREATE INDEX idx_entity_relations_studio ON entity_relations(studio_id);
```

**Verification:**
- [ ] All tables created without errors
- [ ] RLS policies added for all new tables
- [ ] Existing functionality still works (no breaking changes)

---

### Phase 2: Data Migration
**Timeline:** 3-5 days  
**Risk:** MEDIUM  
**Visible Changes:** None yet (data copied, not switched)

**Goal:** Migrate existing `clients` data to new `organizations` + `people` tables.

**Tasks:**

| # | Task | Type | Details |
|---|------|------|---------|
| 2.1 | Migrate `client_type: organization` clients | Script | Create org records + primary contact person |
| 2.2 | Migrate `client_type: individual` clients | Script | Create person records directly |
| 2.3 | Link `client_users` to `people.portal_user_id` | Script | Connect portal access |
| 2.4 | Create `organization_people` links | Script | Link contacts to their organizations |
| 2.5 | Copy `companies` to `organizations` | Script | Merge existing companies data |
| 2.6 | Validate migration | Script | Count checks, data integrity |
| 2.7 | Add `migrated_from_client_id` column | Migration | Track lineage for rollback |

**Migration Logic:**

```sql
-- For organization clients
INSERT INTO organizations (studio_id, name, relationship_status, website, notes, metadata, created_at)
SELECT 
  studio_id,
  name,
  lifecycle_stage::TEXT, -- Map lifecycle to relationship_status
  contact_email, -- Temporary, will move to person
  notes,
  settings,
  created_at
FROM clients 
WHERE client_type = 'organization';

-- Create primary contact person for each organization client
INSERT INTO people (studio_id, name, email, phone, relationship_status, created_at)
SELECT 
  c.studio_id,
  COALESCE(c.settings->>'primary_contact_name', c.name || ' Contact'),
  c.contact_email,
  c.contact_phone,
  c.lifecycle_stage::TEXT,
  c.created_at
FROM clients c
WHERE c.client_type = 'organization';

-- For individual clients (direct to people)
INSERT INTO people (studio_id, name, email, phone, relationship_status, notes, created_at)
SELECT 
  studio_id,
  name,
  contact_email,
  contact_phone,
  lifecycle_stage::TEXT,
  notes,
  created_at
FROM clients 
WHERE client_type = 'individual';
```

**Verification:**
- [ ] All clients migrated (count matches)
- [ ] No orphaned records
- [ ] `projects.client_id` still works (we haven't switched yet)

---

### Phase 3: Queries & API Layer
**Timeline:** 5-7 days  
**Risk:** MEDIUM  
**Visible Changes:** Minimal (same UI, new data source)

**Goal:** Update queries to read from new tables. Keep writing to both during transition.

**Tasks:**

| # | Task | Type | Details |
|---|------|------|---------|
| 3.1 | Create `_features/relationships/queries-v2.ts` | Code | New queries against organizations + people |
| 3.2 | Create TypeScript types | Code | `Person`, `Organization`, `Team` types |
| 3.3 | Update Server Actions for dual-write | Code | Write to old + new tables |
| 3.4 | Create feature flag | Code | `use_new_entity_model` flag |
| 3.5 | Update list queries | Code | Switch reads to new tables behind flag |
| 3.6 | Update detail queries | Code | Switch reads to new tables behind flag |

**Type Definitions:**

```typescript
// _features/relationships/types.ts

export type RelationshipStatus = 
  | 'prospect' 
  | 'client' 
  | 'past_client' 
  | 'partner' 
  | 'vendor' 
  | 'other';

export interface Organization {
  id: string;
  studioId: string;
  name: string;
  relationshipStatus: RelationshipStatus;
  website?: string;
  industry?: string;
  notes?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  // Joined data
  people?: Person[];
  primaryContact?: Person;
}

export interface Person {
  id: string;
  studioId: string;
  name: string;
  email?: string;
  phone?: string;
  title?: string;
  relationshipStatus: RelationshipStatus;
  notes?: string;
  avatarUrl?: string;
  portalUserId?: string; // For The Table access
  createdAt: Date;
  updatedAt: Date;
  // Joined data
  organizations?: Organization[];
}

export interface Team {
  id: string;
  studioId: string;
  name: string;
  description?: string;
  color?: string;
  members?: TeamMember[];
}

export interface TeamMember {
  id: string;
  teamId: string;
  studioMemberId: string;
  // Joined
  member?: StudioMember;
}

// Backwards compatibility
export type Client = Organization | Person;
```

**Verification:**
- [ ] Feature flag works (can toggle between old/new)
- [ ] List view loads from new tables
- [ ] Detail view loads from new tables
- [ ] Create/update writes to both tables

---

### Phase 4: UI Updates
**Timeline:** 5-7 days  
**Risk:** MEDIUM  
**Visible Changes:** YES - new UI, new terminology

**Goal:** Update components to use new data model. Change navigation labels.

**Tasks:**

| # | Task | Type | Details |
|---|------|------|---------|
| 4.1 | Update sidebar labels | UI | "Relationships" → "People" or "Directory" |
| 4.2 | Split list view | UI | Show Organizations and People tabs/filters |
| 4.3 | Add relationship status UI | UI | Dropdown to change prospect→client etc |
| 4.4 | Update detail page | UI | Show organization + contacts structure |
| 4.5 | Add "Works At" UI | UI | Link person to organization |
| 4.6 | Update create flow | UI | Choose: create Person or Organization |
| 4.7 | Add Teams to sidebar | UI | New section in navigation |
| 4.8 | Create Team management UI | UI | List/create/edit teams |
| 4.9 | Add team assignment to projects | UI | Select team for project |

**Navigation Change:**

```
Before:                          After:
├── Daily Briefing               ├── Today
├── Inbox                        ├── Inbox
├── Command Center               ├── Command Center
├── Relationships                ├── People
│   ├── All Relationships        │   ├── All
│   ├── Directory                │   ├── Organizations
│   ├── Messages                 │   ├── Contacts
│   └── Onboarding               │   └── By Status
├── (Work, Billing...)           ├── Teams (NEW)
                                 │   ├── Design Team
                                 │   └── Development
                                 ├── Projects
                                 └── Billing
```

**Verification:**
- [ ] Navigation updated and working
- [ ] List views show organizations + people correctly
- [ ] Detail view shows linked contacts
- [ ] Teams visible and functional
- [ ] Create flows work for both entity types

---

### Phase 5: Deprecate Old Tables
**Timeline:** 2-3 days  
**Risk:** LOW (after verification)  
**Visible Changes:** None

**Goal:** Stop writing to old tables, add deprecation notices.

**Tasks:**

| # | Task | Type | Details |
|---|------|------|---------|
| 5.1 | Remove dual-write | Code | Only write to new tables |
| 5.2 | Update `projects.client_id` | Migration | Add `organization_id` + `primary_contact_id` |
| 5.3 | Migrate project links | Script | Copy client_id to organization_id/person_id |
| 5.4 | Remove feature flag | Code | New model is default |
| 5.5 | Add deprecation comments | Code | Mark old queries as deprecated |
| 5.6 | Update E2E tests | Tests | Point to new data model |

**Verification:**
- [ ] All reads from new tables
- [ ] All writes to new tables
- [ ] Projects linked correctly
- [ ] E2E tests pass

---

### Phase 6: Linking & Search (Obsidian Magic)
**Timeline:** 5-7 days  
**Risk:** MEDIUM  
**Visible Changes:** YES - new features

**Goal:** Implement [[linking]] syntax and global search.

**Tasks:**

| # | Task | Type | Details |
|---|------|------|---------|
| 6.1 | Create `[[` trigger parser | Code | Detect `[[` in text inputs |
| 6.2 | Create entity picker modal | UI | Search and select any entity |
| 6.3 | Store links in `entity_relations` | Code | Save when `[[Link]]` is used |
| 6.4 | Create "Related" section | UI | Show linked items on detail pages |
| 6.5 | Implement backlinks query | Code | "What links to this entity?" |
| 6.6 | Create Cmd+K global search | UI | Search across all entities |
| 6.7 | Add entity type filters | UI | Filter search by type |

**Verification:**
- [ ] `[[` triggers entity picker
- [ ] Links saved to database
- [ ] Backlinks appear on entity pages
- [ ] Cmd+K search works across all types

---

### Phase 7: Multi-Workspace (Future)
**Timeline:** 2-3 weeks  
**Risk:** HIGH  
**Visible Changes:** YES - major feature

**Goal:** Enable users to create/join multiple workspaces.

**Deferred:** This phase is documented but not scheduled. Implement after Phases 1-6 are stable.

**Tasks:**

| # | Task | Type |
|---|------|------|
| 7.1 | Rename `studios` → `workspaces` | Migration |
| 7.2 | Rename `studio_members` → `workspace_memberships` | Migration |
| 7.3 | Create workspace switcher UI | UI |
| 7.4 | Create "New Workspace" flow | UI |
| 7.5 | Create invitation system | Code |
| 7.6 | Per-workspace billing | Code |

---

## Migration Rollback Strategy

Each phase has a rollback path:

| Phase | Rollback Method |
|-------|-----------------|
| 1 | Drop new tables (no data loss, old tables untouched) |
| 2 | Data still in old tables, just delete from new |
| 3 | Feature flag back to old queries |
| 4 | Git revert UI changes, flag back |
| 5 | Re-enable dual-write, restore old reads |
| 6 | Drop entity_relations data, remove UI |

---

## Timeline Summary

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 1: Schema | 3-5 days | Week 1 |
| Phase 2: Data Migration | 3-5 days | Week 2 |
| Phase 3: Queries/API | 5-7 days | Week 3 |
| Phase 4: UI Updates | 5-7 days | Week 4-5 |
| Phase 5: Deprecate Old | 2-3 days | Week 5 |
| Phase 6: Linking/Search | 5-7 days | Week 6-7 |
| **Total** | **~7 weeks** | |

Phase 7 (Multi-Workspace) is deferred.

---

## Files to Modify/Create

### Phase 1 (Schema)
```
supabase/migrations/YYYYMMDD_create_organizations.sql
supabase/migrations/YYYYMMDD_create_people.sql
supabase/migrations/YYYYMMDD_create_teams.sql
supabase/migrations/YYYYMMDD_create_entity_relations.sql
```

### Phase 3 (Queries)
```
app/_features/relationships/types.ts (update)
app/_features/relationships/queries-v2.ts (new)
app/_features/relationships/actions-v2.ts (new)
```

### Phase 4 (UI)
```
app/_features/shell/components/AppSidebar.tsx (update)
app/_features/shell/routes.ts (update)
app/_features/relationships/components/PeopleList.tsx (new)
app/_features/relationships/components/OrganizationList.tsx (new)
app/_features/relationships/components/TeamsList.tsx (new)
app/(relationships)/relationships/page.tsx (update)
```

### Phase 6 (Linking)
```
app/_features/relationships/components/EntityPicker.tsx (new)
app/_features/relationships/components/LinkingInput.tsx (new)
app/_features/relationships/components/RelatedSection.tsx (new)
app/_features/shell/components/GlobalSearch.tsx (new)
```

---

## Open Decisions

| Decision | Options | Recommendation | Status |
|----------|---------|----------------|--------|
| Navigation label | "People" vs "Directory" vs "Contacts" | **"People"** | Pending |
| Keep "Relationships" anywhere? | Yes vs No | **No** (too abstract) | Pending |
| Organization required for person? | Yes vs Optional | **Optional** | Pending |
| Start with which phase? | 1 vs parallel 1+4 | **Phase 1 first** | Pending |

---

## Next Steps

1. **Approve this plan** - Any changes needed?
2. **Decide terminology** - "People" vs "Directory"?
3. **Start Phase 1** - Create schema migration
4. **Delete old plan files** - Superseded by this doc

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-14 | Initial master plan created |
