---
name: ralph-start
description: "Start a Ralph container for a feature. Creates worktree, builds Docker image if needed, and runs the autonomous loop."
---

# Start Ralph Container

Start an isolated Ralph instance for a feature.

## Usage

```bash
bash .claude/scripts/ralph-docker.sh start <feature-name> [options]
```

## Options

| Option | Description |
|--------|-------------|
| `--prd <file>` | Path to PRD JSON file to copy into worktree |
| `--iterations <n>` | Max iterations (default: 50) |
| `--after <feature>` | Wait for another Ralph to finish first |

## Examples

```bash
# Start Ralph for auth feature with PRD
bash .claude/scripts/ralph-docker.sh start auth --prd .claude/ralph/prd.json

# Start with custom iteration limit
bash .claude/scripts/ralph-docker.sh start dashboard --iterations 100

# Start after another feature completes
bash .claude/scripts/ralph-docker.sh start settings --after auth
```

## What Happens

1. Creates git worktree at `./ralph-worktrees/<feature>/`
2. Creates branch `ralph/<feature>` if it doesn't exist
3. Copies `.claude/` folder to worktree
4. Copies PRD if specified
5. Builds Docker image (first time only)
6. Starts container `ralph-<feature>`
7. Runs autonomous loop with fresh context each iteration

## Prerequisites

- Docker installed and running
- `ANTHROPIC_API_KEY` set (or `~/.anthropic/api_key` file)
- PRD JSON file ready (run `/prd-json` first)

## After Starting

```bash
# Check status
bash .claude/scripts/ralph-docker.sh status

# Follow logs
bash .claude/scripts/ralph-docker.sh logs <feature> -f

# Stop if needed
bash .claude/scripts/ralph-docker.sh stop <feature>
```

## Running Multiple Ralphs

You can start multiple Ralphs on different features:

```bash
bash .claude/scripts/ralph-docker.sh start auth --prd tasks/prd-auth.json
bash .claude/scripts/ralph-docker.sh start dashboard --prd tasks/prd-dashboard.json
bash .claude/scripts/ralph-docker.sh start settings --prd tasks/prd-settings.json

# Check all
bash .claude/scripts/ralph-docker.sh status
```

Each runs in isolation with its own:
- Git worktree and branch
- Docker container
- Log file
- PRD and progress tracking
