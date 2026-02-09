# /ux-review - UX Analysis & Critique

Critique implemented UI work from a UX perspective. Identify issues, grade severity, and provide actionable recommendations.

## Usage

```bash
# Analyze a feature area
/ux-review clients
/ux-review projects
/ux-review dashboard

# Analyze specific files
/ux-review app/_features/clients/components/ClientForm.tsx
/ux-review app/(user_dashboard)/dashboard/projects/

# Analyze the current branch diff
/ux-review --diff

# With specific focus
/ux-review clients --focus "forms"
/ux-review projects --focus "loading states"
/ux-review dashboard --focus "accessibility"

# With autonomy level
/ux-review clients --level supervised   # Pause after each category
/ux-review clients --level guided       # Complete analysis, pause before report (default)
/ux-review clients --level autonomous   # Full analysis and report
```

## Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `target` | Feature, file path, or `--diff` for current changes | Required |
| `--focus` | Specific category to focus on | All categories |
| `--level` | Autonomy level | `guided` |
| `--output` | Output format: `terminal`, `markdown`, `json` | `terminal` |

## Focus Areas

| Focus | What It Checks |
|-------|----------------|
| `accessibility` | ARIA, labels, contrast, focus, keyboard |
| `loading` | Skeleton, Suspense, loading.tsx, pending states |
| `errors` | Error boundaries, error.tsx, validation, recovery |
| `forms` | Validation, field types, complexity, feedback |
| `navigation` | Depth, breadcrumbs, keyboard shortcuts |
| `consistency` | Component usage, patterns, spacing |
| `cognitive` | Field counts, option counts, hierarchy |

## Output

```
═══════════════════════════════════════════════════════════════
UX ANALYSIS REPORT: [Target]
═══════════════════════════════════════════════════════════════

EXECUTIVE SUMMARY
  UX Health Score: 72/100 (C - Needs Work)

  The clients feature has solid component usage but lacks proper
  loading states and error handling. Critical accessibility issues
  found in form inputs.

SCORE BREAKDOWN
  │ Category            │ Score  │ Issues │
  │─────────────────────│────────│────────│
  │ Accessibility       │ 68/100 │ 3 P0   │
  │ Interaction         │ 75/100 │ 2 P1   │
  │ Heuristics          │ 78/100 │ 1 P1   │
  │ Cognitive Load      │ 70/100 │ 2 P2   │
  │ Consistency         │ 85/100 │ 1 P2   │
  │ Performance UX      │ 65/100 │ 3 P1   │

═══════════════════════════════════════════════════════════════

CRITICAL ISSUES (Severity 4 - Must Fix)
─────────────────────────────────────────────────────────────────

[ACCESSIBILITY] Missing form labels
  File: app/_features/clients/components/ClientForm.tsx:45
  Evidence: <Input name="email" /> without Label
  Impact: Screen readers cannot identify input purpose
  Fix: Wrap with <Field label="Email"> or add <Label>

─────────────────────────────────────────────────────────────────

MAJOR ISSUES (Severity 3 - Should Fix)
[Issues listed with file, evidence, impact, fix]

─────────────────────────────────────────────────────────────────

MINOR ISSUES (Severity 2)
[Grouped by category]

─────────────────────────────────────────────────────────────────

COSMETIC NOTES (Severity 1 - Batch Fix)
[Quick wins]

─────────────────────────────────────────────────────────────────

WHAT'S WORKING WELL
  ✓ Consistent semantic color usage (94%)
  ✓ Keyboard shortcuts on primary actions
  ✓ Dark mode tokens throughout
  ✓ Empty states on 6/8 list views

═══════════════════════════════════════════════════════════════

RECOMMENDED NEXT STEPS
  1. [P0] Fix 3 accessibility issues (XS effort)
  2. [P1] Add loading states (S effort)
  3. [P1] Improve error recovery (S effort)

Estimated Remediation: S (0.5-1 day)

═══════════════════════════════════════════════════════════════
```

## Severity Levels

| Severity | Level | Impact | Action |
|----------|-------|--------|--------|
| **4** | Catastrophe | Prevents task completion | Must fix immediately |
| **3** | Major | Significant user frustration | Fix before release |
| **2** | Minor | Slows users down | Address in next cycle |
| **1** | Cosmetic | Aesthetic annoyance | Batch fix when able |

## Scoring

```
Overall Score = weighted average of:
  Accessibility:        25%
  Interaction Patterns: 20%
  Heuristics:          20%
  Cognitive Load:      15%
  Consistency:         10%
  Performance UX:      10%
```

| Score | Grade | Assessment |
|-------|-------|------------|
| 90-100 | A | Excellent |
| 80-89 | B | Good |
| 70-79 | C | Needs Work |
| 60-69 | D | Poor |
| 0-59 | F | Critical |

## Evidence Tags

| Tag | Meaning |
|-----|---------|
| `[OBJECTIVE]` | Measurable standard violation |
| `[HEURISTIC]` | Research-backed pattern issue |
| `[SUBJECTIVE]` | Requires human judgment |
| `[HYPOTHESIS]` | Inferred, needs validation |

## Related Commands

| Command | When to Use |
|---------|-------------|
| `/ds-check` | Design system compliance (tokens, components) |
| `/ux-improve` | Full improvement cycle (analyze + research + propose) |
| `/scout` | Research UX patterns before implementing |

## Tips

1. **Run on branches** -- Use `--diff` to review only changed files
2. **Focus when needed** -- Use `--focus` for targeted audits
3. **Combine with DS check** -- UX + design system = complete picture
4. **Feed into /ux-improve** -- Use results to trigger improvement cycle

## Agent Reference

This command invokes the `ux-analyst` agent. See `.claude/agents/ux-analyst.md` for full methodology and heuristics.
