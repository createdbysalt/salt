#!/bin/bash
# Ralph Log Management
# Helper script for log operations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$CLAUDE_DIR/.." && pwd)"
LOGS_DIR="$PROJECT_ROOT/ralph-logs"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Log retention days
RETENTION_DAYS=15

usage() {
    echo "Ralph Log Management"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  view <feature>      View logs for a feature"
    echo "  tail <feature>      Follow logs in real-time"
    echo "  list                List all log files"
    echo "  rotate              Delete logs older than ${RETENTION_DAYS} days"
    echo "  clear <feature>     Clear logs for a feature"
    exit 1
}

cmd_view() {
    local FEATURE="$1"
    if [ -z "$FEATURE" ]; then
        echo -e "${RED}Error: Feature name required${NC}"
        exit 1
    fi

    FEATURE=$(echo "$FEATURE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g')
    LOG_FILE="$LOGS_DIR/${FEATURE}.log"

    if [ ! -f "$LOG_FILE" ]; then
        echo -e "${RED}No logs found for ${FEATURE}${NC}"
        exit 1
    fi

    cat "$LOG_FILE"
}

cmd_tail() {
    local FEATURE="$1"
    if [ -z "$FEATURE" ]; then
        echo -e "${RED}Error: Feature name required${NC}"
        exit 1
    fi

    FEATURE=$(echo "$FEATURE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g')
    LOG_FILE="$LOGS_DIR/${FEATURE}.log"

    if [ ! -f "$LOG_FILE" ]; then
        echo -e "${YELLOW}Log file doesn't exist yet. Waiting...${NC}"
        while [ ! -f "$LOG_FILE" ]; do
            sleep 1
        done
    fi

    echo -e "${BLUE}Following logs for ${FEATURE} (Ctrl+C to stop)${NC}"
    tail -f "$LOG_FILE"
}

cmd_list() {
    echo -e "${BLUE}Ralph Logs${NC}"
    echo "========================================"

    if [ ! -d "$LOGS_DIR" ]; then
        echo "  (no logs directory)"
        exit 0
    fi

    for LOG_FILE in "$LOGS_DIR"/*.log; do
        if [ -f "$LOG_FILE" ]; then
            FILENAME=$(basename "$LOG_FILE")
            SIZE=$(du -h "$LOG_FILE" | cut -f1)
            MODIFIED=$(date -r "$LOG_FILE" "+%Y-%m-%d %H:%M")
            echo "  $FILENAME | $SIZE | $MODIFIED"
        fi
    done
}

cmd_rotate() {
    echo -e "${BLUE}Rotating logs older than ${RETENTION_DAYS} days...${NC}"

    if [ ! -d "$LOGS_DIR" ]; then
        echo "  (no logs directory)"
        exit 0
    fi

    DELETED=0
    while IFS= read -r -d '' LOG_FILE; do
        echo "  Deleting: $(basename "$LOG_FILE")"
        rm -f "$LOG_FILE"
        DELETED=$((DELETED + 1))
    done < <(find "$LOGS_DIR" -name "*.log" -mtime +${RETENTION_DAYS} -print0 2>/dev/null)

    echo -e "${GREEN}Deleted ${DELETED} old log file(s)${NC}"
}

cmd_clear() {
    local FEATURE="$1"
    if [ -z "$FEATURE" ]; then
        echo -e "${RED}Error: Feature name required${NC}"
        exit 1
    fi

    FEATURE=$(echo "$FEATURE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g')
    LOG_FILE="$LOGS_DIR/${FEATURE}.log"

    if [ -f "$LOG_FILE" ]; then
        rm -f "$LOG_FILE"
        echo -e "${GREEN}Cleared logs for ${FEATURE}${NC}"
    else
        echo -e "${YELLOW}No logs found for ${FEATURE}${NC}"
    fi
}

# Create logs directory if needed
mkdir -p "$LOGS_DIR"

case "${1:-}" in
    view)
        shift
        cmd_view "$@"
        ;;
    tail)
        shift
        cmd_tail "$@"
        ;;
    list)
        cmd_list
        ;;
    rotate)
        cmd_rotate
        ;;
    clear)
        shift
        cmd_clear "$@"
        ;;
    *)
        usage
        ;;
esac
