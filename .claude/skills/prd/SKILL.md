---
name: prd-architect
description: "Decompose large feature documents into parallel-executable work streams for Ralph. Includes self-critique to ensure PRD quality before autonomous execution."
---

# PRD Architect System

Transform large feature documents into parallel-executable work streams for Ralph, with built-in self-critique to ensure quality.

## Core Philosophy

> "We're moving from 'code is the source of truth' to 'intent is the source of truth.'" — GitHub Engineering

The PRD Architect treats specification as the most important deliverable. Quality specs enable autonomous execution; poor specs cause loops and wasted iterations.

**Success Metric:** Time between disengagements—measure minutes-to-hours of autonomous work, not seconds of constant feedback.

---

## Decomposition Framework

### Step 1: Read the Feature Document

Before decomposing, understand the full scope:

1. **Identify the user journey** — What's the end-to-end flow?
2. **Map data dependencies** — What tables/types are needed?
3. **Locate UI touchpoints** — Which pages/components change?
4. **Find integration points** — External APIs, webhooks, triggers?

### Step 2: Identify Independent Work Streams

Streams are sets of user stories that can execute in **complete isolation**.

**Stream Independence Criteria:**
- No overlapping file modifications
- No shared database migrations
- No dependency on another stream's output
- Can be tested in isolation

**Common Stream Patterns:**

| Stream Type | Contents | Dependencies |
|-------------|----------|--------------|
| **Foundation** | All database schema + migrations + RLS | None (always first) |
| **Feature A** | Server actions + UI for one user flow | Foundation |
| **Feature B** | Server actions + UI for another flow | Foundation |
| **Feature C** | Another independent flow | Foundation |
| **Integration** | Cross-feature functionality | All features |
| **E2E Tests** | End-to-end test suite | All features |

**Example Decomposition (Client Journey System):**

```
Stream 1: Foundation
├── All database migrations
├── RLS policies
└── Type definitions

Stream 2: Intake (parallel)
├── Intake form components
├── Auto-discovery service
└── Brand snapshot generation

Stream 3: Proposals (parallel)
├── Proposal builder
├── Template system
└── E-signature integration

Stream 4: Calendar-Meetings (parallel)
├── Cal.com integration
├── Meeting scheduling
└── Transcription pipeline

Stream 5: Payments-Onboarding (sequential after Stream 3)
├── Stripe Connect integration
├── Payment processing
└── Onboarding automation

Stream 6: E2E Tests (final)
├── Full journey tests
└── Integration validation
```

### Step 3: Map Dependencies (DAG Construction)

Build a Directed Acyclic Graph of stream dependencies:

**Rules:**
1. **Foundation always comes first** — Schema before consumers
2. **RLS before features** — Policies must exist before queries
3. **Server actions before UI** — Backend before frontend within streams
4. **Features before integration** — Components before composition
5. **E2E tests last** — Validate complete flows

**Dependency Detection:**
- If Stream B uses a table created in Stream A → B depends on A
- If Stream B imports a component from Stream A → B depends on A
- If Stream B's tests require Stream A's features → B depends on A

---

## PRD Generation for Each Stream

### The Stream PRD Structure

Each stream gets its own `prd-stream-N.json`:

```json
{
  "streamId": "stream-1",
  "streamName": "foundation",
  "project": "[Project Name]",
  "branchName": "ralph/[project]-[stream-name]",
  "description": "[What this stream accomplishes]",
  "dependencies": [],
  "filesProtected": ["schema files created by this stream"],
  "userStories": [
    {
      "id": "S1-001",
      "title": "[Title]",
      "description": "As a [user], I want [feature] so that [benefit]",
      "acceptanceCriteria": ["Criterion 1", "Criterion 2", "Typecheck passes"],
      "implementationSteps": [
        "1. Read relevant docs",
        "2. Create migration file",
        "3. Run migration",
        "4. Verify schema"
      ],
      "doNotChange": ["existing auth tables", "RLS on profiles"],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
```

### Agentic PRD Patterns

Apply these research-backed patterns to every story:

#### 1. Atomic Stories (Single Capability)

Each story must describe ONE capability that prevents blending:

**Bad:** "Build the authentication system"
**Good:** "Add users table with email and password hash columns"

**Test:** Can you describe the change in 2-3 sentences?

#### 2. Bullet-Point Acceptance Criteria ("Discrete Checkboxes")

Criteria must be verifiable checkpoints, not descriptions:

**Bad:**
- "Works correctly"
- "Good UX"
- "Handles edge cases"

**Good:**
- "Add `status` column to tasks table with default 'pending'"
- "Filter dropdown shows options: All, Active, Completed"
- "Empty state displays when no items match filter"
- "Typecheck passes"

#### 3. Implementation Step Ordering

Without order, agents choose bad starting points and loop. Number every step:

```
"implementationSteps": [
  "1. Read docs/architecture/database-schema.md",
  "2. Create migration file in supabase/migrations/",
  "3. Define table with columns: id, name, created_at",
  "4. Add RLS policy for authenticated users",
  "5. Run pnpm dlx supabase db push",
  "6. Verify migration succeeded"
]
```

#### 4. DO NOT CHANGE Sections

Protect stable code explicitly:

```
"doNotChange": [
  "supabase/migrations/20250101* (existing migrations)",
  "app/_lib/supabase/client.ts (client config)",
  "Auth flow in app/_features/auth/"
]
```

#### 5. Three-Tier Boundaries

Every stream should define:

| Tier | Meaning | Examples |
|------|---------|----------|
| ✅ **Always** | Required for every story | "Typecheck passes", "Lint passes" |
| ⚠️ **Ask first** | Needs confirmation | "Modify shared component", "Update API signature" |
| 🚫 **Never** | Prohibited | "Delete existing data", "Modify auth middleware" |

---

## Critique Framework (Self-Review)

After generating PRDs, apply adversarial self-critique:

### Story-Level Checks

| Issue | Detection | Resolution |
|-------|-----------|------------|
| **Story too large** | >5 acceptance criteria | Split into atomic stories |
| **Vague criteria** | Contains "works correctly", "good UX" | Rewrite as specific checkboxes |
| **Missing typecheck** | No "Typecheck passes" criterion | Add to every story |
| **Missing browser verify** | UI story without verification | Add "Verify in browser" |
| **No implementation order** | Steps not numbered | Add numbered steps |
| **Missing boundaries** | No doNotChange section | Add DO NOT CHANGE list |
| **Instruction overload** | >10 requirements per story | Split (curse of instructions) |

### Stream-Level Checks

| Issue | Detection | Resolution |
|-------|-----------|------------|
| **Schema after consumer** | Uses table before creation story | Reorder stories |
| **Missing RLS** | Table creation without RLS story | Add RLS story immediately after |
| **Migration conflicts** | Multiple streams create migrations | Move all migrations to foundation |
| **UI before backend** | Component uses undefined action | Reorder within stream |

### Cross-Stream Conflict Detection

| Issue | Detection | Resolution |
|-------|-----------|------------|
| **File overlap** | Two streams modify same file | Merge streams or sequence |
| **Branch conflict** | Same branch name | Use unique stream-prefixed names |
| **Type collision** | Both streams define same type | Consolidate in foundation |
| **API conflict** | Both streams modify same endpoint | Sequence streams |

---

## Database (Supabase) Awareness

### Migration Ordering Rules

1. **All migrations belong in Foundation stream**
2. **Single timestamp sequence** — Coordinate across streams
3. **RLS policies with table creation** — Same migration or immediately after
4. **Type generation after migrations** — Run after db push

### Foundation Stream Template

For any sprint, the Foundation stream should include:

```
Story S1-001: Create database schema
Story S1-002: Add RLS policies for new tables
Story S1-003: Generate TypeScript types
Story S1-004: Create database utility functions
```

### Migration Story Pattern

```json
{
  "id": "S1-001",
  "title": "Create intake system database schema",
  "description": "Add all tables needed for intake system",
  "acceptanceCriteria": [
    "Create intake_submissions table with fields: id, studio_id, website_url, goal, status, created_at",
    "Create intake_responses table linking submissions to questions",
    "Create intake_questions table for configurable questions",
    "Add foreign keys and indexes",
    "Typecheck passes after type generation"
  ],
  "implementationSteps": [
    "1. Read docs/architecture/database-schema.md for conventions",
    "2. Create migration file: supabase/migrations/YYYYMMDDHHMMSS_add_intake_tables.sql",
    "3. Define tables with snake_case column names",
    "4. Add indexes on foreign keys and commonly queried columns",
    "5. Run: pnpm dlx supabase db push",
    "6. Run: pnpm dlx supabase gen types typescript --local > app/_lib/supabase/database.types.ts"
  ],
  "doNotChange": [
    "Existing migration files",
    "profiles table schema",
    "Auth-related tables"
  ]
}
```

---

## E2E Testing Integration

### When to Create E2E Stories

1. **UI feature completion** — After all UI stories in a flow pass
2. **Critical user journeys** — Login, checkout, core flows
3. **Cross-feature integration** — Features working together

### E2E Story Template

```json
{
  "id": "S6-001",
  "title": "E2E: Complete intake submission flow",
  "description": "Verify full intake flow works end-to-end",
  "acceptanceCriteria": [
    "Navigate to /intake/[studioSlug]",
    "Submit website URL and goal",
    "Answer 5 essential questions",
    "Receive Brand Snapshot preview",
    "Submission saved to database",
    "E2E test passes: pnpm test:e2e tests/intake.spec.ts"
  ],
  "implementationSteps": [
    "1. Create e2e/tests/intake.spec.ts",
    "2. Use Velocity Strategy with semantic locators",
    "3. Follow testing-strategy.md patterns",
    "4. Add graceful skips for auth requirements",
    "5. Run test and verify passes"
  ],
  "doNotChange": ["Existing E2E tests", "Auth setup"]
}
```

### E2E Test Locator Rules

From `docs/guides/testing-strategy.md`:

| Priority | Locator Type | Example |
|----------|--------------|---------|
| ✅ Always | `getByRole` | `page.getByRole('button', { name: 'Submit' })` |
| ✅ Always | `getByLabel` | `page.getByLabel('Email address')` |
| ✅ Always | `getByText` | `page.getByText('Welcome back')` |
| ⚠️ Last resort | `getByTestId` | `page.getByTestId('checkout-form')` |
| 🚫 Never | CSS/XPath | `.btn-primary`, `//div[1]/span` |

---

## Tooling Recommendations

The PRD Architect recommends the best tools for each stream and story type.

### Available Tools

| Category | Examples | Use For |
|----------|----------|---------|
| **Agents** | `database-keeper`, `security-audit`, `gemini-researcher` | Complex multi-step tasks |
| **Commands** | `/database`, `/research`, `/webapp-testing` | Specific workflows |
| **Skills** | `testing-patterns`, `react-ui-patterns`, `webapp-testing` | Pattern/methodology context |
| **MCP Servers** | `mcp__supabase__`, `mcp__playwright__`, `mcp__context7__` | Direct tool access |

### Story Type → Tooling Matrix

| Story Type | Recommended Agent | Commands | Skills |
|------------|-------------------|----------|--------|
| **Database/Schema** | `database-keeper` | `/database explore`, `/database migration` | — |
| **RLS Policies** | `database-keeper` | `/database audit` | — |
| **Server Actions** | — | `/code-quality` | `testing-patterns` |
| **UI Components** | — | `/webapp-testing` | `react-ui-patterns`, `frontend-design` |
| **Complex UI/Pages** | — | `/webapp-testing` | `frontend-design`, `dev-browser` |
| **E2E Tests** | — | — | `webapp-testing`, `testing-patterns` |
| **Research-Heavy** | `gemini-researcher` | `/research` | `deep-research` |
| **Auth/Security** | `security-audit` | — | — |

### Stream-Level Tooling

Each stream PRD includes a `streamTooling` section:

```json
{
  "streamId": "stream-1",
  "streamName": "foundation",
  "streamTooling": {
    "primaryAgent": "database-keeper",
    "commands": ["/database explore", "/database migration"],
    "skills": [],
    "mcpServers": ["mcp__supabase__"],
    "verificationCommands": ["/database audit", "pnpm typecheck"]
  }
}
```

### Story-Level Tooling

Individual stories can specify tooling:

```json
{
  "id": "S1-001",
  "title": "Create intake database schema",
  "tooling": {
    "agent": "database-keeper",
    "commands": ["/database explore intake"],
    "skills": [],
    "verify": ["/database audit", "pnpm typecheck"]
  },
  "implementationSteps": [
    "1. Run /database explore to understand existing schema",
    "2. Use database-keeper agent to draft migration",
    "3. Review draft in .claude/ralph/migrations/",
    "4. Run /database audit to verify RLS"
  ]
}
```

### Tooling Detection Heuristics

Auto-detect best tools based on story content:

| If story contains... | Recommend |
|---------------------|-----------|
| "migration", "table", "schema" | `database-keeper`, `/database` |
| "RLS", "policy", "security" | `database-keeper`, `/database audit` |
| "component", "UI", "form" | `react-ui-patterns`, `dev-browser` |
| "test", "spec", "E2E" | `webapp-testing`, `testing-patterns` |
| "API", "webhook", "integration" | `mcp__context7__`, `testing-patterns` |
| "research", "investigate" | `gemini-researcher`, `/research` |

See `references/tooling-recommendations.md` for complete mapping.

---

## Execution Plan Schema

The final `execution-plan.json` structure:

```json
{
  "execution_id": "exec-YYYYMMDD-[project]",
  "source_document": "path/to/feature-doc.md",
  "created_at": "ISO timestamp",
  "total_streams": 5,
  "total_stories": 47,
  "critique_applied": true,
  "critique_depth": "standard",

  "streams": [
    {
      "id": "stream-1",
      "name": "foundation",
      "description": "Database schema for entire sprint",
      "prd_file": "prd-stream-1.json",
      "branch_name": "ralph/[project]-foundation",
      "dependencies": [],
      "stories_count": 6,
      "files_touched": ["supabase/migrations/*"],
      "estimated_iterations": 12
    }
  ],

  "parallel_groups": [
    { "group": 1, "streams": ["stream-1"], "mode": "sequential" },
    { "group": 2, "streams": ["stream-2", "stream-3", "stream-4"], "mode": "parallel" },
    { "group": 3, "streams": ["stream-5"], "mode": "sequential" },
    { "group": 4, "streams": ["stream-6"], "mode": "sequential" }
  ],

  "critical_path": ["stream-1", "stream-3", "stream-5", "stream-6"],
  "total_estimated_iterations": 94,
  "parallel_estimated_iterations": 60,
  "speedup_percentage": 36
}
```

---

## Output Directory Structure

All outputs go to `.claude/ralph/orchestration/[execution_id]/`:

```
.claude/ralph/orchestration/exec-20260130-sprint3/
├── execution-plan.json       # DAG and parallel groups
├── critique-report.md        # What was improved during self-critique
├── prd-stream-1.json         # Foundation (schema + RLS)
├── prd-stream-2.json         # Feature stream 1
├── prd-stream-3.json         # Feature stream 2
├── prd-stream-4.json         # Feature stream 3
├── prd-stream-5.json         # Integration/dependent stream
└── prd-stream-6.json         # E2E tests
```

---

## Documentation References

Before generating PRDs, read these docs:

| Document | Purpose | When to Check |
|----------|---------|---------------|
| `docs/architecture/database-schema.md` | Existing tables, conventions | Schema stories |
| `docs/architecture/auth-flow.md` | Auth patterns | Features with auth |
| `docs/guides/testing-strategy.md` | E2E patterns | Test stories |
| `docs/guides/api-standards.md` | API conventions | Backend stories |
| `docs/guides/ui-patterns.md` | Component patterns | UI stories |
| `docs/guides/coding-conventions.md` | Code style | All stories |

---

## Verification Checklist

Before finalizing the execution plan:

- [ ] All migrations consolidated in Foundation stream
- [ ] Every story has "Typecheck passes" criterion
- [ ] UI stories have "Verify in browser" criterion
- [ ] No story has >5 acceptance criteria
- [ ] All criteria are verifiable (no "works correctly")
- [ ] Implementation steps are numbered
- [ ] DO NOT CHANGE sections protect stable code
- [ ] No file conflicts between parallel streams
- [ ] E2E stream depends on all feature streams
- [ ] Branch names are unique per stream
- [ ] Execution plan DAG has no cycles

---

## Integration with Existing Commands

| Command | Relationship |
|---------|--------------|
| `/prd` | Single-stream PRD generation (simpler) |
| `/prd-json` | Convert markdown to JSON (single stream) |
| `/prd-architect` | Multi-stream decomposition (this skill) |
| `/database` | Database exploration (used by foundation stream) |
| `/ralph` | Execute single PRD |
| `/ralph-start` | Start Ralph in container |

**Workflow:**
1. `/prd-architect feature-doc.md` — Decompose into streams
2. Review execution plan and PRDs
3. Run orchestration script or manual `/ralph-start` per stream

---

## References

See the `references/` folder for detailed guidance:
- `story-sizing.md` — Heuristics for right-sizing stories
- `critique-checklist.md` — Complete self-critique checklist
- `supabase-patterns.md` — Database story patterns
- `e2e-integration.md` — E2E testing integration
- `agentic-patterns.md` — Research-backed patterns
- `tooling-recommendations.md` — Agent, command, skill, and MCP server recommendations
