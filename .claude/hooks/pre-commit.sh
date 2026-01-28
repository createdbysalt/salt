#!/bin/bash
# Ralph Pre-commit Hook
# Validates quality gates before allowing commits

set -e

# Find project root (where .claude is)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$CLAUDE_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

echo "Running pre-commit checks..."

# Check 1: Validate prd.json format (if it exists and is being committed)
if [ -f ".claude/ralph/prd.json" ]; then
  if ! jq -e '.branchName and .userStories' .claude/ralph/prd.json > /dev/null 2>&1; then
    echo -e "${RED}ERROR: .claude/ralph/prd.json is malformed${NC}"
    echo "  Missing required fields: branchName, userStories"
    ERRORS=$((ERRORS + 1))
  else
    echo -e "${GREEN}prd.json format valid${NC}"
  fi
fi

# Check 2: TypeScript check (if package.json has typecheck script)
if [ -f "package.json" ]; then
  if jq -e '.scripts.typecheck' package.json > /dev/null 2>&1; then
    echo "Running typecheck..."
    if pnpm typecheck > /dev/null 2>&1; then
      echo -e "${GREEN}Typecheck passed${NC}"
    else
      echo -e "${RED}ERROR: Typecheck failed${NC}"
      ERRORS=$((ERRORS + 1))
    fi
  elif jq -e '.scripts["type-check"]' package.json > /dev/null 2>&1; then
    echo "Running type-check..."
    if pnpm type-check > /dev/null 2>&1; then
      echo -e "${GREEN}Type-check passed${NC}"
    else
      echo -e "${RED}ERROR: Type-check failed${NC}"
      ERRORS=$((ERRORS + 1))
    fi
  fi
fi

# Check 3: Lint (if package.json has lint script)
if [ -f "package.json" ]; then
  if jq -e '.scripts.lint' package.json > /dev/null 2>&1; then
    echo "Running lint..."
    if pnpm lint > /dev/null 2>&1; then
      echo -e "${GREEN}Lint passed${NC}"
    else
      echo -e "${YELLOW}WARNING: Lint failed (non-blocking)${NC}"
      # Lint failures are warnings, not errors
    fi
  fi
fi

# Check 4: Tests (if package.json has test script and not skipped)
if [ -f "package.json" ] && [ -z "$SKIP_TESTS" ]; then
  if jq -e '.scripts.test' package.json > /dev/null 2>&1; then
    echo "Running tests..."
    if pnpm test > /dev/null 2>&1; then
      echo -e "${GREEN}Tests passed${NC}"
    else
      echo -e "${RED}ERROR: Tests failed${NC}"
      ERRORS=$((ERRORS + 1))
    fi
  fi
fi

# Summary
echo ""
if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}Pre-commit checks failed with $ERRORS error(s)${NC}"
  echo '{"decision": "block", "reason": "Pre-commit checks failed. Fix errors before committing."}'
  exit 1
else
  echo -e "${GREEN}All pre-commit checks passed${NC}"
  exit 0
fi
