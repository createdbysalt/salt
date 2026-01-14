#!/bin/bash
# =============================================================================
# FORMAT-ON-SAVE HOOK
# =============================================================================
# Type: PostToolUse
# Purpose: Automatically formats files after any edit operation
# Trigger: Runs after Write, Edit, or MultiEdit tools complete
#
# This is the "Auto-Corrector" - ensures consistent code style without
# wasting agent tokens on formatting concerns. The agent writes logic,
# this hook handles aesthetics.
# =============================================================================

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
# Timeout for formatting operations (in seconds)
FORMAT_TIMEOUT=30

# Enable/disable specific formatters (set to "true" or "false")
USE_PRETTIER="true"
USE_ESLINT="true"
USE_BIOME="false"      # Alternative to Prettier+ESLint

# File extensions to format
# Add or remove as needed for your project
FORMATTABLE_EXTENSIONS=(
    "ts" "tsx" "js" "jsx" "mjs" "cjs"  # JavaScript/TypeScript
    "json" "jsonc"                       # JSON
    "md" "mdx"                           # Markdown
    "css" "scss" "less"                  # Styles
    "html" "vue" "svelte"                # Templates
    "yaml" "yml"                         # Config
    "graphql" "gql"                      # GraphQL
)

# -----------------------------------------------------------------------------
# Environment Variables (provided by Claude Code)
# -----------------------------------------------------------------------------
# CLAUDE_TOOL_NAME: The tool that just executed
# CLAUDE_TOOL_INPUT_FILE_PATH: Path to the file that was modified
# CLAUDE_TOOL_OUTPUT: Output from the tool
# -----------------------------------------------------------------------------

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------
log_info() {
    echo "[format-on-save] $1"
}

log_success() {
    echo "[format-on-save] ✓ $1"
}

log_error() {
    echo "[format-on-save] ✗ $1" >&2
}

get_file_extension() {
    local filepath="$1"
    echo "${filepath##*.}"
}

is_formattable() {
    local extension="$1"
    for ext in "${FORMATTABLE_EXTENSIONS[@]}"; do
        if [[ "$extension" == "$ext" ]]; then
            return 0  # true
        fi
    done
    return 1  # false
}

command_exists() {
    command -v "$1" &> /dev/null
}

# -----------------------------------------------------------------------------
# Formatters
# -----------------------------------------------------------------------------
run_prettier() {
    local filepath="$1"
    
    if [[ "$USE_PRETTIER" != "true" ]]; then
        return 0
    fi
    
    # Check for Prettier (npx will work if it's a project dependency)
    if command_exists npx; then
        # Try project-local Prettier first, fall back to global
        if timeout "$FORMAT_TIMEOUT" npx prettier --write "$filepath" 2>/dev/null; then
            log_success "Prettier formatted: $(basename "$filepath")"
            return 0
        fi
    fi
    
    # Try global Prettier
    if command_exists prettier; then
        if timeout "$FORMAT_TIMEOUT" prettier --write "$filepath" 2>/dev/null; then
            log_success "Prettier (global) formatted: $(basename "$filepath")"
            return 0
        fi
    fi
    
    return 1
}

run_eslint_fix() {
    local filepath="$1"
    local extension
    extension=$(get_file_extension "$filepath")
    
    if [[ "$USE_ESLINT" != "true" ]]; then
        return 0
    fi
    
    # Only run ESLint on JS/TS files
    case "$extension" in
        ts|tsx|js|jsx|mjs|cjs)
            ;;
        *)
            return 0  # Skip non-JS/TS files
            ;;
    esac
    
    # Check for ESLint
    if command_exists npx; then
        if timeout "$FORMAT_TIMEOUT" npx eslint --fix "$filepath" 2>/dev/null; then
            log_success "ESLint fixed: $(basename "$filepath")"
            return 0
        fi
    fi
    
    # Try global ESLint
    if command_exists eslint; then
        if timeout "$FORMAT_TIMEOUT" eslint --fix "$filepath" 2>/dev/null; then
            log_success "ESLint (global) fixed: $(basename "$filepath")"
            return 0
        fi
    fi
    
    return 1
}

run_biome() {
    local filepath="$1"
    
    if [[ "$USE_BIOME" != "true" ]]; then
        return 0
    fi
    
    # Check for Biome
    if command_exists npx; then
        if timeout "$FORMAT_TIMEOUT" npx @biomejs/biome format --write "$filepath" 2>/dev/null; then
            log_success "Biome formatted: $(basename "$filepath")"
            return 0
        fi
    fi
    
    if command_exists biome; then
        if timeout "$FORMAT_TIMEOUT" biome format --write "$filepath" 2>/dev/null; then
            log_success "Biome (global) formatted: $(basename "$filepath")"
            return 0
        fi
    fi
    
    return 1
}

# -----------------------------------------------------------------------------
# Main Logic
# -----------------------------------------------------------------------------
main() {
    local tool_name="${CLAUDE_TOOL_NAME:-}"
    local filepath="${CLAUDE_TOOL_INPUT_FILE_PATH:-}"
    
    # Only run after file modification tools
    case "$tool_name" in
        Write|Edit|MultiEdit)
            ;;
        *)
            exit 0  # Not a file modification, skip
            ;;
    esac
    
    # Validate filepath exists
    if [[ -z "$filepath" ]]; then
        log_error "No file path provided"
        exit 0  # Don't fail the hook, just skip
    fi
    
    if [[ ! -f "$filepath" ]]; then
        log_error "File does not exist: $filepath"
        exit 0  # Don't fail the hook, just skip
    fi
    
    # Check if this file type should be formatted
    local extension
    extension=$(get_file_extension "$filepath")
    
    if ! is_formattable "$extension"; then
        exit 0  # Not a formattable file type, skip silently
    fi
    
    log_info "Formatting: $filepath"
    
    # Run formatters in order of preference
    # Biome is an all-in-one alternative to Prettier+ESLint
    if [[ "$USE_BIOME" == "true" ]]; then
        run_biome "$filepath"
    else
        # Run Prettier first (formatting), then ESLint (linting + some formatting)
        run_prettier "$filepath"
        run_eslint_fix "$filepath"
    fi
    
    # Always exit 0 - formatting failures shouldn't block the agent
    # The code still works, it's just not pretty
    exit 0
}

# Run main function
main "$@"