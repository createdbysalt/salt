#!/bin/bash
# Guard against DaisyUI class reintroduction
# Run this script to ensure no DaisyUI patterns exist in the codebase

set -e

echo "🔍 Checking for DaisyUI patterns..."

ERRORS=0

# Exclude quarantine and node_modules
SEARCH_PATH="app components libs"

# Check for DaisyUI dependency (exclude the guard script name itself)
if grep "daisyui" package.json 2>/dev/null | grep -v "check:no-daisyui" | grep -q "daisyui"; then
  echo "❌ ERROR: Found 'daisyui' in package.json"
  ERRORS=$((ERRORS + 1))
fi

# Check for DaisyUI plugin in CSS
if grep -rn "@plugin.*daisyui" app/ 2>/dev/null; then
  echo "❌ ERROR: Found DaisyUI plugin in CSS files"
  ERRORS=$((ERRORS + 1))
fi

# Check for common DaisyUI classes (excluding safe patterns)
DAISYUI_PATTERNS=(
  "bg-base-[0-9]"
  "text-base-content"
  "btn btn-"
  "btn-primary"
  "btn-secondary"
  "btn-ghost"
  "btn-block"
  "card card-"
  "card-body"
  "card-title"
  "card-actions"
  "alert alert-"
  "badge badge-"
  "navbar"
  "className=\"divider\""
  "loading loading-"
  "className=\"stats"
)

for pattern in "${DAISYUI_PATTERNS[@]}"; do
  # Get all matches, then filter out legacy compatibility layer and shadcn patterns
  all_results=$(grep -rn "$pattern" $SEARCH_PATH 2>/dev/null || true)
  filtered_results=""

  while IFS= read -r line; do
    if [[ -n "$line" ]]; then
      # Skip quarantine and node_modules
      if echo "$line" | grep -q "_quarantine\|node_modules"; then
        continue
      fi

      # Skip app/globals.css lines in the legacy compatibility layer (lines 248-327)
      if echo "$line" | grep -q "app/globals.css"; then
        line_num=$(echo "$line" | cut -d: -f2)
        if [[ $line_num -ge 248 && $line_num -le 327 ]]; then
          continue
        fi
      fi

      # Skip shadcn/ui data-slot attributes
      if echo "$line" | grep -q "data-slot="; then
        continue
      fi

      filtered_results+="$line\n"
    fi
  done <<< "$all_results"

  if [[ -n "$filtered_results" && "$filtered_results" != "\n" ]]; then
    echo "❌ ERROR: Found DaisyUI pattern '$pattern' in codebase"
    echo -e "$filtered_results"
    ERRORS=$((ERRORS + 1))
  fi
done

if [ $ERRORS -eq 0 ]; then
  echo "✅ No DaisyUI patterns detected! Codebase is clean."
  exit 0
else
  echo ""
  echo "❌ Found $ERRORS DaisyUI pattern(s) in the codebase."
  echo "Please migrate these to shadcn UI components + Tailwind tokens."
  exit 1
fi

