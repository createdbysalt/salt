#!/usr/bin/env zsh
# Ralph Watchdog - Auto-restarts stuck containers
# Usage: ralph-watchdog.sh [--interval SECONDS] [--threshold SECONDS]

# Configuration
CHECK_INTERVAL="${CHECK_INTERVAL:-30}"   # How often to check (seconds)
IDLE_THRESHOLD="${IDLE_THRESHOLD:-90}"   # Restart after this many seconds at 0% CPU
PROJECT_ROOT="${HOME}/Documents/GitHub/salt-core-main/salt-core"

# Track idle time per container using files
IDLE_DIR="/tmp/ralph-watchdog-idle"
mkdir -p "$IDLE_DIR"

log() {
    echo "[$(date '+%H:%M:%S')] $1"
}

get_idle_count() {
    local container="$1"
    local file="$IDLE_DIR/$container"
    if [[ -f "$file" ]]; then
        cat "$file"
    else
        echo "0"
    fi
}

set_idle_count() {
    local container="$1"
    local count="$2"
    echo "$count" > "$IDLE_DIR/$container"
}

restart_container() {
    local container="$1"
    log "🔄 Restarting stuck container: $container"
    docker restart "$container" >/dev/null 2>&1
    set_idle_count "$container" 0
}

get_progress() {
    local worktree="$1"
    local prd_file="${PROJECT_ROOT}/ralph-worktrees/$worktree/.claude/ralph/prd.json"

    if [[ -f "$prd_file" ]]; then
        local total=$(jq '.userStories | length' "$prd_file" 2>/dev/null || echo "0")
        local passed=$(jq '[.userStories[] | select(.passes == true)] | length' "$prd_file" 2>/dev/null || echo "0")
        echo "$passed/$total"
    else
        echo "N/A"
    fi
}

cleanup() {
    log "🛑 Watchdog stopped"
    rm -rf "$IDLE_DIR"
    exit 0
}

trap cleanup INT TERM

main() {
    log "🐕 Ralph Watchdog started"
    log "   Check interval: ${CHECK_INTERVAL}s"
    log "   Idle threshold: ${IDLE_THRESHOLD}s"
    log "   Press Ctrl+C to stop"
    echo ""

    while true; do
        # Get all running ralph containers into an array
        local containers=("${(@f)$(docker ps --filter "name=ralph-" --format "{{.Names}}" 2>/dev/null)}")

        if [[ ${#containers[@]} -eq 0 ]] || [[ -z "${containers[1]}" ]]; then
            log "No ralph containers running. Waiting..."
        else
            echo ""
            log "📊 Stream Status:"

            for container in $containers; do
                if [[ -n "$container" ]]; then
                    local worktree="${container#ralph-}"

                    # Get CPU percentage
                    local cpu=$(docker stats --no-stream --format "{{.CPUPerc}}" "$container" 2>/dev/null | tr -d '%')
                    local cpu_display="${cpu}%"

                    # Convert to integer for comparison
                    local cpu_int=${cpu%.*}
                    cpu_int=${cpu_int:-0}

                    # Get progress
                    local progress=$(get_progress "$worktree")

                    # Check if idle
                    if [[ $cpu_int -lt 1 ]]; then
                        local current_count=$(get_idle_count "$container")
                        local new_count=$((current_count + CHECK_INTERVAL))
                        set_idle_count "$container" "$new_count"

                        if [[ $new_count -ge $IDLE_THRESHOLD ]]; then
                            restart_container "$container"
                            echo "   🔄 $worktree: $progress [RESTARTED - was idle ${new_count}s]"
                        else
                            echo "   ⏸️  $worktree: $progress [CPU: $cpu_display] (idle: ${new_count}s)"
                        fi
                    else
                        set_idle_count "$container" 0
                        echo "   ▶️  $worktree: $progress [CPU: $cpu_display]"
                    fi
                fi
            done
        fi

        sleep "$CHECK_INTERVAL"
    done
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --interval)
            CHECK_INTERVAL="$2"
            shift 2
            ;;
        --threshold)
            IDLE_THRESHOLD="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

main
