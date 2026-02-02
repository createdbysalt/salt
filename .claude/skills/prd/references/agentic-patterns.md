# Agentic PRD Patterns

Research-backed patterns for writing PRDs optimized for autonomous agent execution.

---

## The Paradigm Shift

> "We're moving from 'code is the source of truth' to 'intent is the source of truth.'" — GitHub Engineering (Sept 2025)

Traditional PRDs are written for humans. Agentic PRDs are written for AI agents that:
- Have no memory between iterations
- Execute literally what's specified
- Cannot ask clarifying questions mid-task
- Need explicit boundaries and protections

---

## The Six Essential Areas

Every agentic PRD must address:

| Area | What to Include |
|------|-----------------|
| **Commands** | Full executable commands with flags (`pnpm test`, `pnpm build`) |
| **Testing** | Framework, test file locations, coverage expectations |
| **Project Structure** | Explicit directory organization |
| **Code Style** | Real code examples beat paragraphs of description |
| **Git Workflow** | Branch naming, commit formats, PR requirements |
| **Boundaries** | Clear constraints on what agents should NEVER do |

---

## Pattern 1: Atomic User Stories

Each story describes a **single capability** to prevent blending and misinterpretation.

### The Problem with Compound Stories

```
BAD: "Add user authentication with login, signup, and password reset"

What happens:
- Agent attempts all three in one iteration
- Runs out of context mid-way
- Produces broken, incomplete code
- Next iteration has no memory of partial progress
```

### Atomic Story Structure

```
GOOD:
Story 1: "Add users table with auth columns"
Story 2: "Create signup server action"
Story 3: "Build signup form component"
Story 4: "Create login server action"
Story 5: "Build login form component"
Story 6: "Create password reset request action"
Story 7: "Build password reset flow"
```

### Atomicity Test

**Can you complete this in one focused session without context switching?**

- If yes → Atomic
- If no → Split further

---

## Pattern 2: Discrete Checkbox Criteria

Acceptance criteria are **verifiable checkpoints**, not descriptions.

### The Problem with Vague Criteria

```
BAD:
- "Works correctly"
- "Good user experience"
- "Handles edge cases properly"
- "Is performant"

What happens:
- Agent cannot verify completion
- No clear signal when to stop
- Produces "works for me" code
```

### Discrete Checkbox Format

```
GOOD:
- [ ] Add `status` column to tasks table with type: 'pending' | 'active' | 'done'
- [ ] Column has default value 'pending'
- [ ] Filter dropdown shows exactly three options: All, Active, Done
- [ ] Empty state message appears when filter returns no results
- [ ] Typecheck passes: pnpm typecheck exits 0
- [ ] Lint passes: pnpm lint exits 0
```

### Checkbox Test

**Can you check this box with a single command or visual verification?**

---

## Pattern 3: DO NOT CHANGE Sections

Explicitly protect stable code from modification.

### The Problem

Agents optimize for completing the story. Without protection, they may:
- Modify shared utilities in ways that break other features
- Change API signatures used by other code
- Refactor working code "for consistency"
- Delete "unused" code they don't see being used

### DO NOT CHANGE Template

```json
{
  "doNotChange": [
    "supabase/migrations/20250101* (existing migrations)",
    "app/_lib/supabase/client.ts (Supabase client config)",
    "app/_lib/auth/* (authentication utilities)",
    "API signatures in app/actions/shared/*",
    "Test fixtures in e2e/fixtures/"
  ]
}
```

### What to Protect

| Category | Examples |
|----------|----------|
| **Schema** | Existing migrations, core table structure |
| **Auth** | Login flow, session handling, middleware |
| **API Contracts** | Public function signatures, API routes |
| **Config** | Environment setup, build config |
| **Tests** | Existing test fixtures, shared test utilities |

---

## Pattern 4: Implementation Step Ordering

Without explicit order, agents choose bad starting points and loop.

### The Problem

```
BAD: Unordered steps
- Create migration
- Add component
- Update types
- Add server action

What happens:
- Agent might start with component
- Component fails because types don't exist
- Agent creates types
- Types fail because migration hasn't run
- Agent runs migration
- Migration fails because file doesn't exist
- LOOP
```

### Ordered Steps Format

```json
{
  "implementationSteps": [
    "1. Read docs/architecture/database-schema.md for naming conventions",
    "2. Create migration file: supabase/migrations/YYYYMMDDHHMMSS_add_feature.sql",
    "3. Define table schema with columns: id, name, status, created_at",
    "4. Run migration: pnpm dlx supabase db push",
    "5. Generate types: pnpm dlx supabase gen types typescript --local > ...",
    "6. Create server action in app/actions/feature/",
    "7. Create component in app/_features/feature/components/",
    "8. Import and use component in target page",
    "9. Run typecheck: pnpm typecheck",
    "10. Verify in browser"
  ]
}
```

### Ordering Rules

1. **Read before write** — Read docs first
2. **Schema before code** — Database before types
3. **Types before use** — Generate before import
4. **Backend before frontend** — Actions before components
5. **Code before verify** — Implementation before validation

---

## Pattern 5: Three-Tier Boundaries

Define what agents ✅ Always do, ⚠️ Ask about, and 🚫 Never do.

### Template

```json
{
  "boundaries": {
    "always": [
      "Run typecheck after code changes",
      "Run lint after code changes",
      "Add 'use server' to server action files",
      "Use existing component patterns from app/_features/shared/"
    ],
    "askFirst": [
      "Modify any file in app/_lib/",
      "Add new dependencies to package.json",
      "Create new API routes",
      "Change component props interface"
    ],
    "never": [
      "Modify existing migration files",
      "Delete test files",
      "Change authentication middleware",
      "Commit directly to main branch",
      "Use 'any' type",
      "Skip error handling"
    ]
  }
}
```

### Boundary Categories

| Tier | Purpose |
|------|---------|
| ✅ Always | Quality gates, mandatory patterns |
| ⚠️ Ask First | Potentially dangerous, needs human review |
| 🚫 Never | Destructive, irreversible, or out of scope |

---

## Pattern 6: Time-Between-Disengagements Optimization

Structure PRDs to maximize autonomous work time.

### The Metric

Traditional: "How fast did the agent write code?"
Agentic: "How long did the agent work before needing human help?"

### Optimization Strategies

1. **Front-load context** — All needed info in the story, no external lookups
2. **Anticipate blockers** — Document common issues and solutions
3. **Provide escape hatches** — What to do if X fails
4. **Clear completion signals** — Exactly when to stop

### Anti-Fragility Template

```json
{
  "troubleshooting": {
    "migrationFails": "Check Supabase is running: pnpm dlx supabase status",
    "typecheckFails": "Regenerate types: pnpm dlx supabase gen types...",
    "componentNotFound": "Check import path, may need relative import",
    "permissionDenied": "Ensure RLS policy exists for this operation"
  }
}
```

---

## The Curse of Instructions

Research shows: **Too many requirements simultaneously reduces adherence to each one.**

### The Problem

```
BAD: Story with 15 requirements
- Agent tries to satisfy all
- Misses some due to context limits
- Prioritizes wrong ones
- Quality degrades across all
```

### The Solution: Modular Pieces

```
GOOD: Break into focused stories
Story 1: 5 requirements → Agent succeeds
Story 2: 5 requirements → Agent succeeds
Story 3: 5 requirements → Agent succeeds

Better than:
Story 1: 15 requirements → Agent partially succeeds
```

### Max Requirements Per Story

| Story Type | Max Criteria | Max Steps |
|------------|--------------|-----------|
| Schema | 5 | 8 |
| Server Action | 5 | 6 |
| UI Component | 5 | 8 |
| Integration | 4 | 6 |

---

## Living Document Principle

PRDs are version-controlled ground truth, not static artifacts.

### Update Triggers

- Decision crystallizes → Update PRD
- Story completes → Mark as done
- Blocker found → Add troubleshooting
- Pattern emerges → Add to boundaries

### PRD as Progress Tracker

```json
{
  "userStories": [
    { "id": "S1-001", "passes": true, "notes": "Completed 2026-01-30" },
    { "id": "S1-002", "passes": true, "notes": "" },
    { "id": "S1-003", "passes": false, "notes": "In progress" },
    { "id": "S1-004", "passes": false, "notes": "" }
  ]
}
```

---

## Sources

- Addy Osmani: [Writing Specs for AI Code Agents](https://addyosmani.com/blog/good-spec/)
- ChatPRD: [PRD for Claude Code](https://www.chatprd.ai/resources/PRD-for-Claude-Code)
- Ona: [Software Conductor's Handbook](https://ona.com/stories/software-conductors-handbook)
- GitHub Engineering: Agentic Development Paradigms (2025)
