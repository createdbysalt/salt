#!/bin/bash
# Ralph - Autonomous AI Agent Loop (Claude Code only)
# Fresh context per iteration for production reliability
# Usage: .claude/scripts/ralph.sh [max_iterations]

set -e

# Configuration
MAX_ITERATIONS="${1:-50}"

# Resolve paths relative to .claude directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$CLAUDE_DIR/.." && pwd)"

# File paths
PROMPT_FILE="$CLAUDE_DIR/prompts/ralph-agent.md"
PRD_FILE="$CLAUDE_DIR/ralph/prd.json"
PROGRESS_FILE="$CLAUDE_DIR/ralph/progress.txt"
ARCHIVE_DIR="$CLAUDE_DIR/ralph/archive"
LAST_BRANCH_FILE="$CLAUDE_DIR/ralph/.last-branch"
PID_FILE="$CLAUDE_DIR/ralph/.ralph-pid"

# Store PID for cancel-ralph command
echo $$ > "$PID_FILE"

# Cleanup on exit
cleanup() {
  rm -f "$PID_FILE"
}
trap cleanup EXIT

# Validate prerequisites
if [ ! -f "$PROMPT_FILE" ]; then
  echo "Error: Agent prompt not found at $PROMPT_FILE"
  exit 1
fi

if [ ! -f "$PRD_FILE" ]; then
  echo "Error: PRD not found at $PRD_FILE"
  echo "Run /prd-json to create one first."
  exit 1
fi

# Archive previous run if branch changed
if [ -f "$PRD_FILE" ] && [ -f "$LAST_BRANCH_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  LAST_BRANCH=$(cat "$LAST_BRANCH_FILE" 2>/dev/null || echo "")

  if [ -n "$CURRENT_BRANCH" ] && [ -n "$LAST_BRANCH" ] && [ "$CURRENT_BRANCH" != "$LAST_BRANCH" ]; then
    DATE=$(date +%Y-%m-%d)
    FOLDER_NAME=$(echo "$LAST_BRANCH" | sed 's|^ralph/||')
    ARCHIVE_FOLDER="$ARCHIVE_DIR/$DATE-$FOLDER_NAME"

    echo "Archiving previous run: $LAST_BRANCH"
    mkdir -p "$ARCHIVE_FOLDER"
    [ -f "$PRD_FILE" ] && cp "$PRD_FILE" "$ARCHIVE_FOLDER/"
    [ -f "$PROGRESS_FILE" ] && cp "$PROGRESS_FILE" "$ARCHIVE_FOLDER/"
    echo "   Archived to: $ARCHIVE_FOLDER"

    # Reset progress file for new run
    echo "# Ralph Progress Log" > "$PROGRESS_FILE"
    echo "Started: $(date)" >> "$PROGRESS_FILE"
    echo "---" >> "$PROGRESS_FILE"
  fi
fi

# Track current branch
if [ -f "$PRD_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  if [ -n "$CURRENT_BRANCH" ]; then
    echo "$CURRENT_BRANCH" > "$LAST_BRANCH_FILE"
  fi
fi

# Initialize progress file if it doesn't exist
if [ ! -f "$PROGRESS_FILE" ]; then
  echo "# Ralph Progress Log" > "$PROGRESS_FILE"
  echo "Started: $(date)" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
fi

echo ""
echo "========================================"
echo "  Ralph - Autonomous Agent Loop"
echo "  Max iterations: $MAX_ITERATIONS"
echo "  Working directory: $PROJECT_ROOT"
echo "========================================"
echo ""

# Change to project root for Claude operations
cd "$PROJECT_ROOT"

for i in $(seq 1 $MAX_ITERATIONS); do
  echo ""
  echo "==============================================================="
  echo "  Ralph Iteration $i of $MAX_ITERATIONS"
  echo "  $(date)"
  echo "==============================================================="
  echo ""

  # Run Claude with fresh context each iteration
  # --dangerously-skip-permissions for autonomous operation
  # --print for output capture
  OUTPUT=$(claude --dangerously-skip-permissions --print < "$PROMPT_FILE" 2>&1 | tee /dev/stderr) || true

  # Check for completion signal
  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    echo ""
    echo "========================================"
    echo "  Ralph completed all tasks!"
    echo "  Finished at iteration $i of $MAX_ITERATIONS"
    echo "========================================"

    # Auto-archive completed PRD
    if [ -f "$PRD_FILE" ]; then
      DATE=$(date +%Y-%m-%d)
      BRANCH_NAME=$(jq -r '.branchName // "unknown"' "$PRD_FILE" | sed 's|^ralph/||')
      PROJECT_NAME=$(jq -r '.project // "project"' "$PRD_FILE" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')
      ARCHIVE_FOLDER="$ARCHIVE_DIR/$DATE-$BRANCH_NAME"

      echo ""
      echo "Auto-archiving completed run..."
      mkdir -p "$ARCHIVE_FOLDER"
      cp "$PRD_FILE" "$ARCHIVE_FOLDER/"
      [ -f "$PROGRESS_FILE" ] && cp "$PROGRESS_FILE" "$ARCHIVE_FOLDER/"

      # Add completion metadata
      echo "{\"completed_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"iterations\": $i, \"status\": \"complete\"}" > "$ARCHIVE_FOLDER/completion.json"

      echo "   Archived to: $ARCHIVE_FOLDER"

      # Clean up working files
      rm -f "$PRD_FILE" "$PROGRESS_FILE" "$LAST_BRANCH_FILE"
      echo "   Cleaned up working files"
    fi

    exit 0
  fi

  echo ""
  echo "Iteration $i complete. Continuing to next iteration..."
  sleep 2
done

echo ""
echo "========================================"
echo "  Ralph reached max iterations ($MAX_ITERATIONS)"
echo "  Check progress: cat $PROGRESS_FILE"
echo "  Check PRD: cat $PRD_FILE | jq '.userStories[] | {id, title, passes}'"
echo "========================================"
exit 1
