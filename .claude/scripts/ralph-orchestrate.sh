#!/bin/bash
# Ralph Orchestration Script
# Runs multiple Ralph instances with proper dependency ordering

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RALPH_DOCKER="$SCRIPT_DIR/ralph-docker.sh"
PRD_DIR=".claude/ralph/orchestration/exec-20260130-sprint3-client-journey"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

usage() {
    echo "Ralph Orchestration - Run multiple streams with dependency ordering"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  start [--dry-run]     Start all remaining streams"
    echo "  status                Show orchestration status"
    echo "  status --live         Live monitor with file changes (updates every 5s)"
    echo "  stop-all              Stop all running Ralph containers"
    echo ""
    echo "Options:"
    echo "  --dry-run             Show what would be started without starting"
    echo "  --wave <n>            Start only wave N (1, 2, or 3)"
    echo "  --iterations <n>      Max iterations per stream (default: 75)"
    echo ""
    echo "Dependency Graph:"
    echo "  Wave 1 (parallel):    intake, proposals, knowledge-base"
    echo "  Wave 2 (chained):     payments → proposals, calendar → knowledge"
    echo "  Wave 3 (final):       e2e-tests → all others"
    exit 1
}

# Check if a stream's dependencies are complete
check_dependencies() {
    local STREAM=$1
    local PRD_FILE="$PRD_DIR/$STREAM"

    if [ ! -f "$PRD_FILE" ]; then
        echo "false"
        return
    fi

    local DEPS=$(jq -r '.dependencies[]' "$PRD_FILE" 2>/dev/null)

    for DEP in $DEPS; do
        # Stream-1 (foundation) is already merged
        if [ "$DEP" = "stream-1" ]; then
            continue
        fi

        # Check if dependency stream is complete
        local DEP_NUM="${DEP#stream-}"
        local DEP_NAME=$(get_stream_name "$DEP_NUM")
        local DEP_PRD="$PRD_DIR/prd-stream-${DEP_NUM}-${DEP_NAME}.json"

        if [ -f "$DEP_PRD" ]; then
            local INCOMPLETE=$(jq '[.userStories[] | select(.passes == false)] | length' "$DEP_PRD" 2>/dev/null || echo "999")
            if [ "$INCOMPLETE" != "0" ]; then
                echo "false"
                return
            fi
        else
            echo "false"
            return
        fi
    done

    echo "true"
}

get_stream_name() {
    case $1 in
        1) echo "foundation" ;;
        2) echo "intake" ;;
        3) echo "proposals" ;;
        4) echo "payments-onboarding" ;;
        5) echo "knowledge-base" ;;
        6) echo "calendar-meetings" ;;
        7) echo "e2e" ;;
        *) echo "unknown" ;;
    esac
}

# Check if stream is already complete
is_stream_complete() {
    local PRD_FILE=$1
    if [ ! -f "$PRD_FILE" ]; then
        echo "false"
        return
    fi
    local INCOMPLETE=$(jq '[.userStories[] | select(.passes == false)] | length' "$PRD_FILE" 2>/dev/null || echo "999")
    if [ "$INCOMPLETE" = "0" ]; then
        echo "true"
    else
        echo "false"
    fi
}

# Check if container is running
is_running() {
    local FEATURE=$1
    docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^ralph-${FEATURE}$" && echo "true" || echo "false"
}

cmd_status_live() {
    while true; do
        clear
        echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
        echo -e "${BLUE}  Ralph Live Monitor - $(date '+%H:%M:%S')${NC}"
        echo -e "${BLUE}  Press Ctrl+C to exit${NC}"
        echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
        echo ""

        # Get running containers
        RUNNING=$(docker ps --filter "name=ralph-" --format '{{.Names}}' 2>/dev/null | sort)

        if [ -z "$RUNNING" ]; then
            echo -e "${YELLOW}No Ralph containers running.${NC}"
            echo ""
            echo "Start with: bash $0 start"
            sleep 5
            continue
        fi

        for CONTAINER in $RUNNING; do
            FEATURE="${CONTAINER#ralph-}"
            UPTIME=$(docker ps --filter "name=$CONTAINER" --format '{{.RunningFor}}' 2>/dev/null)

            echo -e "${GREEN}━━━ $CONTAINER ${NC}(up $UPTIME)"

            # Get file changes
            CHANGES=$(docker exec "$CONTAINER" bash -c "git status --short 2>/dev/null" 2>/dev/null)
            if [ -n "$CHANGES" ]; then
                # Count files
                MODIFIED=$(echo "$CHANGES" | grep -c "^ M" || echo "0")
                NEW=$(echo "$CHANGES" | grep -c "^??" || echo "0")

                echo -e "  Files: ${YELLOW}$MODIFIED modified${NC}, ${GREEN}$NEW new${NC}"

                # Show recent new files (excluding node_modules, .pnpm-store)
                echo -e "  ${CYAN}Recent:${NC}"
                echo "$CHANGES" | grep -v ".pnpm-store" | grep -v "node_modules" | grep -v ".ralph-lock" | tail -5 | while read line; do
                    echo "    $line"
                done
            else
                echo -e "  ${YELLOW}No changes yet${NC}"
            fi

            # Show last log line if available
            LOG_LINE=$(docker exec "$CONTAINER" bash -c "tail -1 /ralph-logs/${FEATURE}.log 2>/dev/null" 2>/dev/null)
            if [ -n "$LOG_LINE" ] && [ "$LOG_LINE" != "" ]; then
                echo -e "  ${CYAN}Log:${NC} $(echo "$LOG_LINE" | cut -c1-60)"
            fi

            echo ""
        done

        # Show pending streams
        echo -e "${YELLOW}━━━ Pending Streams${NC}"
        for STREAM in "4-payments-onboarding" "6-calendar-meetings" "7-e2e"; do
            NAME="${STREAM#*-}"
            if ! echo "$RUNNING" | grep -q "ralph-$NAME"; then
                PRD="$PRD_DIR/prd-stream-${STREAM}.json"
                STORIES=$(jq '[.userStories[] | select(.passes == false)] | length' "$PRD" 2>/dev/null || echo "?")
                DEPS=$(jq -r '.dependencies | join(", ")' "$PRD" 2>/dev/null | sed 's/stream-//g')
                echo -e "  ${NAME}: ${RED}waiting${NC} (${STORIES} stories, needs: $DEPS)"
            fi
        done

        echo ""
        echo -e "${BLUE}───────────────────────────────────────────────────────────${NC}"
        echo "Logs: bash .claude/scripts/ralph-docker.sh logs <feature> -f"

        sleep 5
    done
}

cmd_status() {
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Ralph Orchestration Status - Sprint 3 Client Journey${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""

    # Wave 1
    echo -e "${CYAN}Wave 1 (parallel - no dependencies):${NC}"
    for STREAM in "2-intake" "3-proposals" "5-knowledge-base"; do
        NUM="${STREAM%%-*}"
        NAME="${STREAM#*-}"
        PRD="$PRD_DIR/prd-stream-${STREAM}.json"

        RUNNING=$(is_running "$NAME")
        COMPLETE=$(is_stream_complete "$PRD")

        if [ "$COMPLETE" = "true" ]; then
            STATUS="${GREEN}✓ COMPLETE${NC}"
        elif [ "$RUNNING" = "true" ]; then
            ITER=$(grep -o "Iteration [0-9]*" "ralph-logs/${NAME}.log" 2>/dev/null | tail -1 | awk '{print $2}' || echo "?")
            STATUS="${YELLOW}⟳ RUNNING (iter $ITER)${NC}"
        else
            STORIES=$(jq '[.userStories[] | select(.passes == false)] | length' "$PRD" 2>/dev/null || echo "?")
            STATUS="${RED}○ PENDING ($STORIES stories)${NC}"
        fi

        echo -e "  stream-$NUM ($NAME): $STATUS"
    done
    echo ""

    # Wave 2
    echo -e "${CYAN}Wave 2 (chained dependencies):${NC}"
    for STREAM in "4-payments-onboarding" "6-calendar-meetings"; do
        NUM="${STREAM%%-*}"
        NAME="${STREAM#*-}"
        PRD="$PRD_DIR/prd-stream-${STREAM}.json"

        RUNNING=$(is_running "$NAME")
        COMPLETE=$(is_stream_complete "$PRD")
        DEPS=$(jq -r '.dependencies | join(", ")' "$PRD" 2>/dev/null || echo "?")

        if [ "$COMPLETE" = "true" ]; then
            STATUS="${GREEN}✓ COMPLETE${NC}"
        elif [ "$RUNNING" = "true" ]; then
            ITER=$(grep -o "Iteration [0-9]*" "ralph-logs/${NAME}.log" 2>/dev/null | tail -1 | awk '{print $2}' || echo "?")
            STATUS="${YELLOW}⟳ RUNNING (iter $ITER)${NC}"
        else
            STORIES=$(jq '[.userStories[] | select(.passes == false)] | length' "$PRD" 2>/dev/null || echo "?")
            STATUS="${RED}○ PENDING ($STORIES stories) → waits for: $DEPS${NC}"
        fi

        echo -e "  stream-$NUM ($NAME): $STATUS"
    done
    echo ""

    # Wave 3
    echo -e "${CYAN}Wave 3 (final - depends on all):${NC}"
    PRD="$PRD_DIR/prd-stream-7-e2e.json"
    RUNNING=$(is_running "e2e")
    COMPLETE=$(is_stream_complete "$PRD")

    if [ "$COMPLETE" = "true" ]; then
        STATUS="${GREEN}✓ COMPLETE${NC}"
    elif [ "$RUNNING" = "true" ]; then
        ITER=$(grep -o "Iteration [0-9]*" "ralph-logs/e2e.log" 2>/dev/null | tail -1 | awk '{print $2}' || echo "?")
        STATUS="${YELLOW}⟳ RUNNING (iter $ITER)${NC}"
    else
        STORIES=$(jq '[.userStories[] | select(.passes == false)] | length' "$PRD" 2>/dev/null || echo "?")
        STATUS="${RED}○ PENDING ($STORIES stories) → waits for: all others${NC}"
    fi
    echo -e "  stream-7 (e2e-tests): $STATUS"
    echo ""

    # Running containers
    echo -e "${CYAN}Running Containers:${NC}"
    RUNNING_CONTAINERS=$(docker ps --filter "name=ralph-" --format '{{.Names}}' 2>/dev/null)
    if [ -z "$RUNNING_CONTAINERS" ]; then
        echo "  (none)"
    else
        echo "$RUNNING_CONTAINERS" | while read CONTAINER; do
            echo -e "  ${GREEN}$CONTAINER${NC}"
        done
    fi
    echo ""
}

cmd_start() {
    local DRY_RUN=false
    local WAVE=""
    local MAX_ITERATIONS=75

    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --wave)
                WAVE="$2"
                shift 2
                ;;
            --iterations)
                MAX_ITERATIONS="$2"
                shift 2
                ;;
            *)
                shift
                ;;
        esac
    done

    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Ralph Orchestration - Starting Streams${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}DRY RUN - no containers will be started${NC}"
        echo ""
    fi

    # Ensure ralph-logs directory exists
    mkdir -p ralph-logs

    # Wave 1: Start parallel streams (intake, proposals, knowledge-base)
    if [ -z "$WAVE" ] || [ "$WAVE" = "1" ]; then
        echo -e "${CYAN}Wave 1: Starting parallel streams...${NC}"

        for STREAM in "2-intake" "3-proposals" "5-knowledge-base"; do
            NAME="${STREAM#*-}"
            PRD="$PRD_DIR/prd-stream-${STREAM}.json"

            # Skip if complete
            if [ "$(is_stream_complete "$PRD")" = "true" ]; then
                echo -e "  ${GREEN}✓${NC} $NAME: already complete, skipping"
                continue
            fi

            # Skip if running
            if [ "$(is_running "$NAME")" = "true" ]; then
                echo -e "  ${YELLOW}⟳${NC} $NAME: already running, skipping"
                continue
            fi

            echo -e "  ${BLUE}▶${NC} Starting $NAME..."
            if [ "$DRY_RUN" = false ]; then
                bash "$RALPH_DOCKER" start "$NAME" --prd "$PRD" --iterations "$MAX_ITERATIONS" &
                sleep 2  # Stagger starts slightly
            else
                echo "      Would run: bash $RALPH_DOCKER start $NAME --prd $PRD --iterations $MAX_ITERATIONS"
            fi
        done

        echo ""
    fi

    # Wave 2: Start chained streams
    if [ -z "$WAVE" ] || [ "$WAVE" = "2" ]; then
        echo -e "${CYAN}Wave 2: Starting chained streams...${NC}"

        # payments-onboarding waits for proposals
        NAME="payments-onboarding"
        PRD="$PRD_DIR/prd-stream-4-payments-onboarding.json"
        if [ "$(is_stream_complete "$PRD")" = "true" ]; then
            echo -e "  ${GREEN}✓${NC} $NAME: already complete, skipping"
        elif [ "$(is_running "$NAME")" = "true" ]; then
            echo -e "  ${YELLOW}⟳${NC} $NAME: already running, skipping"
        else
            echo -e "  ${BLUE}▶${NC} Starting $NAME (after proposals)..."
            if [ "$DRY_RUN" = false ]; then
                bash "$RALPH_DOCKER" start "$NAME" --prd "$PRD" --iterations "$MAX_ITERATIONS" --after proposals &
                sleep 1
            else
                echo "      Would run: bash $RALPH_DOCKER start $NAME --prd $PRD --iterations $MAX_ITERATIONS --after proposals"
            fi
        fi

        # calendar-meetings waits for knowledge-base
        NAME="calendar-meetings"
        PRD="$PRD_DIR/prd-stream-6-calendar-meetings.json"
        if [ "$(is_stream_complete "$PRD")" = "true" ]; then
            echo -e "  ${GREEN}✓${NC} $NAME: already complete, skipping"
        elif [ "$(is_running "$NAME")" = "true" ]; then
            echo -e "  ${YELLOW}⟳${NC} $NAME: already running, skipping"
        else
            echo -e "  ${BLUE}▶${NC} Starting $NAME (after knowledge-base)..."
            if [ "$DRY_RUN" = false ]; then
                bash "$RALPH_DOCKER" start "$NAME" --prd "$PRD" --iterations "$MAX_ITERATIONS" --after knowledge-base &
                sleep 1
            else
                echo "      Would run: bash $RALPH_DOCKER start $NAME --prd $PRD --iterations $MAX_ITERATIONS --after knowledge-base"
            fi
        fi

        echo ""
    fi

    # Wave 3: E2E tests (after everything else)
    if [ -z "$WAVE" ] || [ "$WAVE" = "3" ]; then
        echo -e "${CYAN}Wave 3: Starting E2E tests (after all others)...${NC}"

        NAME="e2e"
        PRD="$PRD_DIR/prd-stream-7-e2e.json"
        if [ "$(is_stream_complete "$PRD")" = "true" ]; then
            echo -e "  ${GREEN}✓${NC} $NAME: already complete, skipping"
        elif [ "$(is_running "$NAME")" = "true" ]; then
            echo -e "  ${YELLOW}⟳${NC} $NAME: already running, skipping"
        else
            # E2E waits for the last Wave 2 stream (calendar-meetings)
            echo -e "  ${BLUE}▶${NC} Starting $NAME (after calendar-meetings)..."
            if [ "$DRY_RUN" = false ]; then
                bash "$RALPH_DOCKER" start "$NAME" --prd "$PRD" --iterations "$MAX_ITERATIONS" --after calendar-meetings &
            else
                echo "      Would run: bash $RALPH_DOCKER start $NAME --prd $PRD --iterations $MAX_ITERATIONS --after calendar-meetings"
            fi
        fi

        echo ""
    fi

    if [ "$DRY_RUN" = false ]; then
        # Wait for background jobs to register
        sleep 3

        echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}  Orchestration started!${NC}"
        echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
        echo ""
        echo "Monitor with:"
        echo "  bash .claude/scripts/ralph-orchestrate.sh status"
        echo "  bash .claude/scripts/ralph-docker.sh logs <feature> -f"
        echo ""
    fi
}

cmd_stop_all() {
    echo -e "${BLUE}Stopping all Ralph containers...${NC}"

    CONTAINERS=$(docker ps --filter "name=ralph-" --format '{{.Names}}' 2>/dev/null)

    if [ -z "$CONTAINERS" ]; then
        echo "No Ralph containers running."
        return
    fi

    for CONTAINER in $CONTAINERS; do
        echo -e "  Stopping ${YELLOW}$CONTAINER${NC}..."
        docker stop "$CONTAINER" >/dev/null
        docker rm "$CONTAINER" 2>/dev/null || true
    done

    echo -e "${GREEN}All containers stopped.${NC}"
}

# Main
case "${1:-}" in
    start)
        shift
        cmd_start "$@"
        ;;
    status)
        shift
        if [ "${1:-}" = "--live" ] || [ "${1:-}" = "-l" ]; then
            cmd_status_live
        else
            cmd_status
        fi
        ;;
    stop-all)
        cmd_stop_all
        ;;
    *)
        usage
        ;;
esac
