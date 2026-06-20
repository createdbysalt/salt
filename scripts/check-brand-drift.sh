#!/usr/bin/env bash
# Brand drift guardrail — fails on retired terms in Tier A paths.
# See brand-identity/MAINTENANCE.md and docs/architecture/legacy-naming.md

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

EXCLUDES=(
  --exclude-dir=node_modules
  --exclude-dir=_archive
  --exclude-dir=archive
  --exclude-dir=_deprecated
  --exclude-dir=supabase
  --exclude=legacy-naming.md
)

PATTERNS=(
  "The Bridge"
  "The Table"
  "Studio OS"
  "business OS"
  "SEE → ACT"
  "Strategy Mode"
  "Studio Mode"
  "Serve Mode"
  "client management platform for creative agencies"
)

SCAN=(
  app
  .cursor
  .cursorrules
  docs/architecture
  docs/guides
  docs/reference
  AGENTS.md
  CLAUDE.md
  config.ts
)

FAILED=0

for pattern in "${PATTERNS[@]}"; do
  extra_excludes=()
  if [[ "$pattern" == "The Table" ]]; then
    extra_excludes=(
      --exclude=money-on-the-table-links.ts
      --exclude=site-settings-fallback.ts
      --exclude=money-on-the-table-math.ts
      --exclude=BlogMoneyOnTablePromo.tsx
    )
  fi
  if matches=$(grep -RIn "${EXCLUDES[@]}" ${extra_excludes[@]+"${extra_excludes[@]}"} "${SCAN[@]}" -e "$pattern" 2>/dev/null | head -20); then
    echo "$matches"
    echo "❌ Brand drift: found '$pattern'"
    FAILED=1
  fi
done

if [[ "$FAILED" -eq 1 ]]; then
  echo ""
  echo "Fix Tier A drift or document exceptions in docs/architecture/legacy-naming.md"
  exit 1
fi

echo "✅ No Tier A brand drift patterns found."
