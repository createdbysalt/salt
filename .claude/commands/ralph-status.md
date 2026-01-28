---
name: ralph-status
description: "Show status of all Ralph containers and worktrees."
---

# Ralph Status

View the status of all Ralph instances.

## Usage

```bash
bash .claude/scripts/ralph-docker.sh status
```

## Output

Shows:

**Running containers:**
```
ralph-auth      | iteration 12 | US-003
ralph-dashboard | iteration 5  | US-001
```

**Worktrees:**
```
auth      | RUNNING
dashboard | RUNNING
settings  | COMPLETED
old-feat  | ORPHANED
```

## Status Types

| Status | Meaning |
|--------|---------|
| `RUNNING` | Container is active |
| `COMPLETED` | All stories passed |
| `STOPPED` | Stopped mid-way (can resume) |
| `ORPHANED` | Lock file but no container |
| `NO PRD` | Worktree exists but no prd.json |

## Quick Commands

```bash
# Full status
bash .claude/scripts/ralph-docker.sh status

# Just running containers
docker ps --filter "name=ralph-"

# Just worktrees
bash .claude/scripts/ralph-worktree.sh list

# Just locks
bash .claude/scripts/ralph-lock.sh list
```
