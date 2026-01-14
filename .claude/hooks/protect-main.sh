#!/bin/bash
# =============================================================================
# PROTECT-MAIN HOOK
# =============================================================================
# Type: PreToolUse
# Purpose: Prevents accidental modifications to protected branches (main/master)
# Trigger: Runs before any tool that could modify files
#
# This is the "Safety Rail" - the single most important hook for preventing
# the most common catastrophic error: committing directly to production.
# =============================================================================

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
# Add or remove branch names as needed for your workflow
PROTECTED_BRANCHES=("main" "master" "production" "release")

# Tools that modify the filesystem or git state
# These are the tools we want to block on protected branches
WRITE_TOOLS=("Write" "Edit" "MultiEdit" "Bash")

# -----------------------------------------------------------------------------
# Environment Variables (provided by Claude Code)
# -----------------------------------------------------------------------------
# CLAUDE_TOOL_NAME: The tool about to be executed
# CLAUDE_TOOL_INPUT: JSON input to the tool (for Bash, contains the command)
# -----------------------------------------------------------------------------

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------
get_current_branch() {
    git branch --show-current 2>/dev/null
}

is_protected_branch() {
    local current_branch="$1"
    for protected in "${PROTECTED_BRANCHES[@]}"; do
        if [[ "$current_branch" == "$protected" ]]; then
            return 0  # true
        fi
    done
    return 1  # false
}

is_write_tool() {
    local tool_name="$1"
    for write_tool in "${WRITE_TOOLS[@]}"; do
        if [[ "$tool_name" == "$write_tool" ]]; then
            return 0  # true
        fi
    done
    return 1  # false
}

is_destructive_git_command() {
    local tool_input="$1"
    # Check if this is a Bash tool running a destructive git command
    # Allow branch creation (checkout -b) but block destructive operations
    if [[ "$tool_input" =~ git[[:space:]]+(commit|push|merge|rebase|reset) ]]; then
        return 0  # true - this is destructive
    fi
    return 1  # false - this is safe
}

# -----------------------------------------------------------------------------
# Main Logic
# -----------------------------------------------------------------------------
main() {
    # Get current branch
    local current_branch
    current_branch=$(get_current_branch)
    
    # If not in a git repo, allow the operation
    if [[ -z "$current_branch" ]]; then
        exit 0
    fi
    
    # Check if we're on a protected branch
    if ! is_protected_branch "$current_branch"; then
        exit 0  # Not protected, allow operation
    fi
    
    # We're on a protected branch - check if this is a write operation
    local tool_name="${CLAUDE_TOOL_NAME:-}"
    local tool_input="${CLAUDE_TOOL_INPUT:-}"
    
    # Block direct write tools
    if is_write_tool "$tool_name"; then
        # Special case: Allow read-only Bash commands
        if [[ "$tool_name" == "Bash" ]]; then
            # Check if it's a destructive command
            if is_destructive_git_command "$tool_input"; then
                echo "═══════════════════════════════════════════════════════════════════"
                echo "🛑 BLOCKED: Destructive git operation on protected branch"
                echo "═══════════════════════════════════════════════════════════════════"
                echo ""
                echo "  Current branch: $current_branch"
                echo "  Attempted command: git commit/push/merge/rebase/reset"
                echo ""
                echo "  ACTION REQUIRED:"
                echo "  1. This operation is blocked on protected branch $current_branch"
                echo "  2. Branch creation is allowed, but commits/pushes are not"
                echo "  3. Use feature branches for all development work"
                echo ""
                echo "═══════════════════════════════════════════════════════════════════"
                exit 1
            fi
            # Allow non-destructive Bash commands (ls, cat, grep, etc.)
            exit 0
        fi
        
        # Block Write/Edit/MultiEdit tools
        echo "═══════════════════════════════════════════════════════════════════"
        echo "🛑 BLOCKED: File modification on protected branch"
        echo "═══════════════════════════════════════════════════════════════════"
        echo ""
        echo "  Current branch: $current_branch"
        echo "  Attempted tool: $tool_name"
        echo ""
        echo "  Protected branches: ${PROTECTED_BRANCHES[*]}"
        echo ""
        echo "  ACTION REQUIRED:"
        echo "  1. Create a feature branch first:"
        echo "     git checkout -b feature/your-feature-name"
        echo ""
        echo "  2. Then retry your operation on the new branch."
        echo ""
        echo "  WHY THIS PROTECTION EXISTS:"
        echo "  Direct commits to $current_branch bypass code review and CI/CD"
        echo "  checks, risking production stability."
        echo ""
        echo "═══════════════════════════════════════════════════════════════════"
        exit 1
    fi
    
    # Not a write tool, allow the operation
    exit 0
}

# Run main function
main "$@"