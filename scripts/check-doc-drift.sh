#!/usr/bin/env bash
# Engineering doc drift guardrail — fails on retired paths/terms in living docs (markdown/mdc only).
# See docs/architecture/legacy-naming.md and docs/plans/README.md

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

collect_files() {
  find docs/architecture docs/guides docs/reference docs/decisions docs/troubleshooting brand-identity \
    -type f -name '*.md' ! -path 'docs/plans/*' 2>/dev/null || true
  find app -type f -name 'CLAUDE.md' 2>/dev/null || true
  find .cursor/rules -type f -name '*.mdc' 2>/dev/null || true
  find .cursor/skills .claude/skills .claude/commands .claude/agents \
    -type f -name '*.md' 2>/dev/null || true
  for f in AGENTS.md CLAUDE.md README.md .cursorrules; do
    [[ -f "$f" ]] && echo "$f"
  done
}

FILES=($(collect_files))

if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "⚠️ No files to scan"
  exit 0
fi

check_pattern() {
  local pattern="$1"
  local allowed="${2:-}"
  local matches

  if ! matches=$(grep -nE "$pattern" "${FILES[@]}" 2>/dev/null | grep -v 'legacy-naming.md' | grep -v 'docs/plans/' | head -30); then
    return 0
  fi

  if [[ -n "$allowed" ]]; then
    local filtered=""
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      if echo "$line" | grep -Eq "$allowed"; then
        continue
      fi
      filtered+="${line}"$'\n'
    done <<< "$matches"
    matches="$filtered"
    [[ -z "$matches" ]] && return 0
  fi

  echo "$matches"
  echo "❌ Doc drift: found pattern '$pattern' in living docs"
  return 1
}

FAILED=0

check_pattern 'app/\(hq\)/' '(Migrated|→|replaced)' || FAILED=1
check_pattern 'app/\(billing\)/' '(Migrated|merged|→|\|.*product)' || FAILED=1
check_pattern 'app/\(studio\)/' '(Migrated|→|\|.*settings)' || FAILED=1
check_pattern 'app/\(client_portal\)/' '(Deleted|retired|Removed)' || FAILED=1
check_pattern 'app/\(user_dashboard\)/' '(app/\(product\)/|Historical|superseded)' || FAILED=1
check_pattern '@/libs/' '' || FAILED=1
check_pattern '15\.1\.9' '' || FAILED=1
check_pattern 'table-command-center' '(Deleted|→|Migrated|removed|legacy)' || FAILED=1
check_pattern 'app/_features/projects/' '(Deleted|removed|legacy|example)' || FAILED=1
check_pattern 'app/_lib/dal/' '' || FAILED=1
check_pattern 'app/_lib/permissions/' '(Deleted|removed|still exists)' || FAILED=1
check_pattern 'Roundtables' '(retired|legacy|→|redirect|Renamed|was Roundtables|ex-Roundtables|Money on the Table)' || FAILED=1
check_pattern '\| `/capture`' '(→|redirect|Legacy|legacy)' || FAILED=1
check_pattern 'localhost:3000/capture[^?]' '(redirect|legacy|→|Plays)' || FAILED=1

if [[ "$FAILED" -eq 1 ]]; then
  echo ""
  echo "Fix living doc drift or document exceptions in docs/architecture/legacy-naming.md"
  echo "Historical plans: docs/plans/ (see docs/plans/README.md)"
  exit 1
fi

echo "✅ No Tier A engineering doc drift patterns found."
