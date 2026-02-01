#!/bin/bash
# Ralph Docker Orchestration
# Main script for managing Ralph containers

set -e

# Resolve paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$CLAUDE_DIR/.." && pwd)"
DOCKER_DIR="$CLAUDE_DIR/docker"
WORKTREES_DIR="$PROJECT_ROOT/ralph-worktrees"
LOGS_DIR="$PROJECT_ROOT/ralph-logs"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Usage
usage() {
    echo "Ralph Docker Orchestration"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  start <feature> [--prd <file>] [--iterations <n>] [--after <feature>]"
    echo "                          Start Ralph on a feature"
    echo "  stop <feature>          Stop a running Ralph"
    echo "  status                  Show status of all Ralphs"
    echo "  logs <feature> [-f]     View logs for a feature"
    echo "  cleanup [feature]       Clean up orphaned worktrees"
    echo "  build                   Build the Docker image"
    echo ""
    echo "Examples:"
    echo "  $0 start auth --prd tasks/prd-auth.md"
    echo "  $0 start dashboard --iterations 100 --after auth"
    echo "  $0 status"
    echo "  $0 logs auth -f"
    echo "  $0 stop auth"
    exit 1
}

# Build Docker image
cmd_build() {
    echo -e "${BLUE}Building Ralph Docker image...${NC}"
    cd "$DOCKER_DIR"
    docker build -t ralph:latest .
    echo -e "${GREEN}Build complete.${NC}"
}

# Start Ralph on a feature
cmd_start() {
    local FEATURE=""
    local PRD_FILE=""
    local MAX_ITERATIONS=50
    local AFTER_FEATURE=""

    # Parse args
    while [[ $# -gt 0 ]]; do
        case $1 in
            --prd)
                PRD_FILE="$2"
                shift 2
                ;;
            --iterations)
                MAX_ITERATIONS="$2"
                shift 2
                ;;
            --after)
                AFTER_FEATURE="$2"
                shift 2
                ;;
            *)
                if [ -z "$FEATURE" ]; then
                    FEATURE="$1"
                fi
                shift
                ;;
        esac
    done

    if [ -z "$FEATURE" ]; then
        echo -e "${RED}Error: Feature name required${NC}"
        usage
    fi

    # Sanitize feature name
    FEATURE=$(echo "$FEATURE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g')
    CONTAINER_NAME="ralph-${FEATURE}"
    BRANCH_NAME="ralph/${FEATURE}"
    WORKTREE_PATH="$WORKTREES_DIR/$FEATURE"

    echo -e "${BLUE}Starting Ralph for feature: ${FEATURE}${NC}"

    # Wait for dependency if specified
    if [ -n "$AFTER_FEATURE" ]; then
        echo -e "${YELLOW}Waiting for ralph-${AFTER_FEATURE} to complete...${NC}"
        while docker ps --format '{{.Names}}' | grep -q "ralph-${AFTER_FEATURE}"; do
            sleep 10
        done
        echo -e "${GREEN}Dependency complete. Proceeding...${NC}"
    fi

    # Check if container already running
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        echo -e "${YELLOW}Ralph for ${FEATURE} is already running.${NC}"
        echo "Use '$0 stop ${FEATURE}' to stop it first."
        exit 1
    fi

    # Create directories
    mkdir -p "$WORKTREES_DIR"
    mkdir -p "$LOGS_DIR"

    # Create or reuse worktree
    if [ -d "$WORKTREE_PATH" ]; then
        echo -e "${YELLOW}Worktree exists. Checking status...${NC}"
        cd "$WORKTREE_PATH"

        # Check for uncommitted changes
        if [ -n "$(git status --porcelain)" ]; then
            echo -e "${YELLOW}Uncommitted changes found. Reset? (y/N)${NC}"
            read -r RESET
            if [ "$RESET" = "y" ] || [ "$RESET" = "Y" ]; then
                git checkout .
                git clean -fd
            fi
        fi
        cd "$PROJECT_ROOT"
    else
        echo -e "${BLUE}Creating worktree for ${BRANCH_NAME}...${NC}"
        cd "$PROJECT_ROOT"

        # Check if branch exists
        if git show-ref --verify --quiet "refs/heads/${BRANCH_NAME}"; then
            echo "Branch exists, creating worktree..."
            git worktree add "$WORKTREE_PATH" "$BRANCH_NAME"
        else
            echo "Creating new branch and worktree..."
            git worktree add -b "$BRANCH_NAME" "$WORKTREE_PATH"
        fi
    fi

    # Copy PRD if specified
    if [ -n "$PRD_FILE" ]; then
        if [ -f "$PROJECT_ROOT/$PRD_FILE" ]; then
            echo -e "${BLUE}Copying PRD from ${PRD_FILE}...${NC}"
            mkdir -p "$WORKTREE_PATH/.claude/ralph"
            # Convert PRD markdown to JSON if needed, or copy existing JSON
            if [[ "$PRD_FILE" == *.json ]]; then
                cp "$PROJECT_ROOT/$PRD_FILE" "$WORKTREE_PATH/.claude/ralph/prd.json"
            else
                echo -e "${YELLOW}Note: PRD is markdown. Run /prd-json first to convert.${NC}"
                echo "Copying as-is for reference..."
                cp "$PROJECT_ROOT/$PRD_FILE" "$WORKTREE_PATH/.claude/ralph/"
            fi
        else
            echo -e "${RED}Error: PRD file not found: ${PRD_FILE}${NC}"
            exit 1
        fi
    fi

    # Copy .claude folder to worktree if not present
    if [ ! -d "$WORKTREE_PATH/.claude" ]; then
        echo -e "${BLUE}Copying .claude folder to worktree...${NC}"
        cp -r "$CLAUDE_DIR" "$WORKTREE_PATH/"
    fi

    # Copy .env.local to worktree if it exists
    if [ -f "$PROJECT_ROOT/.env.local" ] && [ ! -f "$WORKTREE_PATH/.env.local" ]; then
        echo -e "${BLUE}Copying .env.local to worktree...${NC}"
        cp "$PROJECT_ROOT/.env.local" "$WORKTREE_PATH/.env.local"
    fi

    # Check for prd.json
    if [ ! -f "$WORKTREE_PATH/.claude/ralph/prd.json" ]; then
        echo -e "${RED}Error: No prd.json found in worktree.${NC}"
        echo "Either:"
        echo "  1. Specify --prd with a JSON file"
        echo "  2. Create prd.json in $WORKTREE_PATH/.claude/ralph/"
        exit 1
    fi

    # Get auth token or API key
    # Prefer CLAUDE_CODE_OAUTH_TOKEN (uses subscription), fall back to ANTHROPIC_API_KEY
    if [ -z "$CLAUDE_CODE_OAUTH_TOKEN" ]; then
        # Try to load from .env.local (check both variable names)
        if [ -f "$PROJECT_ROOT/.env.local" ]; then
            CLAUDE_CODE_OAUTH_TOKEN=$(grep "^CLAUDE_CODE_OAUTH_TOKEN=" "$PROJECT_ROOT/.env.local" | cut -d= -f2-)
            # Also check old variable name for compatibility
            if [ -z "$CLAUDE_CODE_OAUTH_TOKEN" ]; then
                CLAUDE_CODE_OAUTH_TOKEN=$(grep "^CLAUDE_CODE_OAUTH_TOKEN=" "$PROJECT_ROOT/.env.local" | cut -d= -f2-)
            fi
        fi
    fi

    if [ -n "$CLAUDE_CODE_OAUTH_TOKEN" ]; then
        echo -e "${GREEN}Using Claude Code OAuth token (subscription)${NC}"
        export CLAUDE_CODE_OAUTH_TOKEN
    else
        # Fall back to API key
        if [ -z "$ANTHROPIC_API_KEY" ]; then
            if [ -f "$PROJECT_ROOT/.env.local" ]; then
                ANTHROPIC_API_KEY=$(grep "^ANTHROPIC_API_KEY=" "$PROJECT_ROOT/.env.local" | cut -d= -f2-)
            fi
            if [ -z "$ANTHROPIC_API_KEY" ] && [ -f ~/.anthropic/api_key ]; then
                ANTHROPIC_API_KEY=$(cat ~/.anthropic/api_key)
            fi
        fi
        if [ -z "$ANTHROPIC_API_KEY" ] && [ -z "$CLAUDE_CODE_OAUTH_TOKEN" ]; then
            echo -e "${RED}Error: No authentication configured${NC}"
            echo "Either set CLAUDE_CODE_OAUTH_TOKEN (run 'claude setup-token') or ANTHROPIC_API_KEY"
            exit 1
        fi
        echo -e "${YELLOW}Using API key (has separate usage limits)${NC}"
        export ANTHROPIC_API_KEY
    fi

    # Build image if needed
    if ! docker images | grep -q "ralph.*latest"; then
        cmd_build
    fi

    # Start container using docker run (not compose, to allow true parallel containers)
    echo -e "${BLUE}Starting container ${CONTAINER_NAME}...${NC}"

    # Remove existing container if stopped
    docker rm "$CONTAINER_NAME" 2>/dev/null || true

    docker run -d \
        --name "$CONTAINER_NAME" \
        --cpus 2 \
        --memory 4g \
        -e "RALPH_FEATURE_NAME=$FEATURE" \
        -e "RALPH_MAX_ITERATIONS=$MAX_ITERATIONS" \
        -e "RALPH_LOG_FILE=/ralph-logs/${FEATURE}.log" \
        -e "CLAUDE_CODE_OAUTH_TOKEN=${CLAUDE_CODE_OAUTH_TOKEN:-}" \
        -e "ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}" \
        -e "GITHUB_TOKEN=${GITHUB_TOKEN:-}" \
        -v "$WORKTREE_PATH:/workspace:rw" \
        -v "$PROJECT_ROOT/.git:/main-repo/.git:rw" \
        -v "$LOGS_DIR:/ralph-logs:rw" \
        -v "$HOME/.ssh:/home/ralph/.ssh:ro" \
        -w /workspace \
        ralph:latest

    echo ""
    echo -e "${GREEN}Ralph started for feature: ${FEATURE}${NC}"
    echo "  Container: ${CONTAINER_NAME}"
    echo "  Branch: ${BRANCH_NAME}"
    echo "  Worktree: ${WORKTREE_PATH}"
    echo "  Logs: ${LOGS_DIR}/${FEATURE}.log"
    echo ""
    echo "Commands:"
    echo "  View logs: $0 logs ${FEATURE} -f"
    echo "  Check status: $0 status"
    echo "  Stop: $0 stop ${FEATURE}"
}

# Stop Ralph
cmd_stop() {
    local FEATURE="$1"

    if [ -z "$FEATURE" ]; then
        echo -e "${RED}Error: Feature name required${NC}"
        usage
    fi

    FEATURE=$(echo "$FEATURE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g')
    CONTAINER_NAME="ralph-${FEATURE}"

    echo -e "${BLUE}Stopping Ralph for feature: ${FEATURE}${NC}"

    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        docker stop "$CONTAINER_NAME"
        docker rm "$CONTAINER_NAME" 2>/dev/null || true
        echo -e "${GREEN}Stopped ${CONTAINER_NAME}${NC}"
    else
        echo -e "${YELLOW}Container ${CONTAINER_NAME} not running${NC}"
    fi

    # Remove lock file
    WORKTREE_PATH="$WORKTREES_DIR/$FEATURE"
    rm -f "$WORKTREE_PATH/.ralph-lock"
}

# Show status
cmd_status() {
    echo -e "${BLUE}Ralph Status${NC}"
    echo "========================================"
    echo ""

    # Running containers
    echo -e "${GREEN}Running:${NC}"
    local RUNNING=$(docker ps --format '{{.Names}}' | grep "^ralph-" || true)
    if [ -z "$RUNNING" ]; then
        echo "  (none)"
    else
        for CONTAINER in $RUNNING; do
            FEATURE="${CONTAINER#ralph-}"
            LOG_FILE="$LOGS_DIR/${FEATURE}.log"

            # Get iteration from log
            ITERATION="?"
            if [ -f "$LOG_FILE" ]; then
                ITERATION=$(grep -o "Iteration [0-9]*" "$LOG_FILE" | tail -1 | awk '{print $2}')
            fi

            # Get current story from prd.json
            WORKTREE_PATH="$WORKTREES_DIR/$FEATURE"
            CURRENT_STORY="?"
            if [ -f "$WORKTREE_PATH/.claude/ralph/prd.json" ]; then
                CURRENT_STORY=$(jq -r '.userStories[] | select(.passes == false) | .id' "$WORKTREE_PATH/.claude/ralph/prd.json" 2>/dev/null | head -1)
            fi

            echo -e "  ${GREEN}${CONTAINER}${NC} | iteration ${ITERATION} | ${CURRENT_STORY:-done}"
        done
    fi
    echo ""

    # Worktrees (including orphaned)
    echo -e "${YELLOW}Worktrees:${NC}"
    if [ -d "$WORKTREES_DIR" ]; then
        for WORKTREE in "$WORKTREES_DIR"/*/; do
            if [ -d "$WORKTREE" ]; then
                FEATURE=$(basename "$WORKTREE")
                CONTAINER_NAME="ralph-${FEATURE}"

                # Check container status
                if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
                    STATUS="${GREEN}RUNNING${NC}"
                elif [ -f "$WORKTREE/.ralph-lock" ]; then
                    STATUS="${RED}ORPHANED${NC}"
                else
                    # Check if all stories passed
                    if [ -f "$WORKTREE/.claude/ralph/prd.json" ]; then
                        INCOMPLETE=$(jq '[.userStories[] | select(.passes == false)] | length' "$WORKTREE/.claude/ralph/prd.json" 2>/dev/null || echo "?")
                        if [ "$INCOMPLETE" = "0" ]; then
                            STATUS="${GREEN}COMPLETED${NC}"
                        else
                            STATUS="${YELLOW}STOPPED${NC} (${INCOMPLETE} remaining)"
                        fi
                    else
                        STATUS="${YELLOW}NO PRD${NC}"
                    fi
                fi

                echo -e "  ${FEATURE} | ${STATUS}"
            fi
        done
    else
        echo "  (none)"
    fi
    echo ""
}

# View logs
cmd_logs() {
    local FEATURE="$1"
    local FOLLOW=""

    shift || true
    while [[ $# -gt 0 ]]; do
        case $1 in
            -f|--follow)
                FOLLOW="-f"
                shift
                ;;
            *)
                shift
                ;;
        esac
    done

    if [ -z "$FEATURE" ]; then
        echo -e "${RED}Error: Feature name required${NC}"
        usage
    fi

    FEATURE=$(echo "$FEATURE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g')
    LOG_FILE="$LOGS_DIR/${FEATURE}.log"

    if [ ! -f "$LOG_FILE" ]; then
        echo -e "${RED}No logs found for ${FEATURE}${NC}"
        exit 1
    fi

    if [ -n "$FOLLOW" ]; then
        echo -e "${BLUE}Following logs for ${FEATURE} (Ctrl+C to stop)${NC}"
        tail -f "$LOG_FILE"
    else
        cat "$LOG_FILE"
    fi
}

# Cleanup
cmd_cleanup() {
    local FEATURE="$1"

    if [ -n "$FEATURE" ]; then
        # Cleanup specific feature
        FEATURE=$(echo "$FEATURE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g')
        WORKTREE_PATH="$WORKTREES_DIR/$FEATURE"
        CONTAINER_NAME="ralph-${FEATURE}"
        BRANCH_NAME="ralph/${FEATURE}"

        echo -e "${BLUE}Cleaning up ${FEATURE}...${NC}"

        # Stop container if running
        if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
            docker stop "$CONTAINER_NAME"
            docker rm "$CONTAINER_NAME" 2>/dev/null || true
        fi

        # Remove worktree
        if [ -d "$WORKTREE_PATH" ]; then
            cd "$PROJECT_ROOT"
            git worktree remove "$WORKTREE_PATH" --force 2>/dev/null || rm -rf "$WORKTREE_PATH"
            echo "Removed worktree: $WORKTREE_PATH"
        fi

        echo -e "${GREEN}Cleanup complete for ${FEATURE}${NC}"
        echo -e "${YELLOW}Note: Branch ${BRANCH_NAME} preserved. Delete with: git branch -D ${BRANCH_NAME}${NC}"
    else
        # Cleanup orphaned worktrees
        echo -e "${BLUE}Cleaning up orphaned worktrees...${NC}"

        if [ -d "$WORKTREES_DIR" ]; then
            for WORKTREE in "$WORKTREES_DIR"/*/; do
                if [ -d "$WORKTREE" ]; then
                    FEATURE=$(basename "$WORKTREE")
                    CONTAINER_NAME="ralph-${FEATURE}"

                    # Check if orphaned (lock file exists but no container)
                    if [ -f "$WORKTREE/.ralph-lock" ]; then
                        if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
                            echo -e "${YELLOW}Cleaning orphaned: ${FEATURE}${NC}"
                            rm -f "$WORKTREE/.ralph-lock"
                        fi
                    fi
                fi
            done
        fi

        # Prune git worktrees
        cd "$PROJECT_ROOT"
        git worktree prune

        # Rotate old logs
        echo -e "${BLUE}Rotating logs older than 15 days...${NC}"
        find "$LOGS_DIR" -name "*.log" -mtime +15 -delete 2>/dev/null || true

        echo -e "${GREEN}Cleanup complete${NC}"
    fi
}

# Main
case "${1:-}" in
    start)
        shift
        cmd_start "$@"
        ;;
    stop)
        shift
        cmd_stop "$@"
        ;;
    status)
        cmd_status
        ;;
    logs)
        shift
        cmd_logs "$@"
        ;;
    cleanup)
        shift
        cmd_cleanup "$@"
        ;;
    build)
        cmd_build
        ;;
    *)
        usage
        ;;
esac
