---
name: research
description: "Pre-build research intelligence. Investigates features, UX patterns, and user psychology before development using Gemini Deep Research."
---

# /research - Pre-Build Research Intelligence

Run deep research on a feature, UX pattern, or product decision BEFORE building. Uses Perplexity for current cited facts, then Gemini for synthesis with codebase context.

## Purpose

Get into users' heads, understand the market, and validate ideas before writing code. This command decides what needs live cited lookup through Perplexity, then uses Gemini and codebase context to produce actionable intelligence.

## When to Use

- Planning a new feature and need to understand user needs
- Evaluating "should we build this?"
- Researching competitive landscape before implementation
- Validating demand signals for a feature idea
- Understanding UX best practices for a problem space
- Before `/prd` to ground requirements in research
- As Ralph's "phase 0" before autonomous execution

## Usage

```bash
# Basic research (standard depth, all dimensions, guided autonomy)
/research "Should we add AI-powered invoice generation?"

# Quick research for lower-stakes decisions
/research "Calendar integration UX patterns" --depth quick

# Deep research for major features
/research "Client portal messaging architecture" --depth deep

# Specific dimensions only
/research "Task dependency visualization" --dimensions user-psychology,ux-patterns

# Control autonomy level
/research "Freelancer invoicing pain points" --level supervised

# Feed results into another command
/research "Client communication needs" --feed-to icp

# Research as Ralph phase 0
/research "Add recurring tasks feature" --ralph
```

## Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `query` | The research question (required) | - |
| `--depth` | Research depth: `quick`, `standard`, `deep` | `standard` |
| `--dimensions` | Comma-separated: `user-psychology`, `competitive`, `technical`, `validation`, `ux-patterns`, or `all` | `all` |
| `--level` | Autonomy: `supervised`, `guided`, `advisory`, `autonomous` | `guided` |
| `--feed-to` | Feed results to another command: `discover`, `icp`, `strategy`, `prd` | - |
| `--ralph` | Flag to prepare research for Ralph autonomous execution | `false` |
| `--output` | Output format: `markdown`, `json`, `both` | `markdown` |

## Prerequisites

### Required
- `GEMINI_API_KEY` environment variable set

### Recommended
- Understanding of what decision the research informs
- Clarity on which dimensions matter most

### Setup (First Time)

```bash
# Add Gemini API key to environment
export GEMINI_API_KEY="your-api-key"

# Or add to .env.local
echo "GEMINI_API_KEY=your-api-key" >> .env.local

# Make script executable
chmod +x .claude/scripts/gemini-research.sh
```

## Workflow

### Standard Flow

```
1. Parse query and parameters
2. Analyze Salt-Core codebase for relevant context
3. Decide which facts need Perplexity vs Gemini
4. Run Perplexity for current, cited facts when needed
5. Call Gemini with codebase context and any Perplexity findings
6. Synthesize external + internal findings
7. Generate decision matrix
8. Produce a markdown brief by default
9. If --feed-to specified, pass to next command
```

### Perplexity vs Gemini Routing

Use Perplexity when the research needs:

- Current pricing, quotas, rate limits, changelogs, or API docs
- Live competitor/product claims, dated market facts, or recent news
- Source-backed citations the final brief should show directly

Use Gemini when the research needs:

- User psychology, product strategy, synthesis, tradeoffs, or pattern analysis
- Multi-dimensional reasoning across competitive, technical, validation, and UX inputs
- A final recommendation grounded in Salt's codebase and plans

If both are useful, run Perplexity first for narrow facts and citations, then pass those findings into Gemini as context. Do not ask Gemini to invent citations for current facts.

### With Ralph Integration

```
/research "Add task dependencies" --ralph --level autonomous

Flow:
1. Standard research flow
2. If confidence HIGH → auto-generate PRD
3. Convert PRD to prd.json
4. Ralph executes with research context
```

## Research Dimensions

| Dimension | What It Investigates |
|-----------|---------------------|
| `user-psychology` | Pain points, desires, mental models, emotional triggers |
| `competitive` | Market alternatives, competitor approaches, gaps |
| `technical` | Implementation patterns, feasibility, constraints |
| `validation` | Demand signals, willingness to pay, market trends |
| `ux-patterns` | Best practices, accessibility, interaction patterns |

## Autonomy Levels

| Level | Behavior | Use When |
|-------|----------|----------|
| `supervised` | Pause for approval at each dimension | New to research, high-stakes decisions |
| `guided` | Auto-research, pause before recommendations | Default for most research |
| `advisory` | Auto-research + recommendations, pause before action | Trusted patterns, moderate stakes |
| `autonomous` | Full auto, proceed to next step | Ralph integration, low stakes, high confidence |

## Output

### Research Brief (Markdown)
Human-readable summary with:
- Executive summary
- Key findings by dimension
- Decision matrix (should_build + reasoning)
- Recommended approach
- Next steps

### Research JSON
JSON is off by default. Only create it when the user explicitly requests `--output json` / `--output both`, or when a downstream automation requires machine-readable data.

### Decision Matrix

```
Should Build: YES | YES_WITH_CAVEATS | NEEDS_MORE_RESEARCH | NO | PIVOT
Confidence: HIGH | MEDIUM | LOW
Key Evidence: [Top findings that drove decision]
Key Risks: [What could go wrong]
Key Opportunities: [What could go right]
Recommended Approach: [How to proceed if building]
```

## Output Locations

```
brand-identity/research/
├── research-[feature-slug].md      # Research brief
├── research-[feature-slug].json    # Optional only with --output json/both

# PRD outputs go to .claude/ralph/ (separate from research)
.claude/ralph/
└── prd.json                        # If --ralph and autonomous
```

## Examples

### Example 1: Feature Validation

```bash
/research "Should we add real-time collaboration to Salt-Core?"
```

**Output:**
```
## Decision: YES_WITH_CAVEATS (Confidence: MEDIUM)

**Reasoning:**
- HIGH evidence of user demand (collaborative teams growing 40% YoY)
- Salt-Core already has Supabase Realtime infrastructure
- MEDIUM competitive pressure (Notion, Linear have it)
- LOW differentiation opportunity (table stakes, not differentiator)

**Recommended Approach:**
Start with presence indicators and cursor sharing.
Defer full collaborative editing until user demand validated.

**Key Risk:**
Complexity explosion. Real-time sync is notoriously hard.
Mitigation: Strict scope to presence-only in v1.
```

### Example 2: UX Pattern Research

```bash
/research "Best practices for task dependency visualization" --dimensions ux-patterns --depth quick
```

**Output:**
```
## UX Patterns: Task Dependencies

**Established Patterns:**
1. Gantt charts (traditional, good for timelines)
2. Dependency graphs (modern, good for relationships)
3. Inline dependency pills (lightweight, good for lists)

**Recommendation for Salt-Core:**
Inline pills for list view, expandable graph for detail view.
Matches existing UI patterns in projects feature.
```

### Example 3: Ralph Integration

```bash
/research "Add recurring task functionality" --ralph --level advisory
```

**Flow:**
1. Research completes with HIGH confidence YES
2. User reviews and approves
3. PRD auto-generated from research
4. PRD converted to prd.json
5. Ralph picks up and executes

## Integration with Other Commands

### Before /discover
```bash
/research "Who are our ideal customers for the portal feature?"
# Research provides customer hypotheses
/discover
# Discovery validates with actual client data
```

### Before /icp
```bash
/research "Freelancer pain points around client communication" --feed-to icp
# Research provides raw psychology data
# ICP agent structures it into profiles
```

### Before /prd
```bash
/research "Task commenting and mentions feature" --feed-to prd
# Research grounds PRD in validated user needs
```

### With /ralph
```bash
/research "Add email notification preferences" --ralph
# Research → PRD → prd.json → Ralph executes
```

## Quality Standards

### Research is ready when:
- [ ] All requested dimensions have findings or documented gaps
- [ ] Confidence levels assigned to all insights
- [ ] Sources cited for all external findings
- [ ] Codebase context incorporated
- [ ] Decision matrix completed with clear reasoning
- [ ] Next steps provided for all paths

### Red flags to address:
- All findings are HYPOTHESIS (need more sources)
- No codebase context (disconnect from reality)
- Contradictions not addressed (incomplete synthesis)
- "Should build" without clear evidence chain

## Troubleshooting

### "GEMINI_API_KEY not set"
```bash
export GEMINI_API_KEY="your-key"
# Or add to .env.local
```

### "Research took too long"
- Use `--depth quick` for faster results
- Limit dimensions with `--dimensions`
- Check network connectivity

### "Findings feel generic"
- Add more context in the query
- Specify the Salt-Core context explicitly
- Use `--depth deep` for more specific findings

### "Can't decide should_build"
- This is valid! Use `NEEDS_MORE_RESEARCH`
- Document what specific information would help
- Plan how to gather that information

## See Also

- `gemini-researcher` agent (core implementation)
- `deep-research` skill (methodology framework)
- `/prd` command (requirements generation)
- `/ralph` command (autonomous execution)
- `/discover` command (client discovery)
- `/icp` command (customer profiling)
