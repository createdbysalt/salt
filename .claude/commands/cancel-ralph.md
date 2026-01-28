---
name: cancel-ralph
description: "Cancel an active Ralph loop. Stops the running autonomous agent."
---

# Cancel Ralph Loop

Stop a currently running Ralph autonomous loop.

## Check Status

First, check if Ralph is running:

```bash
if [ -f .claude/ralph/.ralph-pid ]; then
  PID=$(cat .claude/ralph/.ralph-pid)
  if ps -p $PID > /dev/null 2>&1; then
    echo "Ralph is running (PID: $PID)"
  else
    echo "No active Ralph loop (stale PID file)"
    rm -f .claude/ralph/.ralph-pid
  fi
else
  echo "No active Ralph loop"
fi
```

## Cancel

If Ralph is running, stop it:

```bash
if [ -f .claude/ralph/.ralph-pid ]; then
  PID=$(cat .claude/ralph/.ralph-pid)
  if ps -p $PID > /dev/null 2>&1; then
    kill $PID
    echo "Cancelled Ralph loop (PID: $PID)"
    rm -f .claude/ralph/.ralph-pid
  else
    echo "No active Ralph loop to cancel"
    rm -f .claude/ralph/.ralph-pid
  fi
else
  echo "No active Ralph loop to cancel"
fi
```

## Check Progress

After canceling, check where Ralph left off:

```bash
# See completed stories
cat .claude/ralph/prd.json | jq '.userStories[] | select(.passes == true) | {id, title}'

# See remaining stories
cat .claude/ralph/prd.json | jq '.userStories[] | select(.passes == false) | {id, title}'

# See last progress entry
tail -20 .claude/ralph/progress.txt
```

## Resume

To resume, simply run `/ralph` again. It will pick up from where it left off.
