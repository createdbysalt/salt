#!/bin/bash
# block-heredoc-writes.sh
# PreToolUse hook for Bash commands.
# Blocks heredoc file-writing patterns (cat << EOF, tee <<, etc.) that bloat
# settings.local.json when "always allow" persists the entire command verbatim.
#
# The correct approach is to use the Write tool for file creation.

# Read the tool input from stdin (JSON with tool_name and tool_input)
INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

# Only check Bash commands
if [[ "$TOOL_NAME" != "Bash" ]]; then
  exit 0
fi

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Check for heredoc patterns that write files
# Matches: cat << EOF, cat <<'EOF', cat <<"EOF", tee << EOF, etc.
if echo "$COMMAND" | grep -qE '<<\s*'\''?\"?[A-Z_]+'\''?\"?' 2>/dev/null; then
  # Allow small heredocs (git commit messages, etc.) — only block large ones
  COMMAND_LENGTH=${#COMMAND}
  if [[ $COMMAND_LENGTH -gt 500 ]]; then
    echo "BLOCKED: Bash heredoc detected (${COMMAND_LENGTH} chars)." >&2
    echo "" >&2
    echo "Use the Write tool instead of Bash heredocs to create files." >&2
    echo "Bash heredocs get saved verbatim in settings.local.json when" >&2
    echo "permissions are persisted, bloating the file and breaking pattern parsing." >&2
    echo "" >&2
    echo "Instead of:  cat << 'EOF' > file.md" >&2
    echo "Use:         Write tool with file_path and content" >&2
    exit 2
  fi
fi

exit 0
