---
name: ralph
description: "Run the Ralph autonomous agent loop. Executes user stories from prd.json until complete. Use after /prd and /prd-json."
---

# Ralph - Autonomous Agent Runner

Run the Ralph autonomous loop to implement user stories from `prd.json`.

## Pre-flight Checks

Before starting, verify:

1. **PRD exists**: Check `.claude/ralph/prd.json` exists
2. **Git branch**: Verify current branch matches PRD `branchName` (or create it)
3. **Progress file**: Ensure `.claude/ralph/progress.txt` exists

## Execute

Run the Ralph loop:

```bash
bash .claude/scripts/ralph.sh [max_iterations]
```

**Default:** 50 iterations

**Arguments:**
- `max_iterations` (optional): Maximum number of iterations before stopping

## What Happens

1. Each iteration spawns a **fresh Claude instance** (no context rot)
2. Claude reads the PRD, picks the next incomplete story, implements it
3. Runs quality checks (typecheck, lint, test)
4. Commits if checks pass, updates PRD and progress
5. Loop continues until all stories pass or max iterations reached
6. Completion signal: `<promise>COMPLETE</promise>`

## Monitoring Progress

```bash
# See which stories are done
cat .claude/ralph/prd.json | jq '.userStories[] | {id, title, passes}'

# See learnings from previous iterations
cat .claude/ralph/progress.txt

# Check git history
git log --oneline -10
```

## Auto-Archive on Completion

When Ralph completes all stories (`<promise>COMPLETE</promise>`), it automatically:
1. Archives the PRD and progress files to `.claude/ralph/archive/YYYY-MM-DD-branch-name/`
2. Adds completion metadata (`completion.json`)
3. Cleans up working files

For orchestration executions, use the archive helper:
```bash
# Archive a completed orchestration
.claude/scripts/ralph-archive.sh exec-20260202-messaging

# Check status of all orchestrations
.claude/scripts/ralph-archive.sh
```

## Canceling

To stop a running Ralph loop, use `/cancel-ralph` or:
```bash
kill $(cat .claude/ralph/.ralph-pid)
```

## Workflow

### Standard Workflow
```
/prd "feature description"    # Generate PRD
/prd-json tasks/prd-*.md      # Convert to JSON
/ralph-preflight              # (optional) Health check
/ralph                        # Run autonomous loop
```

### Research-First Workflow (NEW)
```
/ralph --research-first "feature description"
```

This adds a **Phase 0: Research** before any code is written:

1. **Research Phase**: Runs `/research` with the feature description
   - Investigates user psychology, competitive landscape, technical feasibility
   - Produces decision matrix (should_build, risks, opportunities)
   - Generates research brief and JSON

2. **Decision Gate**: Based on research confidence:
   - `HIGH confidence YES` → Auto-proceed to PRD
   - `MEDIUM confidence` → Pause for human review
   - `NEEDS_MORE_RESEARCH` → Stop, provide research gaps
   - `NO` → Stop, explain why

3. **PRD Generation**: Creates PRD grounded in research findings
   - User stories informed by validated pain points
   - Acceptance criteria based on real user needs
   - Technical approach aligned with feasibility analysis

4. **Standard Ralph Loop**: Executes as normal

### Research-First Parameters

```bash
# Full autonomous (research → PRD → build)
/ralph --research-first "Add task dependencies" --research-level autonomous

# Research with approval gates
/ralph --research-first "Client portal messaging" --research-level guided

# Research specific dimensions only
/ralph --research-first "Calendar sync" --research-dimensions user-psychology,technical

# Deep research for major features
/ralph --research-first "Real-time collaboration" --research-depth deep
```

| Parameter | Description | Default |
|-----------|-------------|---------|
| `--research-first` | Enable research phase 0 (required for this mode) | - |
| `--research-level` | Autonomy: `supervised`, `guided`, `advisory`, `autonomous` | `guided` |
| `--research-depth` | Research depth: `quick`, `standard`, `deep` | `standard` |
| `--research-dimensions` | Which dimensions to research | `all` |

### Research-First Output Locations

```
.claude/ralph/
├── research-[feature].json     # Research findings
├── research-[feature].md       # Research brief
├── prd.json                    # Generated PRD (research-informed)
└── progress.txt                # Execution log
```

### When to Use Research-First

**Use it when:**
- Building a significant new feature
- Uncertain about user demand or approach
- Feature involves UX decisions that affect users
- Want to validate before committing engineering time
- Ralph is running autonomously on important work

**Skip it when:**
- Bug fixes or small improvements
- Feature is already well-defined and validated
- Technical spike or proof of concept
- Time-critical fixes

## Trust Dial for Research-First

Start conservative, increase autonomy as trust builds:

```
Week 1-2: --research-level supervised
- Approve research before PRD
- Approve PRD before Ralph

Week 3-4: --research-level guided
- Auto-research, approve before PRD
- Approve PRD before Ralph

Week 5+: --research-level advisory
- Auto-research + PRD, approve before Ralph

Mature: --research-level autonomous
- Full auto for established patterns
- Reserve for HIGH confidence situations
```
