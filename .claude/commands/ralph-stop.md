---
name: ralph-stop
description: "Stop a running Ralph container."
---

# Stop Ralph Container

Stop a running Ralph instance.

## Usage

```bash
bash .claude/scripts/ralph-docker.sh stop <feature-name>
```

## Example

```bash
# Stop the auth Ralph
bash .claude/scripts/ralph-docker.sh stop auth
```

## What Happens

1. Stops the Docker container `ralph-<feature>`
2. Removes the container
3. Releases the lock file
4. Worktree and branch are preserved

## After Stopping

The worktree remains at `./ralph-worktrees/<feature>/` with:
- All committed changes on branch `ralph/<feature>`
- PRD with current progress
- Progress log

You can:

```bash
# Resume later
bash .claude/scripts/ralph-docker.sh start <feature>

# Clean up completely
bash .claude/scripts/ralph-docker.sh cleanup <feature>

# Merge the branch
cd ralph-worktrees/<feature>
git push -u origin ralph/<feature>
gh pr create
```

## Check Status First

```bash
bash .claude/scripts/ralph-docker.sh status
```
