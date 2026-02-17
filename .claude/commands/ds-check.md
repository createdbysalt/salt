# /ds-check - Design System Compliance Check

Enforce design system compliance across Salt Core. Detect token violations, incorrect component usage, and anti-patterns.

## Usage

```bash
# Check a feature area
/ds-check clients
/ds-check projects
/ds-check dashboard

# Check specific files
/ds-check app/_features/clients/components/
/ds-check app/(user_dashboard)/dashboard/

# Check the current branch diff
/ds-check --diff

# Full codebase scan
/ds-check --full

# With specific focus
/ds-check clients --focus "colors"
/ds-check projects --focus "components"
/ds-check dashboard --focus "patterns"

# With auto-fix
/ds-check clients --fix          # Apply auto-fixable changes
/ds-check clients --fix --dry    # Show what would be fixed
```

## Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `target` | Feature, file path, `--diff`, or `--full` | Required |
| `--focus` | Specific category | All categories |
| `--fix` | Apply auto-fixes | `false` |
| `--dry` | Preview fixes without applying | `false` |
| `--output` | Format: `terminal`, `markdown`, `json` | `terminal` |

## Focus Areas

| Focus | What It Checks |
|-------|----------------|
| `colors` | Raw Tailwind colors, hardcoded hex, missing tokens |
| `components` | Native HTML, incorrect imports, missing @repo/ui |
| `patterns` | Header selection, form complexity, loading patterns |
| `spacing` | Arbitrary values, missing tokens |
| `architecture` | API routes vs Server Actions, useEffect fetching |
| `accessibility` | Missing aria-labels, focus management |
| `visual` | **NEW** Table column widths, icon sizes, typography, layout consistency |

### Visual Consistency (--focus visual)

Compares against `docs/guides/visual-design-reference.md`:
- Table column widths match reference (w-[280px], w-[160px], etc.)
- Icon sizes match context (h-3.5 table, h-4 inline, h-5 header)
- Avatar sizes match context (h-6 table, h-8 user, h-10 profile)
- Button sizes match context (default header, h-8 row, sm toolbar)
- Typography uses `text-sm` in tables, `text-muted-foreground` for secondary
- Empty values use `—` (em dash), not "N/A" or "None"
- Hover states use `hover:bg-muted/50` or `hover:bg-accent`
- Badges use `text-xs px-1.5 py-0` pattern

## Output

```
═══════════════════════════════════════════════════════════════
DESIGN SYSTEM COMPLIANCE: [Target]
═══════════════════════════════════════════════════════════════

COMPLIANCE SCORE: 87% (Good)

SCORE BREAKDOWN
  │ Category                │ Score  │ Violations │
  │─────────────────────────│────────│────────────│
  │ Token Compliance        │ 92%    │ 3 colors   │
  │ Component Compliance    │ 85%    │ 2 native   │
  │ Pattern Compliance      │ 90%    │ 1 dialog   │
  │ Accessibility           │ 88%    │ 2 labels   │
  │ Architecture            │ 80%    │ 1 API route│

═══════════════════════════════════════════════════════════════

VIOLATIONS (Must Fix)
─────────────────────────────────────────────────────────────────

RAW TAILWIND COLORS
  │ File              │ Line │ Current       │ Should Be     │
  │───────────────────│──────│───────────────│───────────────│
  │ ClientCard.tsx    │ 45   │ bg-blue-500   │ bg-primary    │
  │ Header.tsx        │ 23   │ text-gray-900 │ text-foreground│
  │ Badge.tsx         │ 12   │ bg-green-100  │ bg-success/10 │

NATIVE HTML ELEMENTS
  │ File              │ Line │ Element   │ Replacement       │
  │───────────────────│──────│───────────│───────────────────│
  │ LoginForm.tsx     │ 12   │ <button>  │ Button from @repo/ui │
  │ SearchBar.tsx     │ 8    │ <input>   │ Input from @repo/ui  │

─────────────────────────────────────────────────────────────────

WARNINGS (Review)
─────────────────────────────────────────────────────────────────

SPINNER FOR CONTENT LOADING
  File: ClientList.tsx:45
  Context: Full page loading state
  Recommendation: Use Skeleton with table row layout

COMPLEX DIALOG
  File: EditProjectDialog.tsx
  Issue: 12 form fields in Dialog
  Recommendation: Use Sheet or dedicated page

─────────────────────────────────────────────────────────────────

VERIFIED PATTERNS ✓
  ✓ PageHeader used correctly on 8/8 detail pages
  ✓ EmptyState on 6/8 list views
  ✓ Server Actions for all mutations
  ✓ Semantic colors on 92% of applications

═══════════════════════════════════════════════════════════════

AUTO-FIX AVAILABLE
  12 violations can be auto-fixed:

  Run: pnpm lint --fix
  Or:  /ds-check clients --fix

  │ Category        │ Fixable │ Manual │
  │─────────────────│─────────│────────│
  │ Raw colors      │ 3       │ 0      │
  │ cn() usage      │ 4       │ 0      │
  │ Native elements │ 0       │ 2      │
  │ Patterns        │ 0       │ 1      │

═══════════════════════════════════════════════════════════════
```

## Compliance Categories

### Token Compliance (30%)
- Semantic colors vs raw Tailwind
- Spacing tokens vs arbitrary values
- Typography tokens vs hardcoded
- Border radius tokens

### Component Compliance (30%)
- @repo/ui imports vs native HTML
- @repo/patterns vs custom recreations
- Correct component selection

### Pattern Compliance (20%)
- PageHeader vs PageGreetingHeader
- Dialog vs Sheet vs Page for forms
- Skeleton vs Spinner for loading
- Button hierarchy (single primary)

### Accessibility Compliance (10%)
- aria-labels on icon buttons
- Form labels on inputs
- Focus management in modals

### Architecture Compliance (10%)
- Server Actions vs API routes
- Server Components vs useEffect
- URL state vs local state

## Anti-Patterns Detected

| Rank | Anti-Pattern | Detection |
|------|--------------|-----------|
| 1 | Raw Tailwind colors | ✅ Detected |
| 2 | Native HTML elements | ✅ Detected |
| 3 | Custom headers | ✅ Detected |
| 4 | Spinner for content | ✅ Detected |
| 5 | Multiple primary CTAs | ✅ Detected |
| 6 | useEffect fetching | ✅ Detected |
| 7 | Dialog for complex forms | ✅ Detected |
| 8 | API routes for mutations | ✅ Detected |
| 9 | Inline styles | ✅ Detected |
| 10 | God components | ✅ Detected |

## Escape Hatches

```typescript
// Inline suppression
// ds-guardian-ignore: marketing uses branded colors
<div className="bg-[#570df8]">

// File exclusion (top of file)
// ds-guardian-exclude: email-template

// Component override
// @ds-override: native <a> for external link
<a href="https://..." target="_blank">
```

## Related Commands

| Command | When to Use |
|---------|-------------|
| `/ux-review` | UX quality (experience, not implementation) |
| `/ux-improve` | Full improvement cycle |
| `pnpm lint` | Run ESLint design system rules |

## CI Integration

```bash
# Pre-commit (staged files)
pnpm lint-staged

# PR check (full lint + score)
pnpm lint --format json > report.json

# Build gate (critical only)
pnpm lint --quiet
```

## Tips

1. **Run regularly** -- Catch drift before it spreads
2. **Use --fix** -- Auto-fix obvious violations
3. **Check PRs** -- Use `--diff` for changed files only
4. **Combine with UX review** -- Complete quality picture

## Agent Reference

This command invokes the `design-system-guardian` agent. See `.claude/agents/design-system-guardian.md` for full methodology.
