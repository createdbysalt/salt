#!/bin/bash
# Ralph Worktree Management
# Helper script for git worktree operations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$CLAUDE_DIR/.." && pwd)"
WORKTREES_DIR="$PROJECT_ROOT/ralph-worktrees"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

usage() {
    echo "Ralph Worktree Management"
    echo ""
    echo "Usage: $0 <command> <feature>"
    echo ""
    echo "Commands:"
    echo "  create <feature>    Create worktree for feature"
    echo "  remove <feature>    Remove worktree"
    echo "  list                List all worktrees"
    echo "  sync <feature>      Sync worktree with main branch"
    exit 1
}

cmd_create() {
    local FEATURE="$1"
    if [ -z "$FEATURE" ]; then
        echo -e "${RED}Error: Feature name required${NC}"
        exit 1
    fi

    FEATURE=$(echo "$FEATURE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g')
    BRANCH_NAME="ralph/${FEATURE}"
    WORKTREE_PATH="$WORKTREES_DIR/$FEATURE"

    mkdir -p "$WORKTREES_DIR"
    cd "$PROJECT_ROOT"

    if [ -d "$WORKTREE_PATH" ]; then
        echo -e "${YELLOW}Worktree already exists: ${WORKTREE_PATH}${NC}"
        exit 0
    fi

    echo -e "${BLUE}Creating worktree for ${FEATURE}...${NC}"

    if git show-ref --verify --quiet "refs/heads/${BRANCH_NAME}"; then
        git worktree add "$WORKTREE_PATH" "$BRANCH_NAME"
    else
        git worktree add -b "$BRANCH_NAME" "$WORKTREE_PATH"
    fi

    # Copy .claude folder
    if [ ! -d "$WORKTREE_PATH/.claude" ]; then
        cp -r "$CLAUDE_DIR" "$WORKTREE_PATH/"
    fi

    echo -e "${GREEN}Created worktree: ${WORKTREE_PATH}${NC}"
    echo "Branch: ${BRANCH_NAME}"
}

cmd_remove() {
    local FEATURE="$1"
    if [ -z "$FEATURE" ]; then
        echo -e "${RED}Error: Feature name required${NC}"
        exit 1
    fi

    FEATURE=$(echo "$FEATURE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g')
    WORKTREE_PATH="$WORKTREES_DIR/$FEATURE"

    cd "$PROJECT_ROOT"

    if [ -d "$WORKTREE_PATH" ]; then
        git worktree remove "$WORKTREE_PATH" --force 2>/dev/null || rm -rf "$WORKTREE_PATH"
        echo -e "${GREEN}Removed worktree: ${WORKTREE_PATH}${NC}"
    else
        echo -e "${YELLOW}Worktree not found: ${WORKTREE_PATH}${NC}"
    fi
}

cmd_list() {
    echo -e "${BLUE}Ralph Worktrees${NC}"
    echo "========================================"
    cd "$PROJECT_ROOT"
    git worktree list
    echo ""

    if [ -d "$WORKTREES_DIR" ]; then
        echo -e "${BLUE}Feature Worktrees:${NC}"
        for WORKTREE in "$WORKTREES_DIR"/*/; do
            if [ -d "$WORKTREE" ]; then
                FEATURE=$(basename "$WORKTREE")
                BRANCH=$(cd "$WORKTREE" && git branch --show-current 2>/dev/null || echo "unknown")
                echo "  $FEATURE -> $BRANCH"
            fi
        done
    fi
}

cmd_sync() {
    local FEATURE="$1"
    if [ -z "$FEATURE" ]; then
        echo -e "${RED}Error: Feature name required${NC}"
        exit 1
    fi

    FEATURE=$(echo "$FEATURE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g')
    WORKTREE_PATH="$WORKTREES_DIR/$FEATURE"

    if [ ! -d "$WORKTREE_PATH" ]; then
        echo -e "${RED}Worktree not found: ${WORKTREE_PATH}${NC}"
        exit 1
    fi

    echo -e "${BLUE}Syncing ${FEATURE} with main...${NC}"
    cd "$WORKTREE_PATH"

    git fetch origin
    git merge origin/main --no-edit || {
        echo -e "${YELLOW}Merge conflicts detected. Resolve manually.${NC}"
        exit 1
    }

    echo -e "${GREEN}Synced ${FEATURE} with main${NC}"
}

case "${1:-}" in
    create)
        shift
        cmd_create "$@"
        ;;
    remove)
        shift
        cmd_remove "$@"
        ;;
    list)
        cmd_list
        ;;
    sync)
        shift
        cmd_sync "$@"
        ;;
    *)
        usage
        ;;
esac
