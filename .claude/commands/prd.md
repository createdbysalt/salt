---
name: prd
description: "Generate production-ready PRDs for Ralph execution. Auto-detects standard (single PRD) or decompose (parallel streams) mode based on input. Includes self-critique for quality assurance."
---

# PRD

Generate production-ready PRDs for Ralph autonomous execution with built-in self-critique.

## Usage

```bash
/prd <feature-description-or-doc.md> [options]
```

## Mode Detection

The command auto-detects the appropriate mode:

| Input | Detected Mode | Rationale |
|-------|---------------|-----------|
| `.md` file path | Decompose | Large feature docs need parallel streams |
| Description string | Standard | Single features need one PRD |
| `--decompose` flag | Force Decompose | Override for large features described inline |
| `--standard` flag | Force Standard | Override for simple .md files |

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `--critique-depth` | `standard` | Depth of self-critique: `quick`, `standard`, or `deep` |
| `--max-streams` | `8` | Maximum number of parallel streams (decompose mode) |
| `--auto-start` | `false` | Launch Ralphs after generation |
| `--plan-only` | `false` | Generate execution plan only, no PRD files |
| `--skip-e2e` | `false` | Don't generate E2E test stream (decompose mode) |
| `--quick` | `false` | Skip delight criteria and micro-interactions |
| `--from-solution` | - | Pull context from /solution output file |

## The Job

1. **Detect Mode** — Standard or Decompose based on input
2. **Read** the feature description or document
3. **Decompose** into independent work streams (decompose mode only)
4. **Generate** PRDs with user stories
5. **Self-critique** and refine
6. **Output** execution plan and PRD files
7. **Optionally** launch parallel Ralphs

---

## Workflow Phases

### Phase 1: Mode Detection & Context

Determine the appropriate mode:
- **Standard Mode**: Single PRD for focused features
- **Decompose Mode**: Multiple parallel streams for large features

If `--from-solution` is provided, pull context from previous /solution output.

### Phase 2: Decomposition (Decompose Mode Only)

Read the feature document and identify:

1. **User journeys** — What's the end-to-end flow?
2. **Data dependencies** — What tables/types are needed?
3. **UI touchpoints** — Which pages/components change?
4. **Integration points** — External APIs, webhooks, triggers?

Then identify independent work streams following the pattern:

```
Foundation (schema) → Feature A, B, C (parallel) → Integration → E2E
```

### Phase 3: PRD Generation

For each stream (or single PRD), generate with:

- Atomic user stories (single capability each)
- Bullet-point acceptance criteria
- Bullet-point delight criteria (unless `--quick`)
- Micro-interactions table (unless `--quick`)
- Numbered implementation steps
- DO NOT CHANGE sections
- Three-tier boundaries

**Before generating PRDs, read:**
- `docs/architecture/database-schema.md` — Existing schema
- `docs/guides/testing-strategy.md` — E2E patterns
- `docs/guides/ui-patterns.md` — Component patterns

### Phase 4: Self-Critique

Apply adversarial self-review:

| Check | Detection | Resolution |
|-------|-----------|------------|
| Story too large | >5 criteria | Split into atomic stories |
| Vague criteria | "works correctly" | Rewrite as checkboxes |
| Missing typecheck | No "Typecheck passes" | Add to every story |
| Missing browser verify | UI story without verification | Add "Verify in browser using dev-browser skill" |
| Missing delight | UI story without delight criteria (non-quick) | Add delight criteria |
| Schema after consumer | Uses table before created | Reorder |
| File conflict | Parallel streams touch same file | Sequence or merge |

Document all issues and resolutions in `critique-report.md`.

### Phase 5: Refinement

Apply critique findings:
- Split oversized stories
- Add missing criteria
- Reorder dependencies
- Update execution plan

### Phase 6: Output

**Standard Mode:**
```
.claude/ralph/prd.json              # Ralph-ready JSON
tasks/prd-[feature-name].md         # Human-readable PRD (optional)
```

**Decompose Mode:**
```
.claude/ralph/orchestration/exec-YYYYMMDD-[project]/
├── execution-plan.json
├── critique-report.md
├── prd-stream-1.json
├── prd-stream-2.json
├── ...
└── prd-stream-N.json
```

### Phase 7: Auto-Start (Optional)

If `--auto-start` is set:
- Launch parallel Ralphs using `ralph-docker.sh`
- Use `--after` flag for dependencies
- Provide unified status command

---

## Story Sizing: The Number One Rule

**Each story must be completable in ONE Ralph iteration (one context window).**

Ralph spawns a fresh Claude instance per iteration with no memory of previous work. If a story is too big, Claude runs out of context before finishing and produces broken code.

### Right-sized stories:
- Add a database column and migration
- Add a UI component to an existing page
- Update a server action with new logic
- Add a filter dropdown to a list

### Too big (split these):
- "Build the entire dashboard" → Split into: schema, queries, UI components, filters
- "Add authentication" → Split into: schema, middleware, login UI, session handling
- "Refactor the API" → Split into: one story per endpoint or pattern

**Rule of thumb:** If you cannot describe the change in 2-3 sentences, it is too big.

---

## Story Ordering: Dependencies First

Stories execute in priority order. Earlier stories must not depend on later ones.

**Correct order:**
1. Schema/database changes (migrations)
2. Server actions / backend logic
3. UI components that use the backend
4. Dashboard/summary views that aggregate data

**Wrong order:**
1. UI component (depends on schema that doesn't exist yet)
2. Schema change

---

## Acceptance Criteria: Must Be Verifiable

Each criterion must be something Ralph can CHECK, not something vague.

### Good criteria (verifiable):
- "Add `status` column to tasks table with default 'pending'"
- "Filter dropdown has options: All, Active, Completed"
- "Clicking delete shows confirmation dialog"
- "Typecheck passes"

### Bad criteria (vague):
- "Works correctly"
- "User can do X easily"
- "Good UX"
- "Handles edge cases"

### Always include as final criteria:
```
"Typecheck passes"
```

### For UI stories, also include:
```
"Verify in browser using dev-browser skill"
```

---

## Delight Criteria (Skip with --quick)

What makes the feature spark joy, not just work.

### Good delight criteria:
- "Confirmation appears with smooth fade-in animation (200ms ease-out)"
- "Success state shows subtle checkmark animation"
- "Loading state uses skeleton, not spinner"
- "Empty state has helpful illustration and CTA"

---

## Execution Plan Schema (Decompose Mode)

```json
{
  "execution_id": "exec-YYYYMMDD-project",
  "source_document": "path/to/feature.md",
  "created_at": "ISO timestamp",
  "total_streams": 5,
  "total_stories": 47,

  "streams": [
    {
      "id": "stream-1",
      "name": "foundation",
      "description": "Database schema for entire sprint",
      "prd_file": "prd-stream-1.json",
      "branch_name": "ralph/project-foundation",
      "dependencies": [],
      "stories_count": 6
    }
  ],

  "parallel_groups": [
    { "group": 1, "streams": ["stream-1"] },
    { "group": 2, "streams": ["stream-2", "stream-3", "stream-4"] },
    { "group": 3, "streams": ["stream-5"] }
  ],

  "critical_path": ["stream-1", "stream-3", "stream-5"]
}
```

## Stream PRD Schema (Decompose Mode)

```json
{
  "streamId": "stream-1",
  "streamName": "foundation",
  "project": "Project Name",
  "branchName": "ralph/project-foundation",
  "description": "What this stream accomplishes",
  "dependencies": [],
  "userStories": [
    {
      "id": "S1-001",
      "title": "Story title",
      "description": "As a [user], I want [feature] so that [benefit]",
      "acceptanceCriteria": [
        "Criterion 1",
        "Typecheck passes"
      ],
      "delightCriteria": [
        "Delight criterion 1"
      ],
      "microInteractions": {
        "default": "Description",
        "hover": "Description",
        "success": "Description"
      },
      "implementationSteps": [
        "1. Read relevant docs",
        "2. Create file",
        "3. Verify"
      ],
      "doNotChange": ["stable files"],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
```

## Standard PRD Schema

```json
{
  "project": "[Project Name]",
  "branchName": "ralph/[feature-name-kebab-case]",
  "description": "[Feature description]",
  "userStories": [
    {
      "id": "US-001",
      "title": "[Story title]",
      "description": "As a [user], I want [feature] so that [benefit]",
      "acceptanceCriteria": [
        "Criterion 1",
        "Typecheck passes"
      ],
      "delightCriteria": [
        "Delight criterion 1"
      ],
      "microInteractions": {
        "default": "Description",
        "hover": "Description",
        "success": "Description"
      },
      "implementationSteps": [
        "1. Read relevant docs",
        "2. Create file",
        "3. Verify"
      ],
      "doNotChange": ["stable files"],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
```

---

## Critique Depth Levels

| Level | What It Checks |
|-------|---------------|
| `quick` | Story size, missing typecheck, file conflicts |
| `standard` | All quick + criteria quality, ordering, boundaries |
| `deep` | All standard + cross-stream analysis, doc consistency, delight coverage |

---

## Archive Logic (Standard Mode)

Before writing a new `prd.json`, check for existing runs:

1. Read `.claude/ralph/prd.json` if it exists
2. Check if `branchName` differs from new feature
3. If different AND `.claude/ralph/progress.txt` has content:
   - Create archive: `.claude/ralph/archive/YYYY-MM-DD-feature-name/`
   - Copy `prd.json` and `progress.txt` to archive
   - Reset `progress.txt` with fresh header

---

## Example: Standard Mode

```bash
# Single feature PRD
/prd "Add task status badges"

# Output:
# .claude/ralph/prd.json
```

## Example: Decompose Mode

```bash
# Decompose Sprint 3 document
/prd brand-identity/product/sprint-3-client-journey-system.md

# Output:
# .claude/ralph/orchestration/exec-20260130-sprint3/
# ├── execution-plan.json
# ├── critique-report.md
# ├── prd-stream-1.json  (foundation)
# ├── prd-stream-2.json  (intake)
# ├── prd-stream-3.json  (proposals)
# ├── prd-stream-4.json  (calendar-meetings)
# ├── prd-stream-5.json  (payments-onboarding)
# └── prd-stream-6.json  (e2e-tests)

# Then either:
# 1. Review and run orchestration script
.claude/scripts/prd-orchestrate.sh exec-20260130-sprint3

# 2. Or use auto-start
/prd sprint-3.md --auto-start
```

---

## Integration with Ralph Commands

| Command | Use After /prd |
|---------|----------------|
| `/ralph` | Start autonomous execution (standard mode) |
| `/ralph-preflight` | Verify setup before running |
| `/ralph-start <stream>` | Start specific stream (decompose mode) |
| `/ralph-status` | Check all running Ralphs |
| `/ralph-logs <feature>` | View specific Ralph logs |
| `/ralph-stop <feature>` | Stop specific Ralph |
| `/cancel-ralph` | Stop all Ralphs |

---

## Skill Reference

This command uses the `prd` skill. For detailed methodology, see:
- `.claude/skills/prd/SKILL.md`
- `.claude/skills/prd/references/`

---

## Checklist

Before running /prd:

- [ ] Feature description or document is complete and reviewed
- [ ] Access to docs/architecture/database-schema.md
- [ ] Understanding of existing codebase structure
- [ ] Git is clean (no uncommitted changes)

After running /prd (Standard):

- [ ] Review prd.json for story quality
- [ ] Verify stories are small enough (one iteration each)
- [ ] Check acceptance criteria are verifiable
- [ ] Ready to run `/ralph-preflight` then `/ralph`

After running /prd (Decompose):

- [ ] Review execution-plan.json for correct dependencies
- [ ] Review critique-report.md for issues found
- [ ] Review each prd-stream-N.json for story quality
- [ ] Verify branch names don't conflict with existing branches
- [ ] Ready to launch Ralphs when satisfied

---

## Troubleshooting

**"Story too large"** — Split into smaller atomic stories

**"Vague criteria detected"** — Rewrite criteria as verifiable checkboxes

**"Too many streams"** — Increase `--max-streams` or let the command consolidate

**"File conflicts detected"** — Streams will be sequenced instead of parallel

**"Circular dependency"** — Architecture needs restructuring, review and retry

**"Missing foundation"** — Ensure schema changes are separated into foundation stream
