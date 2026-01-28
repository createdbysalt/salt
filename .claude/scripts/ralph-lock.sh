#!/bin/bash
# Ralph Lock Management
# Prevents multiple Ralphs from running on the same feature

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$CLAUDE_DIR/.." && pwd)"
WORKTREES_DIR="$PROJECT_ROOT/ralph-worktrees"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

usage() {
    echo "Ralph Lock Management"
    echo ""
    echo "Usage: $0 <command> <feature>"
    echo ""
    echo "Commands:"
    echo "  acquire <feature>   Acquire lock for feature"
    echo "  release <feature>   Release lock for feature"
    echo "  check <feature>     Check if feature is locked"
    echo "  list                List all locks"
    echo "  clean               Remove stale locks"
    exit 1
}

get_lock_file() {
    local FEATURE="$1"
    FEATURE=$(echo "$FEATURE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g')
    echo "$WORKTREES_DIR/$FEATURE/.ralph-lock"
}

cmd_acquire() {
    local FEATURE="$1"
    if [ -z "$FEATURE" ]; then
        echo -e "${RED}Error: Feature name required${NC}"
        exit 1
    fi

    LOCK_FILE=$(get_lock_file "$FEATURE")
    LOCK_DIR=$(dirname "$LOCK_FILE")

    if [ ! -d "$LOCK_DIR" ]; then
        echo -e "${RED}Worktree not found for ${FEATURE}${NC}"
        exit 1
    fi

    if [ -f "$LOCK_FILE" ]; then
        LOCK_PID=$(cat "$LOCK_FILE")
        LOCK_TIME=$(date -r "$LOCK_FILE" "+%Y-%m-%d %H:%M:%S")
        echo -e "${RED}Lock already held${NC}"
        echo "  PID: $LOCK_PID"
        echo "  Since: $LOCK_TIME"
        exit 1
    fi

    echo $$ > "$LOCK_FILE"
    echo -e "${GREEN}Lock acquired for ${FEATURE}${NC}"
}

cmd_release() {
    local FEATURE="$1"
    if [ -z "$FEATURE" ]; then
        echo -e "${RED}Error: Feature name required${NC}"
        exit 1
    fi

    LOCK_FILE=$(get_lock_file "$FEATURE")

    if [ -f "$LOCK_FILE" ]; then
        rm -f "$LOCK_FILE"
        echo -e "${GREEN}Lock released for ${FEATURE}${NC}"
    else
        echo -e "${YELLOW}No lock found for ${FEATURE}${NC}"
    fi
}

cmd_check() {
    local FEATURE="$1"
    if [ -z "$FEATURE" ]; then
        echo -e "${RED}Error: Feature name required${NC}"
        exit 1
    fi

    LOCK_FILE=$(get_lock_file "$FEATURE")

    if [ -f "$LOCK_FILE" ]; then
        LOCK_PID=$(cat "$LOCK_FILE")
        LOCK_TIME=$(date -r "$LOCK_FILE" "+%Y-%m-%d %H:%M:%S")
        echo -e "${YELLOW}LOCKED${NC}"
        echo "  PID: $LOCK_PID"
        echo "  Since: $LOCK_TIME"

        # Check if process is still running
        if ps -p "$LOCK_PID" > /dev/null 2>&1; then
            echo "  Status: Process running"
        else
            echo "  Status: Process not found (stale lock)"
        fi
        exit 1
    else
        echo -e "${GREEN}UNLOCKED${NC}"
        exit 0
    fi
}

cmd_list() {
    echo "Ralph Locks"
    echo "========================================"

    if [ ! -d "$WORKTREES_DIR" ]; then
        echo "  (no worktrees)"
        exit 0
    fi

    FOUND=0
    for LOCK_FILE in "$WORKTREES_DIR"/*/.ralph-lock; do
        if [ -f "$LOCK_FILE" ]; then
            FOUND=1
            FEATURE=$(basename "$(dirname "$LOCK_FILE")")
            LOCK_PID=$(cat "$LOCK_FILE")
            LOCK_TIME=$(date -r "$LOCK_FILE" "+%Y-%m-%d %H:%M")

            if ps -p "$LOCK_PID" > /dev/null 2>&1; then
                STATUS="${GREEN}active${NC}"
            else
                STATUS="${RED}stale${NC}"
            fi

            echo -e "  $FEATURE | PID $LOCK_PID | $LOCK_TIME | $STATUS"
        fi
    done

    if [ $FOUND -eq 0 ]; then
        echo "  (no locks)"
    fi
}

cmd_clean() {
    echo "Cleaning stale locks..."

    if [ ! -d "$WORKTREES_DIR" ]; then
        echo "  (no worktrees)"
        exit 0
    fi

    CLEANED=0
    for LOCK_FILE in "$WORKTREES_DIR"/*/.ralph-lock; do
        if [ -f "$LOCK_FILE" ]; then
            LOCK_PID=$(cat "$LOCK_FILE")

            if ! ps -p "$LOCK_PID" > /dev/null 2>&1; then
                FEATURE=$(basename "$(dirname "$LOCK_FILE")")
                rm -f "$LOCK_FILE"
                echo -e "  ${GREEN}Cleaned: ${FEATURE}${NC}"
                CLEANED=$((CLEANED + 1))
            fi
        fi
    done

    echo "Cleaned $CLEANED stale lock(s)"
}

case "${1:-}" in
    acquire)
        shift
        cmd_acquire "$@"
        ;;
    release)
        shift
        cmd_release "$@"
        ;;
    check)
        shift
        cmd_check "$@"
        ;;
    list)
        cmd_list
        ;;
    clean)
        cmd_clean
        ;;
    *)
        usage
        ;;
esac
