---
name: prd-architect
description: "Decompose large feature documents into parallel-executable work streams for Ralph. Use when you have a big sprint document or feature spec that needs to be broken down for autonomous parallel execution."
---

# PRD Architect

Transform large feature documents into parallel-executable work streams for Ralph with built-in self-critique.

## Usage

```bash
/prd-architect <feature-doc.md> [options]
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `--critique-depth` | `standard` | Depth of self-critique: `quick`, `standard`, or `deep` |
| `--max-streams` | `8` | Maximum number of parallel streams |
| `--auto-start` | `false` | Launch Ralphs after decomposition |
| `--plan-only` | `false` | Generate execution plan only, no PRD files |
| `--skip-e2e` | `false` | Don't generate E2E test stream |

## The Job

1. **Read** the feature document
2. **Decompose** into independent work streams
3. **Generate** stream PRDs with user stories
4. **Self-critique** and refine
5. **Output** execution plan and PRD files
6. **Optionally** launch parallel Ralphs

## Workflow Phases

### Phase 1: Decomposition

Read the feature document and identify:

1. **User journeys** — What's the end-to-end flow?
2. **Data dependencies** — What tables/types are needed?
3. **UI touchpoints** — Which pages/components change?
4. **Integration points** — External APIs, webhooks, triggers?

Then identify independent work streams following the pattern:

```
Foundation (schema) → Feature A, B, C (parallel) → Integration → E2E
```

### Phase 2: PRD Generation

For each stream, generate a `prd-stream-N.json` file with:

- Atomic user stories (single capability each)
- Bullet-point acceptance criteria
- Numbered implementation steps
- DO NOT CHANGE sections
- Three-tier boundaries

**Before generating PRDs, read:**
- `docs/architecture/database-schema.md` — Existing schema
- `docs/guides/testing-strategy.md` — E2E patterns
- `docs/guides/ui-patterns.md` — Component patterns

### Phase 3: Self-Critique

Apply adversarial self-review:

| Check | Detection | Resolution |
|-------|-----------|------------|
| Story too large | >5 criteria | Split into atomic stories |
| Vague criteria | "works correctly" | Rewrite as checkboxes |
| Missing typecheck | No "Typecheck passes" | Add to every story |
| Schema after consumer | Uses table before created | Reorder |
| File conflict | Parallel streams touch same file | Sequence or merge |

Document all issues and resolutions in `critique-report.md`.

### Phase 4: Refinement

Apply critique findings:
- Split oversized stories
- Add missing criteria
- Reorder dependencies
- Update execution plan

### Phase 5: Output

Create output directory:
```
.claude/ralph/orchestration/exec-YYYYMMDD-[project]/
├── execution-plan.json
├── critique-report.md
├── prd-stream-1.json
├── prd-stream-2.json
├── ...
└── prd-stream-N.json
```

### Phase 6: Auto-Start (Optional)

If `--auto-start` is set:
- Launch parallel Ralphs using `ralph-docker.sh`
- Use `--after` flag for dependencies
- Provide unified status command

## Execution Plan Schema

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

## Stream PRD Schema

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

## Critique Depth Levels

| Level | What It Checks |
|-------|---------------|
| `quick` | Story size, missing typecheck, file conflicts |
| `standard` | All quick + criteria quality, ordering, boundaries |
| `deep` | All standard + cross-stream analysis, doc consistency |

## Example

```bash
# Decompose Sprint 3 document
/prd-architect brand-identity/product/sprint-3-client-journey-system.md

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
/prd-architect sprint-3.md --auto-start
```

## Integration with Ralph Commands

| Command | Use After /architect |
|---------|---------------------|
| `/ralph-status` | Check all running Ralphs |
| `/ralph-logs <feature>` | View specific Ralph logs |
| `/ralph-stop <feature>` | Stop specific Ralph |
| `/cancel-ralph` | Stop all Ralphs |

## Skill Reference

This command uses the `prd-architect` skill. For detailed methodology, see:
- `.claude/skills/prd-architect/SKILL.md`
- `.claude/skills/prd-architect/references/`

## Checklist

Before running /architect:

- [ ] Feature document is complete and reviewed
- [ ] Access to docs/architecture/database-schema.md
- [ ] Understanding of existing codebase structure
- [ ] Git is clean (no uncommitted changes)

After running /architect:

- [ ] Review execution-plan.json for correct dependencies
- [ ] Review critique-report.md for issues found
- [ ] Review each prd-stream-N.json for story quality
- [ ] Verify branch names don't conflict with existing branches
- [ ] Ready to launch Ralphs when satisfied

## Troubleshooting

**"Too many streams"** — Increase `--max-streams` or let the architect consolidate

**"File conflicts detected"** — Streams will be sequenced instead of parallel

**"Circular dependency"** — Architecture needs restructuring, review and retry

**"Missing foundation"** — Ensure schema changes are separated into foundation stream
