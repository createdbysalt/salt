# /ux-improve - UX Improvement Orchestrator

Orchestrate the full UX improvement cycle: **Explore (Browser), Analyze, Prioritize, Research, Propose, Implement**. Transform UX issues into approved, implemented improvements.

## CRITICAL: Browser-First Methodology

**This command MUST use Playwright MCP for browser testing as the FIRST step.** Code analysis alone misses:
- Navigation flow issues (can users find the feature?)
- Discovery problems (are features hidden behind "Coming Soon"?)
- State synchronization bugs (does the sidebar update correctly?)
- Interactive element issues (do buttons work? do forms submit?)
- Real user experience (what does the flow actually feel like?)

## Usage

```bash
# Improve a feature area (starts with browser exploration)
/ux-improve clients
/ux-improve projects
/ux-improve serve

# With specific scope
/ux-improve clients --scope quick          # Top 3 issues, minimal research
/ux-improve clients --scope standard        # Top 5-7 issues (default)
/ux-improve clients --scope comprehensive   # All issues, deep research
```

## The Six-Phase Pipeline

### PHASE 0: EXPLORE (BROWSER) ★ MANDATORY ★
- Duration: 5-15 min
- Tool: Playwright MCP
- Actions:
  1. Navigate to feature entry points
  2. Take screenshots at each major screen
  3. Test ALL buttons, links, and interactive elements
  4. Test navigation flow (can users FIND the feature?)
  5. Test state transitions and form submissions
  6. Document discovery issues (hidden features, dead ends)
- Output: Visual flow map + browser-discovered issues

### PHASE 1: ANALYZE
- Duration: 2-5 min
- Runs: UX Analyst + Design System Guardian
- Inputs: Browser issues + code analysis
- Output: Categorized issues with severity

### PHASE 2: PRIORITIZE
- Duration: 1-2 min
- Process: Kano classification → RICE scoring
- Output: Ranked improvement queue

### PHASE 3: RESEARCH
- Duration: 3-10 min
- Runs: UX Pattern Scout + Gemini (if needed)
- Output: Best-practice solutions per issue

### PHASE 4: PROPOSE
- Duration: 2-5 min
- Output: RFC proposals with before/after screenshots
- *** APPROVAL GATE ***

### PHASE 5: IMPLEMENT
- Duration: varies by effort
- Runs: Direct (XS/S) or Ralph (M/L/XL)
- Output: Commits + before/after screenshot comparison

## Phase 0: Browser Exploration Protocol

1. **Start Dev Server** (if not running): `pnpm dev`
2. **Navigate to Feature Entry Point**: Take screenshot
3. **Explore All Navigation Paths**: How do users GET here?
4. **Test Every Interactive Element**: Click every button
5. **Capture Flow Issues**: Discovery, Navigation, Dead Ends
6. **Document with Screenshots**: Save to ux-improvements/screenshots/

## Issue Categories (Browser + Code)

| Category | Source | Priority |
|----------|--------|----------|
| **Flow Issues** | Browser testing | Fix FIRST |
| **Discovery Issues** | Browser testing | Fix FIRST |
| **Must-Be (Code)** | Code analysis | Fix SECOND |
| **Performance** | Both | Order by RICE |

## Tips

1. **Never skip Phase 0** -- Browser issues are often the most impactful
2. **Take lots of screenshots** -- Visual evidence is invaluable
3. **Test as a user would** -- Start from the homepage, not the feature
4. **Document dead ends** -- Hidden features = lost users

