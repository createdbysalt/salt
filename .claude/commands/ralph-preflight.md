---
name: ralph-preflight
description: "Pre-flight check before running Ralph. Validates PRD, git state, and project setup."
---

# Ralph Pre-flight Check

Run this before `/ralph` to ensure everything is ready.

## Checks to Perform

### 1. PRD File Exists

```bash
if [ -f .claude/ralph/prd.json ]; then
  echo "PRD found"
  jq '{project: .project, branch: .branchName, stories: (.userStories | length), incomplete: ([.userStories[] | select(.passes == false)] | length)}' .claude/ralph/prd.json
else
  echo "ERROR: PRD not found at .claude/ralph/prd.json"
  echo "Run /prd-json to create one first"
fi
```

### 2. PRD Format Valid

```bash
if [ -f .claude/ralph/prd.json ]; then
  if jq -e '.branchName and .userStories' .claude/ralph/prd.json > /dev/null 2>&1; then
    echo "PRD format valid"
  else
    echo "ERROR: PRD missing required fields (branchName, userStories)"
  fi
fi
```

### 3. Git Status

```bash
echo "Git status:"
git status --short
echo ""
echo "Current branch: $(git branch --show-current)"
```

### 4. Branch Alignment

```bash
if [ -f .claude/ralph/prd.json ]; then
  PRD_BRANCH=$(jq -r '.branchName' .claude/ralph/prd.json)
  CURRENT_BRANCH=$(git branch --show-current)

  if [ "$PRD_BRANCH" = "$CURRENT_BRANCH" ]; then
    echo "Branch aligned: $CURRENT_BRANCH"
  else
    echo "WARNING: Branch mismatch"
    echo "  PRD expects: $PRD_BRANCH"
    echo "  Current: $CURRENT_BRANCH"
    echo "  Ralph will checkout/create the correct branch"
  fi
fi
```

### 5. Quality Commands Available

Check that common quality tools are available:

```bash
echo "Checking quality tools..."

# TypeScript
if command -v pnpm &> /dev/null && [ -f package.json ]; then
  if jq -e '.scripts.typecheck or .scripts["type-check"]' package.json > /dev/null 2>&1; then
    echo "  typecheck: available"
  else
    echo "  typecheck: not configured in package.json"
  fi
fi

# Lint
if command -v pnpm &> /dev/null && [ -f package.json ]; then
  if jq -e '.scripts.lint' package.json > /dev/null 2>&1; then
    echo "  lint: available"
  else
    echo "  lint: not configured in package.json"
  fi
fi

# Test
if command -v pnpm &> /dev/null && [ -f package.json ]; then
  if jq -e '.scripts.test' package.json > /dev/null 2>&1; then
    echo "  test: available"
  else
    echo "  test: not configured in package.json"
  fi
fi
```

### 6. Progress File

```bash
if [ -f .claude/ralph/progress.txt ]; then
  echo "Progress file exists"
  echo "  Lines: $(wc -l < .claude/ralph/progress.txt)"
else
  echo "Progress file will be created on first run"
fi
```

## Summary

After running all checks, provide a summary:
- Ready to run `/ralph`
- OR list issues that need to be resolved first

## Quick Fix Commands

If issues found:

```bash
# Create PRD from existing markdown
/prd-json tasks/prd-*.md

# Checkout correct branch
git checkout -b ralph/feature-name

# Initialize progress file
echo "# Ralph Progress Log" > .claude/ralph/progress.txt
echo "Started: $(date)" >> .claude/ralph/progress.txt
echo "---" >> .claude/ralph/progress.txt
```
