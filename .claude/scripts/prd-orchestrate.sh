#!/bin/bash
# PRD Orchestration Script
# Launches parallel Ralphs based on execution plan

set -e

# Resolve paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$CLAUDE_DIR/.." && pwd)"
RALPH_DOCKER="$SCRIPT_DIR/ralph-docker.sh"
ORCHESTRATION_DIR="$CLAUDE_DIR/ralph/orchestration"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Usage
usage() {
    echo "PRD Orchestration Script"
    echo ""
    echo "Usage: $0 <execution-id> [options]"
    echo ""
    echo "Commands:"
    echo "  $0 <execution-id>              Start all streams from execution plan"
    echo "  $0 <execution-id> --dry-run    Show what would be launched"
    echo "  $0 <execution-id> --status     Show status of this execution"
    echo "  $0 list                        List all execution plans"
    echo ""
    echo "Options:"
    echo "  --iterations <n>    Max iterations per Ralph (default: 50)"
    echo "  --dry-run           Show what would be launched without starting"
    echo "  --status            Show status of execution"
    echo "  --stop              Stop all Ralphs for this execution"
    echo ""
    echo "Examples:"
    echo "  $0 exec-20260130-sprint3"
    echo "  $0 exec-20260130-sprint3 --dry-run"
    echo "  $0 exec-20260130-sprint3 --status"
    echo "  $0 list"
    exit 1
}

# List all execution plans
cmd_list() {
    echo -e "${BLUE}Available Execution Plans${NC}"
    echo "========================================"

    if [ ! -d "$ORCHESTRATION_DIR" ]; then
        echo "  (none)"
        exit 0
    fi

    for EXEC_DIR in "$ORCHESTRATION_DIR"/*/; do
        if [ -d "$EXEC_DIR" ]; then
            EXEC_ID=$(basename "$EXEC_DIR")
            PLAN_FILE="$EXEC_DIR/execution-plan.json"

            if [ -f "$PLAN_FILE" ]; then
                # Extract info from plan
                STREAMS=$(jq -r '.total_streams' "$PLAN_FILE" 2>/dev/null || echo "?")
                STORIES=$(jq -r '.total_stories' "$PLAN_FILE" 2>/dev/null || echo "?")
                SOURCE=$(jq -r '.source_document' "$PLAN_FILE" 2>/dev/null | xargs basename || echo "?")
                DATE=$(jq -r '.created_at' "$PLAN_FILE" 2>/dev/null | cut -d'T' -f1 || echo "?")

                echo -e "  ${GREEN}${EXEC_ID}${NC}"
                echo "    Source: $SOURCE"
                echo "    Streams: $STREAMS | Stories: $STORIES | Created: $DATE"
                echo ""
            fi
        fi
    done
}

# Show status of an execution
cmd_status() {
    local EXEC_ID="$1"
    local EXEC_PATH="$ORCHESTRATION_DIR/$EXEC_ID"
    local PLAN_FILE="$EXEC_PATH/execution-plan.json"

    if [ ! -f "$PLAN_FILE" ]; then
        echo -e "${RED}Error: Execution plan not found: ${EXEC_ID}${NC}"
        exit 1
    fi

    echo -e "${BLUE}Execution Status: ${EXEC_ID}${NC}"
    echo "========================================"
    echo ""

    # Get parallel groups
    local GROUPS=$(jq -r '.parallel_groups | length' "$PLAN_FILE")

    for ((g=0; g<GROUPS; g++)); do
        local GROUP_NUM=$((g + 1))
        local MODE=$(jq -r ".parallel_groups[$g].mode // \"parallel\"" "$PLAN_FILE")
        local STREAM_IDS=$(jq -r ".parallel_groups[$g].streams[]" "$PLAN_FILE")

        echo -e "${CYAN}Group $GROUP_NUM ($MODE):${NC}"

        for STREAM_ID in $STREAM_IDS; do
            local STREAM_NAME=$(jq -r ".streams[] | select(.id == \"$STREAM_ID\") | .name" "$PLAN_FILE")
            local BRANCH=$(jq -r ".streams[] | select(.id == \"$STREAM_ID\") | .branch_name" "$PLAN_FILE")
            local FEATURE=$(echo "$BRANCH" | sed 's|ralph/||')
            local CONTAINER_NAME="ralph-${FEATURE}"

            # Check container status
            if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${CONTAINER_NAME}$"; then
                echo -e "  ${GREEN}●${NC} ${STREAM_ID} (${STREAM_NAME}) - ${GREEN}RUNNING${NC}"
            else
                # Check if worktree exists and has progress
                local WORKTREE_PATH="$PROJECT_ROOT/ralph-worktrees/$FEATURE"
                if [ -f "$WORKTREE_PATH/.claude/ralph/prd.json" ]; then
                    local INCOMPLETE=$(jq '[.userStories[] | select(.passes == false)] | length' "$WORKTREE_PATH/.claude/ralph/prd.json" 2>/dev/null || echo "?")
                    local TOTAL=$(jq '.userStories | length' "$WORKTREE_PATH/.claude/ralph/prd.json" 2>/dev/null || echo "?")

                    if [ "$INCOMPLETE" = "0" ]; then
                        echo -e "  ${GREEN}✓${NC} ${STREAM_ID} (${STREAM_NAME}) - ${GREEN}COMPLETED${NC}"
                    else
                        echo -e "  ${YELLOW}○${NC} ${STREAM_ID} (${STREAM_NAME}) - ${YELLOW}STOPPED${NC} ($((TOTAL - INCOMPLETE))/$TOTAL done)"
                    fi
                else
                    echo -e "  ${YELLOW}○${NC} ${STREAM_ID} (${STREAM_NAME}) - ${YELLOW}NOT STARTED${NC}"
                fi
            fi
        done
        echo ""
    done

    # Show critical path
    local CRITICAL_PATH=$(jq -r '.critical_path | join(" → ")' "$PLAN_FILE")
    echo -e "${BLUE}Critical Path:${NC} $CRITICAL_PATH"
}

# Stop all Ralphs for an execution
cmd_stop() {
    local EXEC_ID="$1"
    local EXEC_PATH="$ORCHESTRATION_DIR/$EXEC_ID"
    local PLAN_FILE="$EXEC_PATH/execution-plan.json"

    if [ ! -f "$PLAN_FILE" ]; then
        echo -e "${RED}Error: Execution plan not found: ${EXEC_ID}${NC}"
        exit 1
    fi

    echo -e "${BLUE}Stopping all Ralphs for: ${EXEC_ID}${NC}"

    # Get all streams
    local STREAMS=$(jq -r '.streams[].branch_name' "$PLAN_FILE")

    for BRANCH in $STREAMS; do
        local FEATURE=$(echo "$BRANCH" | sed 's|ralph/||')
        local CONTAINER_NAME="ralph-${FEATURE}"

        if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${CONTAINER_NAME}$"; then
            echo -e "  Stopping ${CONTAINER_NAME}..."
            docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
            docker rm "$CONTAINER_NAME" >/dev/null 2>&1 || true
        fi
    done

    echo -e "${GREEN}All Ralphs stopped.${NC}"
}

# Start streams from execution plan
cmd_start() {
    local EXEC_ID="$1"
    local DRY_RUN="$2"
    local MAX_ITERATIONS="${3:-50}"

    local EXEC_PATH="$ORCHESTRATION_DIR/$EXEC_ID"
    local PLAN_FILE="$EXEC_PATH/execution-plan.json"

    if [ ! -f "$PLAN_FILE" ]; then
        echo -e "${RED}Error: Execution plan not found: ${EXEC_ID}${NC}"
        echo "Looking in: $PLAN_FILE"
        exit 1
    fi

    echo -e "${BLUE}PRD Orchestration: ${EXEC_ID}${NC}"
    echo "========================================"

    # Get execution info
    local SOURCE=$(jq -r '.source_document' "$PLAN_FILE")
    local TOTAL_STREAMS=$(jq -r '.total_streams' "$PLAN_FILE")
    local TOTAL_STORIES=$(jq -r '.total_stories' "$PLAN_FILE")
    local SPEEDUP=$(jq -r '.speedup_percentage // 0' "$PLAN_FILE")

    echo "Source: $SOURCE"
    echo "Streams: $TOTAL_STREAMS | Stories: $TOTAL_STORIES | Speedup: ~${SPEEDUP}%"
    echo ""

    # Get parallel groups
    local GROUPS=$(jq -r '.parallel_groups | length' "$PLAN_FILE")

    for ((g=0; g<GROUPS; g++)); do
        local GROUP_NUM=$((g + 1))
        local MODE=$(jq -r ".parallel_groups[$g].mode // \"parallel\"" "$PLAN_FILE")
        local STREAM_IDS=$(jq -r ".parallel_groups[$g].streams[]" "$PLAN_FILE")

        echo -e "${CYAN}=== Group $GROUP_NUM ($MODE) ===${NC}"

        # Collect streams for this group
        local STREAMS_IN_GROUP=()
        for STREAM_ID in $STREAM_IDS; do
            STREAMS_IN_GROUP+=("$STREAM_ID")
        done

        # Determine after dependency (previous group's streams if any)
        local AFTER_FEATURE=""
        if [ $g -gt 0 ]; then
            # Get last stream from previous group
            local PREV_GROUP=$((g - 1))
            local PREV_STREAMS=$(jq -r ".parallel_groups[$PREV_GROUP].streams | last" "$PLAN_FILE")
            local PREV_BRANCH=$(jq -r ".streams[] | select(.id == \"$PREV_STREAMS\") | .branch_name" "$PLAN_FILE")
            AFTER_FEATURE=$(echo "$PREV_BRANCH" | sed 's|ralph/||')
        fi

        # Start each stream
        for STREAM_ID in "${STREAMS_IN_GROUP[@]}"; do
            local STREAM_NAME=$(jq -r ".streams[] | select(.id == \"$STREAM_ID\") | .name" "$PLAN_FILE")
            local BRANCH=$(jq -r ".streams[] | select(.id == \"$STREAM_ID\") | .branch_name" "$PLAN_FILE")
            local PRD_FILE=$(jq -r ".streams[] | select(.id == \"$STREAM_ID\") | .prd_file" "$PLAN_FILE")
            local FEATURE=$(echo "$BRANCH" | sed 's|ralph/||')

            echo ""
            echo -e "  ${YELLOW}Starting:${NC} $STREAM_ID ($STREAM_NAME)"
            echo "    Branch: $BRANCH"
            echo "    PRD: $PRD_FILE"

            if [ -n "$AFTER_FEATURE" ]; then
                echo "    After: ralph-$AFTER_FEATURE"
            fi

            if [ "$DRY_RUN" = "true" ]; then
                echo -e "    ${YELLOW}[DRY RUN]${NC} Would start: $RALPH_DOCKER start $FEATURE --prd $EXEC_PATH/$PRD_FILE --iterations $MAX_ITERATIONS"
                if [ -n "$AFTER_FEATURE" ]; then
                    echo "      with --after $AFTER_FEATURE"
                fi
            else
                # Build command
                local CMD="$RALPH_DOCKER start $FEATURE --prd $EXEC_PATH/$PRD_FILE --iterations $MAX_ITERATIONS"
                if [ -n "$AFTER_FEATURE" ]; then
                    CMD="$CMD --after $AFTER_FEATURE"
                fi

                # Execute
                echo "    Running: $CMD"
                eval "$CMD" &

                # Small delay to avoid race conditions
                sleep 2
            fi
        done

        # For sequential mode, wait for this group to complete before next
        if [ "$MODE" = "sequential" ] && [ "$DRY_RUN" != "true" ]; then
            echo ""
            echo -e "  ${YELLOW}Waiting for group $GROUP_NUM to complete...${NC}"
            # The --after flag in ralph-docker handles this
        fi

        echo ""
    done

    if [ "$DRY_RUN" = "true" ]; then
        echo -e "${YELLOW}Dry run complete. No Ralphs were started.${NC}"
        echo "Run without --dry-run to actually start."
    else
        echo -e "${GREEN}All Ralphs launched.${NC}"
        echo ""
        echo "Monitor with:"
        echo "  $0 $EXEC_ID --status"
        echo "  $RALPH_DOCKER status"
        echo ""
        echo "Stop with:"
        echo "  $0 $EXEC_ID --stop"
    fi
}

# Parse arguments
EXEC_ID=""
DRY_RUN="false"
SHOW_STATUS="false"
STOP_ALL="false"
MAX_ITERATIONS="50"

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        --status)
            SHOW_STATUS="true"
            shift
            ;;
        --stop)
            STOP_ALL="true"
            shift
            ;;
        --iterations)
            MAX_ITERATIONS="$2"
            shift 2
            ;;
        list)
            cmd_list
            exit 0
            ;;
        -h|--help)
            usage
            ;;
        *)
            if [ -z "$EXEC_ID" ]; then
                EXEC_ID="$1"
            fi
            shift
            ;;
    esac
done

# Validate
if [ -z "$EXEC_ID" ]; then
    usage
fi

# Execute command
if [ "$SHOW_STATUS" = "true" ]; then
    cmd_status "$EXEC_ID"
elif [ "$STOP_ALL" = "true" ]; then
    cmd_stop "$EXEC_ID"
else
    cmd_start "$EXEC_ID" "$DRY_RUN" "$MAX_ITERATIONS"
fi
