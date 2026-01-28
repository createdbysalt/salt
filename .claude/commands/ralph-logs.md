---
name: ralph-logs
description: "View or follow logs for a Ralph container."
---

# Ralph Logs

View logs for a Ralph instance.

## Usage

```bash
# View all logs
bash .claude/scripts/ralph-docker.sh logs <feature>

# Follow in real-time
bash .claude/scripts/ralph-docker.sh logs <feature> -f
```

## Examples

```bash
# View auth logs
bash .claude/scripts/ralph-docker.sh logs auth

# Follow dashboard logs (Ctrl+C to stop)
bash .claude/scripts/ralph-docker.sh logs dashboard -f
```

## Log Location

Logs are stored at:
```
./ralph-logs/<feature>.log
```

## Log Management

```bash
# List all log files
bash .claude/scripts/ralph-logs.sh list

# Rotate old logs (delete > 15 days)
bash .claude/scripts/ralph-logs.sh rotate

# Clear logs for a feature
bash .claude/scripts/ralph-logs.sh clear <feature>
```

## What's in the Logs

- Iteration numbers and timestamps
- Claude's output each iteration
- Completion signals
- Errors and warnings

## Monitoring Multiple Ralphs

Use tmux or multiple terminal tabs:

```bash
# Terminal 1
bash .claude/scripts/ralph-docker.sh logs auth -f

# Terminal 2
bash .claude/scripts/ralph-docker.sh logs dashboard -f
```

Or use a quick status check:

```bash
watch -n 10 'bash .claude/scripts/ralph-docker.sh status'
```
