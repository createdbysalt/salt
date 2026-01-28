---
name: ralph-cleanup
description: "Clean up Ralph worktrees, containers, and logs."
---

# Ralph Cleanup

Clean up Ralph resources.

## Usage

```bash
# Clean up specific feature
bash .claude/scripts/ralph-docker.sh cleanup <feature>

# Clean up orphaned resources (no feature specified)
bash .claude/scripts/ralph-docker.sh cleanup
```

## Clean Up Specific Feature

```bash
bash .claude/scripts/ralph-docker.sh cleanup auth
```

This will:
1. Stop container if running
2. Remove the worktree
3. Prune git worktree references

**Note:** The branch `ralph/<feature>` is preserved. Delete manually if needed:
```bash
git branch -D ralph/auth
```

## Clean Up Orphaned Resources

```bash
bash .claude/scripts/ralph-docker.sh cleanup
```

This will:
1. Remove stale lock files (lock exists but no container)
2. Prune git worktree references
3. Rotate logs older than 15 days

## Manual Cleanup

```bash
# Remove all worktrees
rm -rf ./ralph-worktrees

# Remove all logs
rm -rf ./ralph-logs

# Remove all Ralph containers
docker rm -f $(docker ps -aq --filter "name=ralph-")

# Remove Docker image
docker rmi ralph:latest

# Delete all ralph branches
git branch | grep "ralph/" | xargs git branch -D
```

## After Feature is Merged

Once you've merged a feature PR:

```bash
# Clean up the worktree
bash .claude/scripts/ralph-docker.sh cleanup <feature>

# Delete the branch
git branch -D ralph/<feature>
git push origin --delete ralph/<feature>
```
