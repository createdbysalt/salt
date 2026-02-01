#!/bin/bash
# Ralph Container Entrypoint
# Starts the Ralph loop with proper environment setup

set -e

# Configuration from environment
FEATURE_NAME="${RALPH_FEATURE_NAME:-unnamed}"
MAX_ITERATIONS="${RALPH_MAX_ITERATIONS:-50}"
LOG_FILE="${RALPH_LOG_FILE:-/ralph-logs/${FEATURE_NAME}.log}"

echo "========================================"
echo "  Ralph Container Starting"
echo "  Feature: ${FEATURE_NAME}"
echo "  Max iterations: ${MAX_ITERATIONS}"
echo "  Log file: ${LOG_FILE}"
echo "========================================"

# Disable exit on error temporarily for diagnostics
set +e

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

echo "DEBUG: Checking /workspace/.git..."
ls -la /workspace/.git 2>&1 || echo "No .git file/folder"
echo "DEBUG: Contents of /workspace/.git:"
cat /workspace/.git 2>&1 || echo "Could not read .git"

echo "DEBUG: Checking /main-repo/.git..."
ls -la /main-repo/.git 2>&1 | head -5 || echo "No main-repo .git"

# Re-enable exit on error
set -e

# Fix worktree git reference FIRST (worktrees have a .git file pointing to host path)
# This MUST happen before any git commands
if [ -f "/workspace/.git" ]; then
    echo "Fixing worktree git reference for container..."
    # Extract the worktree name from the original path
    WORKTREE_NAME=$(grep -o 'worktrees/[^"]*' /workspace/.git | sed 's|worktrees/||')
    if [ -n "$WORKTREE_NAME" ]; then
        echo "gitdir: /main-repo/.git/worktrees/$WORKTREE_NAME" > /workspace/.git
        echo "Fixed .git to point to /main-repo/.git/worktrees/$WORKTREE_NAME"

        # Also fix the worktree config in the main .git folder
        WORKTREE_CONFIG="/main-repo/.git/worktrees/$WORKTREE_NAME/gitdir"
        if [ -f "$WORKTREE_CONFIG" ]; then
            echo "/workspace" > "$WORKTREE_CONFIG"
            echo "Fixed worktree gitdir to /workspace"
        fi
    fi
fi

# Configure git
git config --global user.email "ralph@saltcore.local"
git config --global user.name "Ralph (Salt Core)"

# Trust the workspace directory
git config --global --add safe.directory /workspace
git config --global --add safe.directory /main-repo

# Check for required files
if [ ! -f "/workspace/.claude/ralph/prd.json" ]; then
    echo "ERROR: No prd.json found at /workspace/.claude/ralph/prd.json"
    echo "Run /prd-json first to create the PRD."
    exit 1
fi

# Create lock file
LOCK_FILE="/workspace/.ralph-lock"
if [ -f "$LOCK_FILE" ]; then
    LOCK_PID=$(cat "$LOCK_FILE")
    echo "WARNING: Lock file exists (PID: $LOCK_PID)"
    echo "Another Ralph may be running. Proceeding anyway..."
fi
echo $$ > "$LOCK_FILE"

# Cleanup on exit
cleanup() {
    echo "Ralph container shutting down..."
    rm -f "$LOCK_FILE"
}
trap cleanup EXIT

# Log rotation - keep 15 days
find /ralph-logs -name "*.log" -mtime +15 -delete 2>/dev/null || true

# Start timestamp
START_TIME=$(date -Iseconds)
echo "Started: $START_TIME" | tee -a "$LOG_FILE"

# Run Ralph loop
echo "Starting Ralph loop..." | tee -a "$LOG_FILE"

cd /workspace

# Source the prompt file and run Claude iteratively
PROMPT_FILE="/workspace/.claude/prompts/ralph-agent.md"

if [ ! -f "$PROMPT_FILE" ]; then
    echo "ERROR: Agent prompt not found at $PROMPT_FILE" | tee -a "$LOG_FILE"
    exit 1
fi

for i in $(seq 1 $MAX_ITERATIONS); do
    echo "" | tee -a "$LOG_FILE"
    echo "===============================================================" | tee -a "$LOG_FILE"
    echo "  Ralph Iteration $i of $MAX_ITERATIONS" | tee -a "$LOG_FILE"
    echo "  Feature: $FEATURE_NAME" | tee -a "$LOG_FILE"
    echo "  $(date)" | tee -a "$LOG_FILE"
    echo "===============================================================" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"

    # Run Claude with fresh context - stream output directly to log
    # Timeout after 20 minutes to prevent hanging
    timeout 1200 claude --dangerously-skip-permissions --print < "$PROMPT_FILE" 2>&1 | tee -a "$LOG_FILE"
    EXIT_CODE=$?

    if [ $EXIT_CODE -eq 124 ]; then
        echo "WARNING: Iteration timed out after 20 minutes. Continuing..." | tee -a "$LOG_FILE"
    fi

    # Check for completion in the log file
    if tail -100 "$LOG_FILE" | grep -q "<promise>COMPLETE</promise>"; then
        echo "" | tee -a "$LOG_FILE"
        echo "========================================" | tee -a "$LOG_FILE"
        echo "  Ralph completed all tasks!" | tee -a "$LOG_FILE"
        echo "  Feature: $FEATURE_NAME" | tee -a "$LOG_FILE"
        echo "  Finished at iteration $i of $MAX_ITERATIONS" | tee -a "$LOG_FILE"
        echo "  Duration: $START_TIME to $(date -Iseconds)" | tee -a "$LOG_FILE"
        echo "========================================" | tee -a "$LOG_FILE"
        exit 0
    fi

    echo "Iteration $i complete. Continuing..." | tee -a "$LOG_FILE"
    sleep 2
done

echo "" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "  Ralph reached max iterations ($MAX_ITERATIONS)" | tee -a "$LOG_FILE"
echo "  Feature: $FEATURE_NAME" | tee -a "$LOG_FILE"
echo "  Check logs: $LOG_FILE" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
exit 1
