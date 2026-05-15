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
| Sidebar Navigation | **DONE** | Relationships section detected, shows correct nav items |
| Logo SVGs | **DONE** | Text-based SVGs for relationships.svg and hq.svg |
| Phase 1: Schema Foundation | **DONE** | organizations, people, teams, entity_relations tables + RLS |
| Phase 2: Data Migration | **DONE** | Migrated clients → organizations + people |
| Phase 3: Queries & API Layer | **IN PROGRESS** | TypeScript types, queries, feature flags, dual-write actions |

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

**Goal:** Update components to use new data model. Replace AppSwitcher with unified sidebar + WorkspaceSwitcher. Change navigation labels.

**Design Direction:** Minimalist, Linear/Obsidian-inspired. Single unified sidebar (no app switching). Consolidate "command" items so the top of the sidebar stays small (3 items max).

**Tasks:**

| # | Task | Type | Details |
|---|------|------|---------|
| 4.1a | Replace AppSwitcher with WorkspaceSwitcher | UI | Top of sidebar shows workspace name (stub: single workspace dropdown). Removes per-app nav splitting. |
| 4.1b | Unify nav items into single sidebar | UI | Collapse `getNavItemsForApp()` into one flat nav. Use `Connections ▼` as a clickable + collapsible group header that contains People, Work, Billing. |
| 4.1d | Build clickable + collapsible Connections group | UI | Header is BOTH a destination (clicking label → `/connections`) and a collapse control (clicking ▼ → expand/collapse children). Linear-inspired. |
| 4.1e | Build Try section at sidebar bottom | UI | Below Favorites/Recents. Initial items: "Import contacts" + "Train your AI voice". Items hide on completion; section hides when empty. |
| 4.1c | Consolidate top items (HQ + Actions + Messages) | UI | Reduce 5 command items → 3: HQ, Actions, Messages. HQ absorbs Daily Briefing + Command Center + Insights + Calendar via on-page view switcher. Inbox splits into Actions (AI items) and Messages (human conversations). |
| 4.10 | Build HQ page shell with view switcher | UI | Today / Week / Month tabs on page (not in sidebar). Renders briefing, metrics, calendar widgets per view. Phase 6 fills with AI. |
| 4.11 | Build Actions page shell | UI | Queue tab + Activity tab layout. Empty states. Header has search icon + ✨ "Ask SALT" compose icon (Linear-style, top right). Phase 6 fills with AI behavior. |
| 4.12 | Build Messages page shell | UI | Thread list + thread view. Inline placeholders for AI marker components (Phase 6 wires up). |
| 4.13 | Build Capture page shell | UI | Quick-capture box (always at top), recent capture cards, tabs (Recent / All / Auto-routed / Needs review). Voice icon (UI placeholder, AI wired in Phase 6). Global Cmd+Shift+N shortcut opens floating capture window from any page. |
| 4.2 | Build unified People page (single sidebar item) | UI | One "People" nav item. Page shows both entity types via page-level tabs/filters: `[Worth Attention]` `[All]` `[People]` `[Companies]`. People can exist without Organizations. Organizations are peers, not nested under People. AI-curated "Worth Attention" is the default tab. |
| 4.3 | Add relationship status UI | UI | Dropdown to change prospect→client etc |
| 4.4 | Update detail page | UI | Show organization + contacts structure |
| 4.5 | Add "Works At" UI | UI | Link person to organization |
| 4.6 | Update create flow | UI | Choose: create Person or Organization |
| 4.7 | Add Teams to sidebar | UI | New section in navigation (under PEOPLE or its own section) |
| 4.8 | Create Team management UI | UI | List/create/edit teams |
| 4.9 | Add team assignment to projects | UI | Select team for project |

**Navigation Change (Option C — Pragmatic Minimalism):**

```
Old sidebar (fragmented):            New sidebar (unified):
┌─────────────────────────┐          ┌─────────────────────────────┐
│ HQ                      │          │ 🏢 My Agency            ▼   │  ← Workspace switcher
├─────────────────────────┤          ├─────────────────────────────┤
│ • Daily Briefing        │          │ 🏢 HQ                       │  ← dashboard (views on page)
│ • Inbox            [•]  │          │ ⚡ Actions             [3]  │  ← AI items awaiting you
│ • Command Center        │          │ 💬 Messages            [•]  │  ← human conversations
│ • Insights              │          │ ✨ Capture                  │  ← AI-routed scratchpad
│                         │          │                             │
│ • Calendar              │          │ 🔗 Connections         ▼    │  ← clickable header + collapsible group
│                         │          │    👥 People                │  ← directory + filters + local connections
│ Nav changed based on    │          │    📁 Work                  │  ← projects / retainers / agreements
│ which "app" you were    │          │    💰 Payments              │  ← invoices / activity
│ in. Each section had    │          │                             │
│ its own nav.            │          │ 👨‍👩‍👧 Teams           ▼    │  ← collapsible + specific teams (Linear-style)
└─────────────────────────┘          │    🎨 Design Team           │
                                     │    💻 Dev Team              │
                                     │    ➕ New team              │
                                     │                             │
                                     │ Try                    ▼    │  ← onboarding/discovery
                                     │    📥 Import contacts       │
                                     │    ✨ Train your AI voice   │
                                     ├─────────────────────────────┤
                                     │ [Avatar] You             ⋯  │
                                     └─────────────────────────────┘
```

**Top section: 3 items (HQ + Actions + Messages)**

| Old (5 items)   | New (3 items)   | Notes |
|-----------------|------------------|-------|
| Daily Briefing  | **HQ**           | Becomes a dashboard with view switcher *on the page itself* |
| Command Center  | (merged into HQ) | Visible inside the Week / Month views of HQ |
| Insights        | (merged into HQ) | Visible inside the Month view of HQ, or contextual tabs inside Work/Billing |
| Calendar        | (merged into HQ) | Calendar widgets appear inside Today/Week/Month views of HQ |
| Inbox           | **Actions** + **Messages** | Split by type (see naming research below) |

**Why "Actions" instead of "Inbox" / "Approvals" / "Decisions":**

Backed by user-psychology research across four principles:

1. **Locus of control** — "Actions" is internal locus (user is the actor). "Inbox" / "Queue" are external locus (stuff arrives, user reacts).
2. **Decision fatigue** — "Decisions" is the most truthful name but explicitly triggers the cognitive frame that depletes willpower. "Actions" doesn't.
3. **Zeigarnik effect** — "Inbox" implies infinite accumulation (open loops never close). "Actions" implies completable items.
4. **Verb energy** — Action-derived labels reduce cognitive load and increase agency vs. passive nouns ("Pending," "Review").

Independent convergence: Vercel, GitHub, and Slack all chose "Actions" for their AI/agentic surfaces.

**HQ views live on the page, not in the sidebar:**

The view switcher (Today / This Week / This Month) is a page-level control inside HQ, not a sidebar entry. This matches Linear (view switcher in toolbar), Apple Calendar (Day/Week/Month buttons), and Notion (view tabs).

```
┌───────────────────────────────────────────────────────────────┐
│ HQ                                                            │
│ ┌─────────┬───────────┬────────────┐                          │
│ │  Today  │ This Week │ This Month │   ← page-level view tabs │
│ └─────────┴───────────┴────────────┘                          │
│                                                               │
│  [Today view contents: briefing, today's meetings,            │
│   approvals preview, since-yesterday metrics...]              │
└───────────────────────────────────────────────────────────────┘
```

**People section: single nav item, page-level entity filtering (research-backed):**

```
👥 People  (sidebar — one item only)
─────────────────────────────────────────
On the page:
[ ⚡ Worth Attention ] [ 📋 All ] [ 👤 People ] [ 🏢 Companies ] [ + Save view ]
```

| Decision | Choice | Why (research-backed) |
|----------|--------|----------------------|
| Sidebar items | **One** ("People") | Cognitive load (NN/G); minimalism principle |
| Entity model | **Co-equal peers** (People + Organizations) | CRM data-model literature; matches real B2B many-to-many |
| Nesting | **Never** (Organizations are NOT under People) | Implies hierarchy that doesn't exist; orgs have their own data (revenue, contracts) |
| People without Orgs | **Fully supported** | Freelancer clients are common; many CRMs over-rigid here |
| Orgs without People | **Fully supported** | "Acme Corp" can exist before you know who works there |
| Default page view | **AI-curated "Worth Attention"** | Matches AI-first lens applied to HQ |
| Filters | **Page-level tabs** (not sidebar items) | Notion-style, lower cognitive load than Linear sidebar views |
| Saved Views | **Page-level + AI-suggested** (not sidebar) | Sentry industry shift; AI nudge cuts manual creation friction |

**Why not separate "People" and "Organizations" sidebar items (HubSpot/Pipedrive convention)?**
Research shows agency owners think relationship-first, not entity-first. They search "Sarah at Acme" — they don't know whether they want the Person or Organization record. A unified surface matches the actual mental model, and Worth Attention treats both entity types as peers anyway.

**Saved Views pattern (Option 2 + Option 3 hybrid):**
- Users can click `+ Save view` after applying filters → becomes a tab
- AI detects repeated filtering (e.g., filtering by "overdue 14d" three times) and proactively offers: *"Save this as a quick-access tab?"*
- Views live on the page, not in sidebar — matches Notion's pattern, supports progressive disclosure for mixed audiences

**Connections: clickable section header + collapsible group + standalone destination**

`Connections` is the umbrella for everything relationship-driven in SALT — which is basically the whole product. It functions as three things at once:

1. **Brand-aligned section label** — tells the thesis of the app right in the nav ("everything below is about your connections")
2. **Collapsible group** — click the ▼ chevron to hide/show child items (People, Work, Billing)
3. **Clickable destination** — click the "Connections" label itself to open the relationship intelligence hub (`/connections` route)

```
🔗 Connections ▼            ← clickable label + collapsible chevron
   👥 People                ← child: directory + filters + local graphs per entity
   📁 Work                  ← child: projects / retainers / agreements
   💰 Billing               ← child: invoices / payments / services

The /connections page itself contains:
[ 🕸️ Graph ] [ ✨ Insights ] [ 🧭 Paths ] [ 🔍 Find ]
   visualization   AI patterns    intro paths   search
```

| Decision | Choice | Why (research-backed) |
|----------|--------|----------------------|
| Name | **"Connections"** | Most linguistically precise (a connection = a link); avoids transactional baggage of "Network"; avoids "Relationships" abstractness; natural verb ("connect with") |
| Scope | Full destination, not just a graph view | Graph + AI Insights + Paths + Find = relationship intelligence hub |
| Page tabs | Graph / Insights / Paths / Find | "Connections" used throughout — no "Network" anywhere in the UI |
| Sidebar placement | Below People, no section header | Two flat items at this level matches the minimalism principle |
| Data foundation | `entity_relations` table (Phase 7 schema) | Visualization layer of existing relational data |
| AI use | Powers "warm intro paths," common-neighbor detection, hub identification, underused connections, network growth tracking | Surfaces also flow up to HQ Today briefing |

**Sub-features inside Connections:**

| Tab | What it shows |
|-----|---------------|
| **🕸️ Graph** | Global visualization of your connections with filters (entity type, time range, focus point). Click node → open entity. Hover edge → see relationship context. |
| **✨ Insights** | AI-generated patterns: warm intro paths, common neighbors, hub people, underused connections, cluster detection, recent network growth |
| **🧭 Paths** | Natural-language "How am I connected to X?" — shortest-path tracer |
| **🔍 Find** | Natural-language search against the graph: "Who do I know at Acme?", "Mutual connections with Jane", "Most-introduced people" |

**Also: Local graph view (per entity)**

Every Person and Organization detail page has a "Show connections" button that displays just that entity's immediate 1-hop neighborhood (a focused mini-graph). This is the most useful day-to-day use of the graph data.

---

**Teams: dedicated sidebar section (Linear-style, outside Connections)**

Teams gets its own sidebar section — **outside Connections** because it represents internal operations (your studio's organization), not external network/CRM. Connections = your external relationships; Teams = your internal operations.

```
👨‍👩‍👧 Teams ▼            ← clickable header + collapsible (like Connections)
   🎨 Design Team
   💻 Dev Team
   📊 Strategy Team
   ➕ New team           ← inline action
```

**Behavior:**

- **Click "Teams" label** → opens `/teams` overview (cards of all teams with capacity/health at a glance)
- **Click ▼ chevron** → collapse/expand the children
- **Click a specific team** → opens that team's detail page (`/teams/design`, etc.)
- **Click "+ New team"** → opens team creation modal
- **Adaptive:** Hidden entirely for solo workspaces (workspace with only 1 member). Shows once a second member is added.

**Each team's detail page (`/teams/[slug]`):**

```
🎨 Design Team                       🔍   ✨   ⚙️ Settings
─ tabs ─
[ Overview ] [ Members ] [ Projects ] [ Capacity ] [ Performance ]
```

| Tab | What's shown |
|-----|--------------|
| **Overview** | Quick stats, AI insights, recent activity |
| **Members** | Who's on the team (drilled from People → Internal) |
| **Projects** | Active projects this team owns (drilled from Work) |
| **Capacity** | Current workload, allocation, free hours |
| **Performance** | Output metrics, completed projects, retro signals |

**The `/teams` overview page (clicked from "Teams" header):**

Same tab pattern as other pages:
```
👨‍👩‍👧 Teams                            🔍   ✨   ➕ New team
─ tabs ─
[ ⚡ Worth Attention ] [ All Teams ] [ + Save view ]
```

Team cards shown with capacity indicators, AI insights ("Design team at 110% this week — consider redistribution").

**Why Linear-style (specific teams in sidebar)?**

| Tradeoff | Linear-style (chosen) | Page-handled (rejected) |
|----------|----------------------|------------------------|
| Quick access | One click to any team | Two clicks (Teams → drill in) |
| Discoverability | All teams visible | Hidden until you visit /teams |
| Scaling | Works for 2-10 teams; >10 still OK | Always uniform |
| Matches familiar pattern (Linear) | ✓ | ✗ |
| Empty for solo users | ✓ (hidden via adaptive) | ✓ |

For SALT's target (agencies with 1-10 teams), Linear-style works well. If a workspace grows to 20+ teams, we'd revisit (likely add a "Show all teams" expand pattern).

**Team admin (creating team types, permissions, deletion) → Settings → Team Management.** The Teams sidebar section is for *operating* teams; Settings is for *configuring* them.

---

**Each Connections child page follows the same tab pattern**

Consistency across People, Work, and Payments. Every page has the same shape:

1. Header actions: 🔍 Search, ✨ Ask SALT, ➕ New
2. Default tab: ⚡ Worth Attention (AI-curated)
3. Entity-type filter tabs
4. + Save view (manual save + AI-suggested over time)

**👥 People page:**
```
[ ⚡ Worth Attention ] [ All ] [ Individuals ] [ Organizations ] [ Internal ] [ + Save view ]
```
- *Individuals* = external people (clients, prospects, partners)
- *Organizations* = companies
- *Internal* = your studio team members (where Teams folds in)

**📁 Work page:**
```
[ ⚡ Worth Attention ] [ Projects ] [ Retainers ] [ Agreements ] [ + Save view ]
```
- *Worth Attention* surfaces: stalled projects, expiring agreements, retainer renewals due
- *Agreements* = signed contracts (the artifact). Lifecycle tabs *inside* Agreements: Active / Expiring soon / Archived

**💰 Payments page:**
```
[ ⚡ Worth Attention ] [ Invoices ] [ Activity ] [ + Save view ]
```
- *Worth Attention* surfaces: overdue invoices, failed payments, drafts not yet sent
- *Activity* = payments received, refunds, failed payment events

**Important distinction: Proposals ≠ Agreements**

| Concept | Type | Where it lives |
|---------|------|---------------|
| **Agreement** | Noun (artifact) | Work → Agreements tab. The signed contract that governs work. |
| **Proposal** | Verb (workflow) | Created via "Ask SALT" → drafts an Action → reviewed → sent. Once signed, it becomes an Agreement. |

Proposals are an action you *do*, not a destination you *visit*. The proposal workflow (drafting, editing, sending) lives in the Actions queue, not as a sidebar/page item.

---

**Services & Rates → Settings (configuration, not daily work)**

The Services catalog is set-once-then-reference configuration. Lives at `Settings → Services & Rates`. Surfaces wherever needed:
- "+ Add service" line item in Invoice creation
- "+ Add service" line item in proposal-drafting workflow
- AI uses catalog as the menu when "Ask SALT" generates work artifacts

---

**Try section (Linear-inspired onboarding/discovery)**

Bottom of sidebar, below Favorites/Recents. Shows up to ~5 items helping new users complete setup. Items disappear once completed; the whole section hides when empty.

**Initial Try items (locked in for v1):**

| Item | Action | When it disappears |
|------|--------|---------------------|
| 📥 **Import contacts** | Opens import flow (CSV, Google Contacts, etc.) | After first import completed |
| ✨ **Train your AI voice** | Opens voice training flow (paste 5-10 sample messages → AI learns voice profile) | After voice profile has ≥10 samples |

**Future Try items (out of scope for v1, but the pattern supports):**
- Connect Stripe • Connect Google Calendar • Connect Gmail • Create first proposal template • Set up payment reminder defaults • Invite teammates • Create first client • Set up AI autonomy preferences

The section is intentionally minimal at launch — only items with clear "done" states. We'll expand as discovery patterns emerge from real users.

**Actions vs Messages split:**

| Surface | Contains | Mental model |
|---------|----------|--------------|
| **Actions** | AI-drafted replies awaiting approval, AI-proposed invoices, "AI wants to do X" requests, decisions AI can't make alone | Judge AI's work; yes / no / edit |
| **Messages** | Real human-to-human conversations (client portal, internal mentions, threads) | Have a conversation |

The split signals AI-first: Actions is for collaborating with AI, Messages is for collaborating with humans.

**Workspace Switcher dropdown (when clicked):**

```
┌─────────────────────────┐
│ ✓ My Agency             │  ← current
│   Side Hustle           │
│   Partner Co (guest)    │
│ ─────────────────       │
│ ⚙️  Workspace settings   │
│ + New Workspace         │
└─────────────────────────┘
```

Note: For Phase 4, the switcher is a stub showing only the current workspace. Real multi-workspace activates in Phase 7.

**Verification:**
- [ ] AppSwitcher removed, WorkspaceSwitcher in place
- [ ] Single unified sidebar (no nav changes when switching pages)
- [ ] Top section has exactly 3 items: Today, Inbox, Calendar
- [ ] Command Center + Insights live inside Today
- [ ] Section labels (PEOPLE/TEAMS/WORK/BILLING) render correctly
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

### Phase 6: AI-First Messages, Actions & Activity Log
**Timeline:** 3-4 weeks  
**Risk:** HIGH (AI behavior is complex and trust-sensitive)  
**Visible Changes:** YES — major AI capabilities, the moment SALT becomes truly AI-first

**Goal:** Turn the Actions and Messages surfaces (built in Phase 4) into intelligent, transparent, user-controllable AI experiences. AI drafts replies, sends acknowledgments, proactively reaches out, fires payment reminders — all with full audit trail and user-tunable autonomy.

**Core principles (the "glass box" doctrine):**

1. **Glass box, not black box** — every AI action is traceable: what, why, outcome, correction.
2. **Internal locus of control** — users feel they're in charge; AI assists. (See research-backed naming: chose **"Actions"** over "Approvals" / "Decisions" / "Inbox" — see Phase 4.)
3. **Trust gradient** — AI earns autonomy through demonstrated alignment with user voice. Starts conservative, promotes after N edit-free approvals.
4. **Commitment guardrails** — AI never auto-commits on behalf of humans (no deadlines, dollar amounts, scope changes auto-sent).
5. **Awareness surfaces** — humans always know what AI did. Three layers: HQ briefing, inline message markers, per-client activity feed.
6. **AI learning is reversible** — voice models are inspectable and resettable.

**Tasks:**

| # | Task | Type | Details |
|---|------|------|---------|
| 6.1 | Create AI schema | Migration | `ai_actions`, `ai_activity_log`, `ai_autonomy_settings`, `ai_voice_profiles`, `outreach_triggers` |
| 6.2 | Build intent classifier | AI/Code | Detects: acknowledgment, FAQ, commitment, scope-change, complaint, question |
| 6.3 | Build commitment guardrails | AI/Code | Blocks auto-send if reply contains commitment language (dates, money, scope, apology, refunds, legal) |
| 6.4 | Build voice profile learning | AI/Code | Learns user's tone, length, sign-offs, formality from edit patterns |
| 6.5 | Implement inbound reply drafting | AI/Code | AI drafts replies; routes to `auto_send` / `draft_queue` / `suggest_only` per settings |
| 6.6 | Implement proactive outreach engine | AI/Code | Triggers: silence, renewal, milestone, behavioral, meeting follow-up |
| 6.7 | Implement payment reminders | AI/Code | Tiered cadence: pre-due, +3d, +7d, +14d, +30d, failed-payment |
| 6.8 | Wire Actions page (built in Phase 4) | UI | Queue tab live; Activity tab live |
| 6.9 | Build activity log entries | UI | Four-part entry: **What / Why / Outcome / Correction** |
| 6.10 | Build "Worth reaching out" on HQ Today | UI | Proactive outreach surfacing with snooze/dismiss/stop-suggesting |
| 6.11 | Build per-message AI markers | UI | Inline 🤖 timestamp + "why was this auto-sent?" expander in Messages |
| 6.12 | Build AI Autonomy settings panel | UI | Per-user defaults, per-client overrides, commitment rules, always-escalate triggers |
| 6.13 | Build trust gradient | AI/Code | Auto-promote autonomy after 10 edit-free approvals; auto-demote on >30% edits |
| 6.14 | Build "What I learned" weekly digest | UI | Top of Activity tab shows pattern updates + reset controls |
| 6.15 | Build 30s undo + reasoning expander | UI | Every auto-send has 30s undo, every entry has "Why was this auto-sent?" |
| 6.16 | Build "Ask SALT" natural-language command | AI/UI | ✨ icon in Actions header (and global Cmd+K). Opens text input. AI parses natural language, drafts the action, shows preview, queues to Actions. Supports messages, invoices, scheduling, bulk outreach, automation setup. |
| 6.17 | Build prompt → action interpreter | AI/Code | Resolves entity references ("Sarah" → Sarah Chen), uses project + meeting context, classifies intent (compose/bulk/invoice/schedule/query/automation), produces structured draft |
| 6.18 | Build preview-before-queue UI | UI | After parsing, show "Here's what I'll do" with editable draft, context used, and [Edit / Refine prompt / Add to Queue / Send now] actions. Send now still bound by commitment guardrails. |
| 6.19 | Add ownership fields to entities | Migration | `ALTER TABLE people/organizations/projects ADD COLUMN owner_membership_id UUID REFERENCES workspace_memberships(id)`. Enables AI to route Actions to the correct human. |
| 6.20 | Build `workspace_action_routing` table | Migration + Code | Role-based default routing: `(workspace_id, action_category, default_role)`. Used when entity has no specific owner. |
| 6.21 | Build AI coordination layer | AI/Code | Before AI acts: check presence locks, dedupe checks, ownership routing, related-entity pending actions, owner's settings. Implements "one AI brain, many hands" architecture. |
| 6.22 | Build Actions queue tabs | UI | Tabs on `/actions`: **Yours** (default) / **Team** / **All** / **Unassigned**. Real-time presence indicators when teammate is drafting. |
| 6.23 | Build OOO flag + deputy assignment | UI/Code | Users can mark themselves OOO; AI routes their Actions to designated deputy. UI in profile/settings. |
| 6.24 | Build ownership transfer flow | UI/Code | Manual reassignment via right-click on Actions. Auto-trigger on offboarding (forces explicit reassignment before user is removed). Activity log records handoffs. |
| 6.25 | Implement settings hierarchy | Code | Per-entity → owner → role → workspace → app. Apply correct precedence when AI determines autonomy levels, voice profile, etc. |
| 6.26 | Build Capture AI routing pipeline | AI/Code | Entity extraction (NER), intent classification, confidence scoring on every capture. Three-tier routing: HIGH confidence → auto-route + activity log; LOW confidence → Action for review; COMMITMENT language → always Action. |
| 6.27 | Build voice capture | AI/Code | 🎤 button in Capture box → record → transcribe → run through same routing pipeline. Press-and-hold UX. Supports "just got off a call" workflow. |
| 6.28 | Build capture trust gradient | AI/Code | Same trust gradient as inbound replies: auto-routing promoted after N edit-free approvals, demoted on >30% corrections. Per-routing-pattern (e.g., "person mentions" promoted independently from "action items"). |
| 6.29 | Build cross-owner Capture handoff | AI/Code | If user captures about a teammate-owned entity, AI offers FYI handoff to owner's Actions queue (not silent forwarding). Respects multi-AI coordination layer. |

---

#### 6.1 Schema preview

```sql
-- AI Actions queue (pending items needing human input)
CREATE TABLE ai_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL,        -- 'reply_draft', 'outbound_check_in', 'payment_reminder', 'invoice_send'
  related_entity_type TEXT,          -- 'message_thread', 'person', 'organization', 'invoice', 'project'
  related_entity_id UUID,
  draft_content JSONB NOT NULL,
  context JSONB DEFAULT '{}',        -- what AI used to draft this
  reasoning TEXT,
  confidence_score NUMERIC(3,2),
  trigger_reason TEXT,               -- 'silence_30d', 'milestone_complete', 'invoice_overdue_3d'
  status TEXT DEFAULT 'pending',     -- pending|approved|rejected|edited_and_sent|auto_sent|expired|snoozed
  snoozed_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

-- Activity log (every AI decision, including auto-sends and non-actions)
CREATE TABLE ai_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  action_id UUID REFERENCES ai_actions(id),
  event_type TEXT NOT NULL,          -- 'auto_sent', 'queued', 'escalated', 'did_not_act', 'learned_pattern'
  what JSONB,                        -- the content/action taken
  why JSONB,                         -- reasoning, rules triggered, confidence
  outcome JSONB,                     -- what happened next (sent, approved, edited %, time-to-resolve)
  correction JSONB,                  -- if user marked as wrong, the diff
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ai_activity_log_time ON ai_activity_log(studio_id, created_at DESC);

-- Autonomy settings (per user + per-client overrides)
CREATE TABLE ai_autonomy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  scope_type TEXT NOT NULL,          -- 'default', 'per_person', 'per_organization'
  scope_id UUID,                     -- person/org id when scoped
  category TEXT NOT NULL,            -- 'acknowledgments', 'faq', 'project_updates', 'payment_reminders'
  autonomy_level TEXT NOT NULL,      -- 'auto_send', 'draft_queue', 'suggest_only', 'never'
  threshold_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, scope_type, scope_id, category)
);

-- Voice profile learning
CREATE TABLE ai_voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  patterns JSONB DEFAULT '{}',       -- avg length, sign-offs, formality, common phrases
  per_client_overrides JSONB DEFAULT '{}',
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Outreach triggers (what causes proactive reach-out)
CREATE TABLE outreach_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
    -- 'silence', 'renewal_approaching', 'milestone_complete', 'proposal_viewed_unanswered',
    -- 'meeting_followup', 'invoice_due', 'invoice_overdue', 'birthday', 'anniversary'
  is_enabled BOOLEAN DEFAULT TRUE,
  threshold_config JSONB DEFAULT '{}', -- days, percentages, amounts
  max_frequency JSONB DEFAULT '{}',    -- per_client_per_month, per_global_per_week, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### 6.2 Autonomy levels

| Level | What AI does | Default use |
|-------|-------------|-------------|
| `auto_send` | Sends without asking. Shows up in activity log + inline marker on the message. 30s undo. | Acknowledgments, FAQ matches, meeting confirmations |
| `draft_queue` | Drafts content, queues in Actions, waits for approval. | Project updates, check-ins, outbound outreach |
| `suggest_only` | Shows inline suggestion when user composes; never drafts proactively. | High-stakes conversations, new clients, sensitive topics |
| `never` | AI does not participate in this category at all. | Things user wants 100% manual control over |

---

#### 6.3 Commitment guardrails (always escalate, regardless of category settings)

These triggers bypass auto-send even when the message looks routine. Detected via intent classifier on AI's own draft:

| Trigger | Why |
|---------|-----|
| Deadline language ("by Friday", "next week", "soon") | Creates schedule commitments |
| Dollar amounts or price discussion | Creates financial commitments |
| Scope-expansion language ("yes, we can add that") | Creates project commitments |
| Apology for our error | Creates relationship/legal exposure |
| Refund / credit offers | Creates financial commitments |
| Legal / contract questions | Creates legal exposure |
| Negative sentiment in incoming message | Difficult conversation, human judgment needed |
| First reply in new thread (new client) | Establishes relationship tone |

---

#### 6.6 Proactive outreach engine — triggers

AI watches signals and surfaces opportunities to reach out. Outbound never auto-sends; always drafts to the Actions queue.

| Trigger | Example | Default cadence guard |
|---------|---------|----------------------|
| **Silence** | No contact in 30/60/90 days (configurable per client tier) | Max 1 suggestion per client per month |
| **Milestone passed** | Project shipped, anniversary of working together | One-shot per event |
| **Renewal approaching** | Contract renewal in 30 days | 1 reminder, then auto-stop |
| **Behavioral** | Client viewed proposal but didn't respond in 5 days | Once per artifact |
| **Meeting follow-up** | A meeting happened but no follow-up sent in 48h | 1 per meeting |
| **Stale project** | No project activity in 14 days | 1 per project per month |
| **Calendar event** | Birthday, work anniversary (opt-in, off by default) | Per-event |

Content quality requirement: AI must reference real context (Recall meeting transcripts, project notes, last conversation topic). If insufficient context, AI surfaces it as a suggestion without drafting ("I don't have enough context to write a non-generic check-in").

---

#### 6.7 Payment reminders — trigger schedule (defaults)

| Days from due date | Type | Default autonomy | Tone |
|--------------------|------|------------------|------|
| -3 (before due) | Friendly pre-reminder | `auto_send` | Helpful FYI |
| +3 (after due) | "Just a heads up" reminder | `auto_send` | Light, no pressure |
| +7 | Polite escalation | `draft_queue` | Clear ask |
| +14 | Direct ask | `draft_queue` | Firm but professional |
| +30 | Final notice / collections framing | `suggest_only` | High-stakes — human writes |
| Payment failed | Retry communication | `draft_queue` | Card update prompt |

Every reminder respects commitment guardrails. Any reply referencing payment plans or refunds escalates regardless of autonomy.

---

#### 6.9 Activity log entry structure (the four-part pattern)

Every entry on the Activity tab shows:

```
─────────────────────────────────────────────────────────────────
🤖 Today, 14:02   Auto-sent reply to Sarah Chen (Acme Corp)
─────────────────────────────────────────────────────────────────
   What:    "You're welcome — let me know if you need anything else!"

   Why:     Detected as acknowledgment-pattern (94% confidence)
            Settings rule: "Auto-send acknowledgments" is ON
            Client tier: Trusted (12 successful auto-sends to date)

   Outcome: ✓ Sent
            ✓ No commitment language detected
            ✓ Within autonomy budget for this client

   Actions: [View thread]  [This was wrong]  [Adjust rule]
─────────────────────────────────────────────────────────────────
```

The four parts (**What / Why / Outcome / Correction**) are non-negotiable. Every entry must have all four, even if "Outcome" is just "Waited for user."

---

#### 6.10 Actions page layout (built in Phase 4, wired in Phase 6)

```
┌────────────────────────────────────────────────────────────────┐
│ ⚡ Actions                                                     │
│ ┌────────────┬─────────────┐                                  │
│ │   Queue    │   Activity  │   ← tabs on page                 │
│ │   (3)      │             │                                  │
│ └────────────┴─────────────┘                                  │
│                                                                │
│ Queue tab: pending items needing approval (ranked)            │
│ Activity tab: full audit log + "what I learned" digest        │
└────────────────────────────────────────────────────────────────┘
```

---

#### 6.12 AI Autonomy settings panel

```
Settings → AI Autonomy

╭─ Auto-send categories ───────────────────────────────────────╮
│  ☑ Acknowledgments (thanks, got it, received, etc.)          │
│  ☑ FAQ answers (matches saved Q&A library)                   │
│  ☑ Meeting confirmations (no schedule changes)               │
│  ☐ Project status updates                                    │
│  ☐ Anything mentioning pricing                               │
│  ☐ Anything mentioning deadlines                             │
╰──────────────────────────────────────────────────────────────╯

╭─ Per-client overrides ───────────────────────────────────────╮
│  🏢 Acme Corp           [Auto-send: 5 categories]   [Edit]   │
│  🏢 Beta Inc            [Draft + approve only]      [Edit]   │
│  🏢 New Prospect Co     [Suggest only]              [Edit]   │
│  Default for new clients:  [Suggest only ▼]                  │
╰──────────────────────────────────────────────────────────────╯

╭─ Proactive outreach ─────────────────────────────────────────╮
│  ☑ Suggest check-ins when clients go quiet                   │
│      Threshold: [30] days   Max: [1 per client per month]    │
│  ☑ Suggest meeting follow-ups (within 48h)                   │
│  ☑ Suggest renewal nudges (30 days before)                   │
│  ☑ Suggest project milestone celebrations                    │
│  ☐ Birthday / anniversary messages (off by default)          │
│  Note: Outbound never auto-sends, always drafts to Actions.  │
╰──────────────────────────────────────────────────────────────╯

╭─ Payment reminders ──────────────────────────────────────────╮
│  ☑ Send pre-due reminder        [3] days before due          │
│  ☑ Send first overdue reminder  [+3] days after due          │
│  ☑ Send second reminder         [+7] days   [Auto-send: OFF] │
│  ☑ Send third reminder          [+14] days  [Auto-send: OFF] │
│  ☑ Surface collections drafts   [+30] days  [Suggest only]   │
╰──────────────────────────────────────────────────────────────╯

╭─ Always escalate to me ──────────────────────────────────────╮
│  ☑ Anything containing "yes" + a date                        │
│  ☑ Anything containing dollar amounts                        │
│  ☑ First reply in a new thread                               │
│  ☑ Reply to an angry/frustrated message (sentiment check)    │
│  ☑ Reply containing "we will" / "we can" / "we'll"           │
╰──────────────────────────────────────────────────────────────╯

╭─ Trust building ─────────────────────────────────────────────╮
│  ☑ Start new clients at "Suggest only"                       │
│  ☑ Promote to "Auto-send" after 10 edit-free approvals       │
│  ☑ Demote back if I edit > 30% of a draft                    │
│  ☑ Notify me when AI's autonomy level changes                │
╰──────────────────────────────────────────────────────────────╯
```

---

#### Awareness surfaces — three layers so humans always know what happened

1. **HQ Today briefing** — Morning recap:
   ```
   🤖 Since yesterday:
      • Sent 4 replies on your behalf (2 acknowledgments, 1 FAQ, 1 confirmation)
      • 0 commitments made
      • 3 drafts waiting in Actions
      • 2 clients you haven't talked to in 30+ days (Worth reaching out)
      → See full activity log
   ```

2. **Inline message markers** — every auto-sent message in a thread:
   ```
   14:02   🤖 Auto-sent at 14:02 (Auto-reply: acknowledgment)
           "You're welcome — let me know if you need anything else!"
           [Why was this auto-sent?] [Mark as wrong]
   ```

3. **Per-client activity feed** — on each person/organization detail page:
   ```
   Acme Corp — Activity
   ─────────────────────────
   🤖 14:02   Auto-replied: "You're welcome..."
   ✋ Yesterday  You approved AI draft: "Yes, Friday works..."
   🤖 Mon     Auto-replied: "Office hours are 9-5"
   ```

---

#### 6.16 "Ask SALT" — natural-language command bar

A ✨ compose icon lives in the Actions page header (Linear-inspired, top right of workspace name + search). Also accessible globally via Cmd+K → "Ask SALT."

**UI pattern:**
```
┌──────────────────────────────────────────────────────────────┐
│  ✨ Ask SALT to do something                            ✕    │
│ ─────────────────────────────────────────────────────────── │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Draft a follow-up to Sarah at Acme about Q3 rebrand_  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Examples:                                                   │
│   • "Send a check-in to clients quiet for 60+ days"         │
│   • "Generate an invoice for Beta Inc for $3,500 Q2 work"   │
│   • "Schedule a 30-min sync with Mike next Tuesday PM"      │
│   • "Write a project update for Acme showing this week"     │
│                                                              │
│                              [Cancel]  [Create Action →]    │
└──────────────────────────────────────────────────────────────┘
```

**Flow:**
1. User types natural language
2. AI parses → resolves entities, retrieves context, classifies intent
3. **Preview-before-queue:** shows what will be done before committing
   ```
   ✨ Here's what I'll do:
   ───────────────────────────────────────────────
   Action: Send message to Sarah Chen (Acme Corp)
   Content: [editable draft visible]
   Why: You asked for a follow-up about Q3 rebrand
   Context used: Last conversation (Apr 28), project notes
   
   [Edit content] [Refine prompt] [Add to Queue] [Send now*]
   ───────────────────────────────────────────────
   *Send now blocked if commitment guardrails fire
   ```
4. Lands in Actions queue with full activity log entry

**Supported command types:**

| Command type | Example | Result |
|--------------|---------|--------|
| Compose message | "Draft a check-in to Mike" | Message draft in Actions |
| Bulk outreach | "Send check-ins to clients quiet 60+ days" | Multiple drafts, batch approve |
| Create invoice | "Invoice Beta Inc $3,500 for Q2 work" | Invoice draft in Actions |
| Schedule meeting | "Sync with Mike next Tuesday afternoon" | Calendar proposal with time slots |
| Generate content | "Write a project update for Acme" | Document draft in Actions |
| Query / report | "Show me revenue trend for last 6 months" | Report rendered inline (no Action created) |
| Set up automation | "Remind me to check in with Acme every 30 days" | Creates `outreach_trigger` rule |

**Difference from Linear's compose:**

| Linear | SALT "Ask SALT" |
|--------|----------------|
| Structured form (title, project, labels) | Natural language input |
| Deterministic record | AI-interpreted draft with preview |
| Always shows form fields | Shows AI's interpretation before committing |

---

#### 6.26–6.29 Capture: AI-routed scratchpad ("the mouth of the AI funnel")

**The problem this solves:** In an AI-first product, AI's biggest weakness is that it only knows what you tell it. Without a frictionless capture surface, AI is stuck inferring from messages/meetings/projects — missing everything you just heard in a hallway conversation, on a phone call, or thought of in the shower.

Capture isn't a "Notes app." It's the **unstructured-input funnel** where AI catches your word-vomit and routes it.

**Naming research:** "Capture" wins over Notes/Jot/Brain/Stash on five dimensions: verb-derived noun (low cognitive load, matches "Actions"), signals AI participation, zero-friction framing ("capture first, organize later" — Forte Labs' Building a Second Brain), industry-validated terminology, distinct from passive "Notes."

**The capture flow:**

```
1. You type/speak a capture        → saves IMMEDIATELY (zero friction)
2. AI analyzes in background       → ~2 seconds
3. Routing decision (three-tier):
   ┌── HIGH confidence + clean    → Auto-route. Activity log. 30s undo.
   ├── LOW confidence              → Create Action: "Where should this go?"
   └── COMMITMENT language         → Always create Action (consistent with guardrails)
```

**Example:**

Raw capture (text or voice):
> *"Sarah said Tuesday is bad for Q3 launch, suggested pushing to following week. Also Mike likes the new logo direction but wants one more iteration."*

AI extracts and routes:

| Piece | Routes to | Type |
|-------|-----------|------|
| "Sarah said..." | Note on Sarah Chen profile | Auto-route |
| Q3 timeline shift | Note on Q3 project + Action: "Confirm new launch date" | Action (commitment-adjacent) |
| Mike likes logo | Note on Mike Hart profile | Auto-route |
| "wants one more iteration" | Action: "Draft third logo iteration" | Action (task language) |

**Sidebar placement:** Top section alongside HQ / Actions / Messages — it's a daily command-center tool, not a content destination.

```
🏢 HQ
⚡ Actions             [3]
💬 Messages            [•]
✨ Capture                          ← here
```

**Plus global shortcut:** `Cmd+Shift+N` opens a floating capture window from any page. Type → save → back to work in 5 seconds.

**Page layout:**

```
✨ Capture                              🔍   🎤 Voice   ⚙️
─ tabs ─
[ ⚡ Recent ] [ All ] [ Auto-routed ] [ Needs review ] [ + Save view ]
─────────────────────────────────────────────────────────────
[ Always-on quick-capture box at top:                          ]
┌──────────────────────────────────────────────────────────────┐
│  What's on your mind?  (Cmd+Enter to save)        🎤  ✕     │
└──────────────────────────────────────────────────────────────┘

Recent capture cards with routing transparency:
┌──────────────────────────────────────────────────────────────┐
│ 🕐 2h ago • You                                              │
│ "Sarah said Tuesday is bad for Q3 launch..."                │
│                                                               │
│ ✅ Auto-routed:                                              │
│    → Note added to Sarah Chen                                │
│    → Note added to Q3 project                                │
│    → Action created: "Confirm new launch date"               │
│ [Undo] [View activity]                                       │
└──────────────────────────────────────────────────────────────┘
```

**Schema:**

```sql
CREATE TABLE captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  source TEXT NOT NULL,              -- 'text', 'voice', 'imported'
  voice_audio_url TEXT,              -- for voice captures
  ai_extracted JSONB,                -- {entities, dates, intents, confidence}
  routed_to JSONB,                   -- [{entity_type, entity_id, relation, auto_routed}]
  status TEXT,                       -- 'unprocessed', 'auto_routed', 'pending_review', 'completed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
```

**Why three-tier routing (not "everything → Actions"):**

- If every capture became an Action, you'd have 50 Actions/day. Captures should be the *low-friction inflow*; Actions are the *judgment queue*.
- Captures with high confidence resolve themselves (with full transparency in activity log)
- Only uncertain or high-stakes captures surface for review

**Why not auto-route everything:**

- Research shows over-automation erodes trust (UXmatters: "anticipatory systems can inadvertently undermine user autonomy")
- Commitment-language captures must always be reviewed (consistent with existing guardrails)
- Trust gradient lets users earn auto-routing per pattern

**Integration with existing systems:**

| System | How Capture uses it |
|--------|---------------------|
| Actions queue | Low-confidence + commitment-language captures become Actions |
| Activity log | Every capture + every routing decision logged (What/Why/Outcome/Correction) |
| Voice profile | AI uses your voice profile to summarize captures and propose drafts |
| Ownership model | Captures route to entities owned by you; capture about teammate's client offers FYI handoff |
| Multi-AI coordination | Presence locks if multiple users are processing the same capture |
| Trust gradient | Auto-routing promoted after pattern-matched approvals; demoted on corrections |
| Commitment guardrails | Captures with dates/$/scope language → always Action |

**Voice notes (the killer unlock):**

🎤 button → press-and-hold to record → AI transcribes → same routing pipeline. Especially powerful for "just got off a call" or "driving from a meeting" moments where typing is impossible.

---

#### 6.19–6.25 Multi-AI coordination architecture (critical for team workspaces)

**The architectural problem this solves:**

In a team workspace where each member has AI assistance, multiple AIs acting independently create catastrophic UX failures:

| Failure mode | What goes wrong without coordination |
|--------------|--------------------------------------|
| **Duplicate proactive outreach** | AI tells Alice "check in with Sarah." Also tells Bob. Sarah gets two check-ins from the same agency. |
| **Conflicting auto-replies** | Sarah emails the team. Alice's AI auto-replies "Friday works." Bob's AI also auto-replies "next Tuesday." Contradictory messages reach Sarah. |
| **Race conditions** | Both Alice and Bob have an Action for the same thread. They each draft a reply. Whoever clicks Send first wins; the other person wasted 5 minutes. |
| **Conflicting insights** | AI tells Alice "Sarah is at risk." Also tells Bob. Both reach out separately. Sarah thinks the agency is panicking. |
| **Voice conflicts** | Alice's voice profile is formal, Bob's is casual. For Sarah's thread (a shared client), whose voice does AI use? |
| **Settings conflicts** | Alice has auto-send ON, Bob has auto-send OFF. For shared threads, which wins? |

**The principle: "One AI brain, many hands"**

There is **one AI per workspace**, not one per user. The workspace-AI knows the team structure and routes work to the appropriate owner. Each user has their own voice profile (writing style), but the proactive engine, the Actions queue, and the coordination logic are all workspace-scoped.

**Ownership model:**

Every Person, Organization, and Project has an `owner_membership_id` — a single team member who's responsible for that entity. AI routing flows through this:

```
Before AI takes an Action on entity X:
  1. Has X been touched in last N hours by anyone? (dedupe check)
  2. Is anyone currently drafting for X? (presence lock)
  3. Does X have an explicit owner? → route to owner
  4. No owner? → fall through to role-based routing (workspace_action_routing)
  5. Apply owner's voice profile + autonomy settings
```

**Action routing by type:**

| Action type | Routes to |
|-------------|-----------|
| Proactive outreach (silence, milestone, renewal) | Entity owner only — eliminates duplication |
| Inbound reply drafting | Entity owner; if OOO → designated deputy |
| Auto-send authority | Entity owner only — others can view but not auto-send |
| Insights visibility | Everyone on team sees; Actions go only to owner |
| Approvals | Owner approves; admins can override |

**Actions queue tabs (workspace-scoped):**

```
⚡ Actions
[ Yours (3) ] [ Team (12) ] [ All (15) ] [ Unassigned (2) ]
```

| Tab | Shows |
|-----|-------|
| **Yours** (default) | Actions owned by you |
| **Team** | Actions owned by teammates (visible, can claim) |
| **All** | Everything in the workspace |
| **Unassigned** | AI couldn't determine owner — needs human routing |

**Real-time presence indicators on shared work:**

```
⚡ Reply to Sarah Chen (Acme Corp)
   🔒 Alice is drafting this (started 2 min ago)
   [Take over] [Watch]
```

Prevents race conditions. Teammates see when work is in progress.

**Settings hierarchy (when conflicts arise):**

When the same setting differs across levels, this order resolves:

1. **Per-entity overrides** (e.g., "AI hands-off for Acme — manual only")
2. **Per-entity owner's settings**
3. **Per-role defaults** (e.g., "Account leads use formal voice")
4. **Workspace defaults**
5. **App defaults**

**Edge cases handled:**

| Edge case | Resolution |
|-----------|-----------|
| Owner is OOO | AI checks `out_of_office` flag → routes to designated deputy |
| Owner leaves the company | Ownership transfer flow during offboarding (forces explicit reassignment) |
| No clear owner | AI surfaces "Who owns this?" Action to admins |
| Multi-owner relationship | Primary owner + secondary collaborators. Primary's AI acts; secondaries see and can claim |
| Cross-team handoff | Ownership change creates activity log entry; new owner's settings/voice apply going forward |

**Why this must be scoped from Day 1 of Phase 6:**

Retrofitting coordination into a per-user AI system is extremely painful. The workspace-AI + ownership model has to be baked in from the start:
- No duplicate outreach across team members
- No contradictory auto-replies
- Clear audit trail of who handled what
- Settings hierarchy is explicit, not ambiguous
- Scales from solo freelancer to 50-person agency

---

**Verification:**
- [ ] AI never auto-sends when commitment guardrails trigger
- [ ] Every auto-sent message has visible reasoning + 30s undo
- [ ] Activity log entries always have all 4 parts (what/why/outcome/correction)
- [ ] Settings allow per-client override of all autonomy levels
- [ ] HQ Today shows "Worth reaching out" + yesterday's AI summary
- [ ] Payment reminders fire on schedule with correct autonomy levels
- [ ] Proactive outreach never auto-sends (always drafts to Actions)
- [ ] Voice profile learning visible and resettable
- [ ] Activity log entries can be exported (CSV/JSON for audit / compliance)
- [ ] AI refuses to draft if context is insufficient (no generic filler)
- [ ] Trust gradient promotes/demotes based on edit patterns
- [ ] User receives notification when autonomy level changes
- [ ] "Ask SALT" compose icon is visible on Actions page header
- [ ] "Ask SALT" parses entity references and pulls real context
- [ ] "Ask SALT" preview always shown before queueing (no silent creation)
- [ ] Cmd+K → "Ask SALT" works globally
- [ ] **Multi-AI coordination:** no duplicate Actions across team members for same entity
- [ ] Presence locks prevent race conditions on shared drafts
- [ ] Ownership routing: Action goes to entity owner, not all team members
- [ ] Actions queue tabs (Yours/Team/All/Unassigned) work correctly
- [ ] OOO flag routes Actions to designated deputy
- [ ] Ownership transfer flow blocks offboarding without explicit reassignment
- [ ] Settings hierarchy (entity → owner → role → workspace → app) resolves correctly
- [ ] One workspace-AI architecture: no per-user AI brains acting independently
- [ ] **Capture:** quick-capture box saves immediately (zero friction, no spinner blocking)
- [ ] Capture: three-tier routing works (high-confidence auto-routes, low-confidence → Action, commitment language → Action)
- [ ] Capture: voice input transcribes and routes through same pipeline
- [ ] Capture: every auto-routed capture has 30s undo + activity log entry
- [ ] Capture: trust gradient promotes/demotes per pattern
- [ ] Capture: cross-owner handoff offers FYI to teammate (not silent forward)
- [ ] Cmd+Shift+N opens floating capture window from any page

---

### Phase 7: Linking & Search (Obsidian Magic)
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

### Phase 8: Multi-Workspace (Future)
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
| Phase 6: AI-First Messages, Actions & Activity | 3-4 weeks | Week 6-9 |
| Phase 7: Linking/Search | 5-7 days | Week 10-11 |
| **Total** | **~11 weeks** | |

Phase 8 (Multi-Workspace) is deferred.

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
app/_features/shell/components/AppSidebar.tsx (update - unify nav)
app/_features/shell/components/AppSwitcher.tsx (delete - replaced)
app/_features/shell/components/WorkspaceSwitcher.tsx (new)
app/_features/shell/routes.ts (update)
app/_features/hq/components/TodayPage.tsx (update - absorb Command Center + Insights)
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
| Sidebar architecture | Per-app (AppSwitcher) vs Unified (single sidebar) | **Unified + WorkspaceSwitcher** | **Decided 2026-05-14** |
| Top items consolidation | 5 items (Today/Inbox/CC/Insights/Calendar) vs 3 (Today/Inbox/Calendar) vs 2 (Home/Inbox) | **Option C: 3 items** — CC + Insights merge into Today | **Decided 2026-05-14** |
| Inbox naming | "Inbox" vs "Approvals" vs "Decisions" vs "Actions" vs "Drafts" | **"Actions"** — internal locus of control, no decision-fatigue framing, closable loops, verb energy | **Decided 2026-05-14** |
| Inbox split | One queue vs split into AI-items + human conversations | **Split: Actions + Messages** | **Decided 2026-05-14** |
| HQ view switcher placement | Sidebar dropdown vs page-level tabs | **Page-level tabs** (Today / Week / Month) | **Decided 2026-05-14** |
| People section structure | 4 sub-items vs co-equal People+Orgs vs unified single item | **Unified single item** with page-level entity filters | **Decided 2026-05-14** |
| People & Organizations relationship | Nested (Orgs under People) vs co-equal peers | **Co-equal peers**, page treats them together; both support standalone records | **Decided 2026-05-14** |
| Saved Views pattern | Sidebar Views (Linear) vs page-level tabs (Notion) vs AI-suggested | **Page-level + AI-suggested hybrid** (Options 2+3) | **Decided 2026-05-14** |
| Connections feature name | "Network" vs "Relationships" vs "Connections" | **"Connections"** — most linguistically precise (a connection = a link), avoids Network's transactional baggage, avoids Relationships' abstractness, supports natural verb ("connect with"). No "Network" anywhere in the UI. | **Decided 2026-05-14** |
| Connections page structure | Graph-only vs destination with sub-features | **Destination with 4 tabs: Graph / Insights / Paths / Find** | **Decided 2026-05-14** |
| Graph view scope | People-only vs everything-with-filters | **Everything with filters** — cross-entity paths are where the magic lives | **Decided 2026-05-14** |
| Graph placement | Sidebar vs Cmd+K vs entity detail pages | **Both: `/connections` destination (clicked from group header) + local "Show connections" button on entity detail pages** | **Decided 2026-05-14** |
| Connections sidebar role | Standalone item vs section header vs both | **Clickable section header that doubles as a destination** — label opens `/connections`, ▼ collapses children. Linear-inspired Workspace pattern. | **Decided 2026-05-14** |
| Connections children | People + Teams + Work + Billing vs People + Work + Billing | **People + Work + Billing** (Teams folded into People as a filter; team admin lives in Settings) | **Decided 2026-05-14** |
| Teams as a sidebar item | Yes (separate destination) vs No (filter inside People) | **No** — teams are a grouping applied to People; schema unchanged, surfacing simplified | **Decided 2026-05-14** |
| Bottom-of-sidebar "Try" section | Yes (Linear-inspired) vs No | **Yes** — onboarding/discovery. v1 items: "Import contacts" + "Train your AI voice". Auto-hides items on completion. | **Decided 2026-05-14** |
| Page tabs vs sidebar dropdowns for sub-items | Dropdowns (3-4 items each section) vs page tabs | **Page tabs** for People/Work/Payments. Consistent pattern: Worth Attention default, entity-type filters, + Save view. | **Decided 2026-05-14** |
| Billing rename | Keep "Billing" vs rename | **Renamed to "Payments"** (friendlier, action-oriented, modern). Services moved to Settings. Sub-tabs: Invoices + Activity. | **Decided 2026-05-14** |
| Proposals vs Agreements | Unified ("Agreements" tabs by lifecycle) vs separate concepts | **Separate concepts:** Agreements = noun (signed contract artifact, lives in Work). Proposals = verb (workflow via Ask SALT → Actions queue → signed → becomes Agreement). | **Decided 2026-05-14** |
| Favorites section | Keep (Linear-style pinning) vs Remove | **Removed.** AI-first lens makes it redundant: Cmd+K = fast access, Worth Attention = AI-curated priorities. Manual pinning creates stale lists. | **Decided 2026-05-14** |
| Recents section | Keep vs Remove | **Removed.** Cmd+K already shows recents; Worth Attention covers what matters. Chronological history is a vestigial pattern in AI-first products. | **Decided 2026-05-14** |
| Teams placement | Inside Connections vs Outside | **Outside Connections.** Connections = external network; Teams = internal operations. Different mental models. | **Decided 2026-05-14** |
| Teams sidebar structure | Single item (page handles drilling) vs Linear-style (specific teams in sidebar) | **Linear-style:** `Teams ▼` is a collapsible clickable header with specific team names (Design Team, Dev Team, etc.) listed underneath. + New team inline. Adaptive: hidden entirely for solo workspaces. | **Decided 2026-05-14** |
| Multi-AI coordination architecture | Per-user AI (independent) vs Workspace-AI (coordinated) | **Workspace-AI with ownership routing.** "One AI brain, many hands." Every entity has owner_membership_id. AI dedupes, presence-locks, and routes Actions to entity owner. Voice profiles stay per-user. | **Decided 2026-05-14** |
| Actions queue scope | Per-user queue vs Workspace queue | **Workspace queue with ownership filters.** Tabs: Yours / Team / All / Unassigned. Real-time presence indicators on shared work. | **Decided 2026-05-14** |
| Quick-capture feature | Add vs not | **Added as "Capture"** — sidebar item in top section (with HQ/Actions/Messages) + Cmd+Shift+N global shortcut. AI-routed scratchpad — the "mouth of the AI funnel." | **Decided 2026-05-14** |
| Capture naming | Notes vs Capture vs Jot vs Brain | **"Capture"** — research-backed: verb-derived noun, signals AI participation, matches Forte Labs / Building a Second Brain mental model, distinct from passive "Notes." | **Decided 2026-05-14** |
| Capture routing | All → Actions vs Auto-route all vs Three-tier | **Three-tier:** HIGH confidence → auto-route + activity log; LOW confidence → Action; COMMITMENT language → Action (always). Trust gradient applies per-pattern. | **Decided 2026-05-14** |
| Voice notes in Capture | Yes vs No | **Yes** — 🎤 press-and-hold recording, transcribed, runs through same routing pipeline. Critical for "just got off a call" workflow. | **Decided 2026-05-14** |
| Services catalog location | Inside Payments vs Settings | **Settings → Services & Rates** (set-once configuration, not daily nav). Surfaces in invoice/proposal workflows. | **Decided 2026-05-14** |

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
| 2026-05-14 | Phase 4 updated: unified sidebar + WorkspaceSwitcher + Option C consolidation (Today/Inbox/Calendar) |
| 2026-05-14 | Top section finalized: HQ + Actions + Messages (Inbox split, Calendar absorbed into HQ views). "Actions" name chosen via psychology research. |
| 2026-05-14 | NEW Phase 6: AI-First Messages, Actions & Activity Log. Includes tiered autonomy, commitment guardrails, proactive outreach, payment reminders, 4-part activity log, voice learning, trust gradient. Phases 6→7, 7→8 renumbered. |
| 2026-05-14 | Added "Ask SALT" natural-language command bar (✨ compose icon in Actions header + Cmd+K). Linear-inspired but for AI: parses prompts, drafts actions, shows preview before queueing. Tasks 6.16–6.18. |
| 2026-05-14 | People section finalized: single sidebar item with page-level entity filters. People + Organizations are co-equal peers (not nested). Both support standalone records (freelancer clients, org-only entries). Saved Views = page-level + AI-suggested (not sidebar). Research-backed via NN/G cognitive load, CRM data-model literature, Sentry industry shift. |
| 2026-05-14 | Added Connections sidebar item (relationship intelligence hub). Page has 4 tabs: Graph / Insights / Paths / Find. "Network" removed from UI entirely — "Connections" is used throughout for clarity. Local "Show connections" button on entity detail pages. Research-backed name choice via Misner/BNI transactional-vs-relational literature, LinkedIn connections semantics, Relationship Marketing depth literature. |
| 2026-05-14 | Restructured sidebar: `Connections` becomes a clickable + collapsible section header (Linear "Workspace" pattern). Children: People + Work + Payments. Teams dropped as sidebar item — folded into People as a filter; team admin moves to Settings. Added "Try" section at bottom (Linear-inspired) with v1 items: Import contacts + Train your AI voice. |
| 2026-05-14 | Billing renamed to **Payments** (friendlier, action-oriented). Services catalog moved to Settings → Services & Rates. Payments page tabs: Worth Attention / Invoices / Activity. |
| 2026-05-14 | **Proposals separated from Agreements**: Agreements = noun (signed contract artifact, lives in Work tab). Proposals = verb (workflow via "Ask SALT" → drafts an Action → reviewed → sent. Once signed, becomes an Agreement). |
| 2026-05-14 | Each Connections child page (People / Work / Payments) follows the same tab pattern: Worth Attention default + entity-type filters + Save view. No sidebar dropdowns for sub-items — page tabs only. Consistent pattern across all sections for muscle memory. |
| 2026-05-14 | Removed "app" terminology from plan and diagrams. SALT is now a unified vision — no app-switching concept. |
| 2026-05-14 | Removed Favorites from sidebar. AI-first surfaces (Worth Attention) + Cmd+K replace the need for manual pinning. |
| 2026-05-14 | Removed Recents from sidebar. Cmd+K already provides recents; Worth Attention covers relevance. Chronological history is vestigial in AI-first products. |
| 2026-05-14 | **Teams resurrected as own sidebar section** (outside Connections). Linear-style: collapsible parent + specific teams listed underneath (Design Team, Dev Team, etc.) + "New team" inline. Adaptive: hidden entirely for solo workspaces. Each team has detail page with Members/Projects/Capacity/Performance tabs. |
| 2026-05-14 | **Multi-AI coordination architecture added to Phase 6** (tasks 6.19–6.25). "One AI brain, many hands." Solves duplicate outreach, conflicting auto-replies, race conditions, voice/settings conflicts in team workspaces. Every entity gets owner_membership_id; AI routes Actions to owner. Workspace-scoped Actions queue with Yours/Team/All/Unassigned tabs. Presence locks prevent race conditions. Settings hierarchy: entity → owner → role → workspace → app. |
| 2026-05-14 | **Added Capture feature** — AI-routed scratchpad ("mouth of the AI funnel"). Sidebar item in top section + Cmd+Shift+N global shortcut. Three-tier routing: high-confidence auto-routes, low-confidence creates Action, commitment-language always creates Action. Voice notes via 🎤 press-and-hold. Plugs into existing systems (Actions, Activity Log, voice profile, ownership, trust gradient, guardrails) — no new silo. Phase 4 task 4.13 (UI shell), Phase 6 tasks 6.26–6.29 (AI behavior). Research-backed name via Forte Labs / Building a Second Brain methodology. |
