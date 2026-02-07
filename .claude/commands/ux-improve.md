# /ux-improve - UX Improvement Orchestrator

Orchestrate the full UX improvement cycle: Analyze, Prioritize, Research, Propose, Implement. Transform UX issues into approved, implemented improvements.

## Usage

```bash
# Improve a feature area
/ux-improve clients
/ux-improve projects
/ux-improve dashboard

# With specific scope
/ux-improve clients --scope quick          # Top 3 issues, minimal research
/ux-improve clients --scope standard        # Top 5-7 issues (default)
/ux-improve clients --scope comprehensive   # All issues, deep research

# With focus area
/ux-improve clients --focus "forms"
/ux-improve projects --focus "loading"

# With autonomy level
/ux-improve clients --level supervised   # Pause after each phase
/ux-improve clients --level guided       # Auto-analyze, pause before proposal (default)
/ux-improve clients --level autonomous   # Full auto through proposal

# Skip phases (if analysis already done)
/ux-improve clients --skip-analysis      # Use cached analysis
/ux-improve clients --skip-research      # Use cached research
```

## Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `target` | Feature area or file path | Required |
| `--scope` | Depth: `quick`, `standard`, `comprehensive` | `standard` |
| `--focus` | Specific area to focus on | All areas |
| `--level` | Autonomy level | `guided` |
| `--skip-analysis` | Use cached analysis results | `false` |
| `--skip-research` | Use cached research results | `false` |
| `--implement` | Auto-implement approved XS/S fixes | `false` |

## The Five-Phase Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    /ux-improve [target]                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PHASE 1: ANALYZE                                                │
│  Duration: 2-5 min                                               │
│  Runs: UX Analyst + Design System Guardian                       │
│  Output: Categorized issues with severity                        │
│                                                                  │
│  PHASE 2: PRIORITIZE                                             │
│  Duration: 1-2 min                                               │
│  Process: Kano classification → RICE scoring                     │
│  Output: Ranked improvement queue                                │
│                                                                  │
│  PHASE 3: RESEARCH                                               │
│  Duration: 3-10 min                                              │
│  Runs: UX Pattern Scout + Gemini (if needed)                     │
│  Output: Best-practice solutions per issue                       │
│                                                                  │
│  PHASE 4: PROPOSE                                                │
│  Duration: 2-5 min                                               │
│  Output: RFC proposals with before/after                         │
│  *** APPROVAL GATE ***                                           │
│                                                                  │
│  PHASE 5: IMPLEMENT                                              │
│  Duration: varies by effort                                      │
│  Runs: Direct (XS/S) or Ralph (M/L/XL)                           │
│  Output: Commits + before/after score comparison                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Scope Options

| Scope | Issues | Research | Best For |
|-------|--------|----------|----------|
| `quick` | Top 3 | Minimal | Fast iteration |
| `standard` | Top 5-7 | Per issue | Regular cycles |
| `comprehensive` | All | Deep (incl. Gemini) | Major overhauls |

## Prioritization Framework

### Kano Classification

| Category | Definition | Priority |
|----------|------------|----------|
| **Must-Be** | Expected; absence causes dissatisfaction | Fix FIRST |
| **Performance** | More is better | Order by RICE |
| **Attractive** | Delighters | Batch for polish |

### RICE Scoring

```
Score = (Reach × Impact × Confidence) / Effort

Reach:      1-10 (% of users affected)
Impact:     0.25-3x (severity × frequency)
Confidence: 50-100% (evidence quality)
Effort:     XS=0.5, S=1, M=3, L=5, XL=10 days
```

## Output: Analysis Summary

```
═══════════════════════════════════════════════════════════════
UX IMPROVEMENT ANALYSIS: [Target]
═══════════════════════════════════════════════════════════════

CURRENT STATE
  UX Health Score: 67/100 (C - Needs Work)
  DS Compliance: 87%

IMPROVEMENT QUEUE
─────────────────────────────────────────────────────────────────

MUST-FIX (Kano: Must-Be)
  #1  Missing loading state          │ S  │ OBJECTIVE
  #2  Form validation not visible    │ S  │ OBJECTIVE
  #3  Missing error boundary         │ XS │ OBJECTIVE

HIGH-VALUE (Kano: Performance)
  #4  No empty state                 │ S  │ RICE: 84
  #5  8 fields without multi-step    │ M  │ RICE: 72

POLISH (Kano: Attractive)
  #6  Missing keyboard shortcuts     │ M  │ RICE: 45
  #7  No skeleton on load            │ S  │ RICE: 41

SELECTED: #1-#5 for this cycle

═══════════════════════════════════════════════════════════════
```

## Output: Improvement Proposal (RFC)

```
═══════════════════════════════════════════════════════════════
IMPROVEMENT RFC #1: Add Loading Skeletons
═══════════════════════════════════════════════════════════════

SUMMARY
  Add layout-matching skeleton loaders to data pages.

HYPOTHESIS
  We believe adding skeletons will reduce perceived load time
  by 60-80% for users visiting data-heavy pages.

CURRENT STATE
  ┌─────────────────────────────────┐
  │                                 │
  │       (blank screen)            │
  │    200-800ms of nothing         │
  │                                 │
  └─────────────────────────────────┘

PROPOSED STATE
  ┌─────────────────────────────────┐
  │ ▓▓▓▓▓▓▓▓▓  │ ▓▓▓▓▓  │ ▓▓▓▓   │
  │ ▓▓▓▓▓▓▓    │ ▓▓▓    │ ▓▓▓▓   │
  │ ▓▓▓▓▓▓▓▓   │ ▓▓▓▓   │ ▓▓     │
  └─────────────────────────────────┘

IMPACT
  HEART: Task Success
  Before: 3/12 pages (25%)
  After: 12/12 pages (100%)

EFFORT: S (0.5 day)

FILES TO MODIFY:
  CREATE: app/.../dashboard/clients/loading.tsx
  CREATE: app/.../dashboard/projects/loading.tsx
  CREATE: app/.../dashboard/tasks/loading.tsx

DECISION: [ ] Approve  [ ] Reject  [ ] Modify

═══════════════════════════════════════════════════════════════
```

## Output: Implementation Results

```
═══════════════════════════════════════════════════════════════
IMPROVEMENT RESULTS: [Date] [Target]
═══════════════════════════════════════════════════════════════

IMPLEMENTED: 5/5 approved improvements

SCORE COMPARISON
  │ Category           │ Before │ After  │ Delta    │
  │────────────────────│────────│────────│──────────│
  │ Overall UX Health  │ 67     │ 82     │ +15 ✅   │
  │ Loading States     │ 25%    │ 100%   │ +75% ✅  │
  │ Error Handling     │ 58%    │ 92%    │ +34% ✅  │
  │ Form Validation    │ 40%    │ 100%   │ +60% ✅  │

COMMITS:
  abc1234 fix: add loading skeleton to clients
  def5678 fix: add field-level validation
  ghi9012 fix: add error boundary
  jkl3456 feat: add empty state
  mno7890 feat: multi-step form

NEXT CYCLE:
  - 10 issues remain in queue
  - Suggested target: projects (68 score)
  - Potential: +10-12 points

═══════════════════════════════════════════════════════════════
```

## T-Shirt Sizing

| Size | Time | Example |
|------|------|---------|
| **XS** | < 2 hours | Add aria-label, fix color |
| **S** | 0.5-1 day | Add empty state, skeleton |
| **M** | 1-3 days | Multi-step form |
| **L** | 3-5 days | Navigation restructure |
| **XL** | 1-2 weeks | New interaction paradigm |

## Approval Options

After Phase 4 (Propose), you'll be asked:

```
DECISION REQUIRED:
  [1] Approve all improvements
  [2] Approve Must-Fix only
  [3] Select specific improvements
  [4] Request modifications
  [5] Save proposals for later
```

## Related Commands

| Command | Relationship |
|---------|-------------|
| `/ux-review` | Phase 1 uses this for analysis |
| `/ds-check` | Phase 1 uses this for compliance |
| `/scout` | Phase 3 uses this for patterns |
| `/research` | Phase 3 uses this for psychology |
| `/ralph` | Phase 5 uses this for M/L/XL |

## Output Locations

```
brand-identity/research/ux-improvements/
├── YYYY-MM-DD-[target]-analysis.json
├── YYYY-MM-DD-[target]-proposals.md
├── YYYY-MM-DD-[target]-approved.json
└── YYYY-MM-DD-[target]-results.md
```

## Tips

1. **Start with --scope quick** -- Get quick wins first
2. **Use --skip-analysis** -- If you just ran /ux-review
3. **Review Must-Be first** -- Fix fundamentals before polish
4. **Track score over time** -- Celebrate improvements

## Agent Reference

This command invokes the `ux-optimizer` agent. See `.claude/agents/ux-optimizer.md` for full methodology.
