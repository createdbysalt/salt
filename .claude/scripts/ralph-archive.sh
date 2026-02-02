#!/bin/bash
# Ralph Archive Helper
# Archives completed PRDs and orchestration executions
# Usage: .claude/scripts/ralph-archive.sh [execution-id]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
RALPH_DIR="$CLAUDE_DIR/ralph"
ARCHIVE_DIR="$RALPH_DIR/archive"
ORCH_DIR="$RALPH_DIR/orchestration"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

archive_standalone() {
  PRD_FILE="$RALPH_DIR/prd.json"
  PROGRESS_FILE="$RALPH_DIR/progress.txt"

  if [ ! -f "$PRD_FILE" ]; then
    echo "No standalone PRD found at $PRD_FILE"
    return 1
  fi

  DATE=$(date +%Y-%m-%d)
  BRANCH_NAME=$(jq -r '.branchName // "unknown"' "$PRD_FILE" | sed 's|^ralph/||')
  ARCHIVE_FOLDER="$ARCHIVE_DIR/$DATE-$BRANCH_NAME"

  echo -e "${GREEN}Archiving standalone PRD...${NC}"
  mkdir -p "$ARCHIVE_FOLDER"
  mv "$PRD_FILE" "$ARCHIVE_FOLDER/"
  [ -f "$PROGRESS_FILE" ] && mv "$PROGRESS_FILE" "$ARCHIVE_FOLDER/"
  [ -f "$RALPH_DIR/.last-branch" ] && rm -f "$RALPH_DIR/.last-branch"

  echo "   Archived to: $ARCHIVE_FOLDER"
}

archive_orchestration() {
  EXEC_ID="$1"
  EXEC_DIR="$ORCH_DIR/$EXEC_ID"

  if [ ! -d "$EXEC_DIR" ]; then
    echo "Orchestration not found: $EXEC_ID"
    echo "Available executions:"
    ls -1 "$ORCH_DIR" 2>/dev/null || echo "  (none)"
    return 1
  fi

  # Check if all streams are complete
  INCOMPLETE=0
  for prd in "$EXEC_DIR"/prd-stream-*.json; do
    if [ -f "$prd" ]; then
      INCOMPLETE_STORIES=$(jq '[.userStories[] | select(.passes == false)] | length' "$prd")
      if [ "$INCOMPLETE_STORIES" -gt 0 ]; then
        STREAM_NAME=$(jq -r '.streamName' "$prd")
        echo -e "${YELLOW}Warning: $STREAM_NAME has $INCOMPLETE_STORIES incomplete stories${NC}"
        INCOMPLETE=$((INCOMPLETE + INCOMPLETE_STORIES))
      fi
    fi
  done

  if [ "$INCOMPLETE" -gt 0 ]; then
    read -p "Archive anyway with $INCOMPLETE incomplete stories? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Aborted."
      return 1
    fi
  fi

  ARCHIVE_FOLDER="$ARCHIVE_DIR/$EXEC_ID"
  echo -e "${GREEN}Archiving orchestration: $EXEC_ID${NC}"
  mkdir -p "$ARCHIVE_DIR"
  mv "$EXEC_DIR" "$ARCHIVE_FOLDER"

  # Add completion metadata
  echo "{\"archived_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"incomplete_stories\": $INCOMPLETE}" > "$ARCHIVE_FOLDER/archive-metadata.json"

  echo "   Archived to: $ARCHIVE_FOLDER"
}

check_all_complete() {
  EXEC_ID="$1"
  EXEC_DIR="$ORCH_DIR/$EXEC_ID"

  if [ ! -d "$EXEC_DIR" ]; then
    return 1
  fi

  for prd in "$EXEC_DIR"/prd-stream-*.json; do
    if [ -f "$prd" ]; then
      INCOMPLETE=$(jq '[.userStories[] | select(.passes == false)] | length' "$prd")
      if [ "$INCOMPLETE" -gt 0 ]; then
        return 1
      fi
    fi
  done

  return 0
}

# Main logic
if [ -n "$1" ]; then
  # Archive specific orchestration
  archive_orchestration "$1"
else
  # Interactive mode - show options
  echo "Ralph Archive Helper"
  echo "===================="
  echo ""

  # Check for standalone PRD
  if [ -f "$RALPH_DIR/prd.json" ]; then
    echo "Standalone PRD found:"
    jq -r '"\(.project) - \(.branchName)"' "$RALPH_DIR/prd.json"
    echo ""
  fi

  # Check for orchestrations
  if [ -d "$ORCH_DIR" ] && [ "$(ls -A "$ORCH_DIR" 2>/dev/null)" ]; then
    echo "Active orchestrations:"
    for dir in "$ORCH_DIR"/*/; do
      if [ -d "$dir" ]; then
        EXEC_ID=$(basename "$dir")
        TOTAL=$(find "$dir" -name "prd-stream-*.json" -exec jq '.userStories | length' {} \; | paste -sd+ | bc)
        COMPLETE=$(find "$dir" -name "prd-stream-*.json" -exec jq '[.userStories[] | select(.passes == true)] | length' {} \; | paste -sd+ | bc)
        echo "  $EXEC_ID ($COMPLETE/$TOTAL stories complete)"
      fi
    done
    echo ""
  fi

  echo "Usage:"
  echo "  $0                    # Interactive mode (this screen)"
  echo "  $0 exec-YYYYMMDD-name # Archive specific orchestration"
  echo "  $0 --standalone       # Archive standalone PRD"
fi

# Handle --standalone flag
if [ "$1" = "--standalone" ]; then
  archive_standalone
fi
