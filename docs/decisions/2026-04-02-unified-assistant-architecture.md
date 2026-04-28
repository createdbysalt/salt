# ADR: Unified Assistant Architecture (Not Multi-Agent)

**Date:** 2026-04-02
**Status:** Accepted
**Decision:** Build smart workflows with a unified assistant, NOT "agent per app"

---

## Context

We considered building SALT with specialized agents for each app (HQ, Clients, Work, Billing) that report to a central orchestrator - like departments with workers.

Research was conducted on:
- Multi-agent system architectures (CrewAI, LangGraph, OpenAI Swarm)
- Production AI implementations (Linear, Notion, Cursor, Superhuman)
- UX patterns that create "companion" feeling
- Engineering costs and failure rates

## Decision

**We will NOT build "agent per app."** Instead:

1. **Phase 1:** Smart workflows (prompt chains, routing, parallel processing)
2. **Phase 2:** Unified "Salt" assistant accessible from anywhere
3. **Phase 3:** Selective specialist agents only where needed

## Evidence

### Multi-Agent Systems Fail Often

| Metric | Finding | Source |
|--------|---------|--------|
| Failure rate | 41-87% in production | Industry research |
| Root cause | 79% trace to bad specs + coordination | LangChain case studies |
| Build time | 6-12 months | CrewAI documentation |
| Maintenance | $15,000-50,000+/month | Enterprise estimates |

### What Production Leaders Actually Do

| Product | Architecture | Key Insight |
|---------|-------------|-------------|
| **Linear** | Workflows + optional agents | Chose to be data layer, not build agents |
| **Notion** | Central orchestrator + sub-agents | Took 2+ years to rebuild before launching |
| **Cursor** | Single unified assistant | Started with autocomplete, evolved over 2 years |
| **Superhuman** | Invisible automation | AI writes drafts without prompting |

### The "Does Work For You" Feeling

Research shows the companion feeling comes from UX patterns, not agents:

1. **Proactive UX** - Anticipate needs before users ask
2. **Speed** - 50ms responses feel like control
3. **Invisible automation** - Auto-drafts, auto-labels, duplicate detection
4. **Explainable suggestions** - "Suggested because this client usually responds in 2 days"
5. **Autonomy slider** - Let users choose how much AI does

### Anthropic's Own Guidance

> "Start with simple prompts...add multi-step agentic systems only when simpler solutions fall short"

## Architecture

```
              +-------------------------------------+
              |      "Salt" - Unified Assistant    |
              |   (One chat interface everywhere)  |
              +------------------+-----------------+
                                 |
                    routes automatically based on context
                                 |
       +-------------------------+-------------------------+
       |                         |                         |
+------v------+         +--------v--------+        +-------v-------+
| HQ Context  |         | Clients Context |        | Work Context  |
| (invisible) |         |   (invisible)   |        |  (invisible)  |
|             |         |                 |        |               |
| - Briefings |         | - Health scores |        | - Task triage |
| - Inbox     |         | - Comm summary  |        | - Estimates   |
| - Priorities|         | - Next actions  |        | - Blockers    |
+-------------+         +-----------------+        +---------------+
```

### Three Layers

| Layer | What It Does | Implementation |
|-------|-------------|----------------|
| **Invisible** | Automation that just works | Scheduled jobs, triggers, pattern matching |
| **Unified Assistant** | One "Salt" to talk to | Context-aware chat, Cmd+K integration |
| **Custom Agents** (later) | Power user feature | User-created for specific workflows |

## Workflow Designs (Not Agents)

### Daily Briefing Workflow

```
Trigger: 6am daily (or on first app open)
         |
         v
+------------------+
| Data Gathering   |  (parallel)
| - Calendar today |
| - Overdue items  |
| - Unread messages|
| - At-risk clients|
| - Revenue metrics|
+------------------+
         |
         v
+------------------+
| Synthesis        |
| - Prioritize     |
| - Group related  |
| - Identify risks |
+------------------+
         |
         v
+------------------+
| Personalization  |
| - User patterns  |
| - Past responses |
| - Tone matching  |
+------------------+
         |
         v
+------------------+
| Output           |
| "Good morning!   |
| Here's what      |
| matters today"   |
+------------------+
```

### Smart Triage Workflow

```
Trigger: New message/request arrives
         |
         v
+------------------+
| Classification   |
| - Sender (client?|
|   lead? team?)   |
| - Content type   |
| - Urgency signals|
+------------------+
         |
         v
+------------------+
| Context Lookup   |
| - Client history |
| - Open projects  |
| - Recent threads |
+------------------+
         |
         v
+------------------+
| Routing Decision |
| - Auto-assign?   |
| - Needs human?   |
| - Suggest reply? |
+------------------+
         |
         v
+------------------+
| Action           |
| - Route to inbox |
| - Add context    |
| - Draft response |
+------------------+
```

### Proposal Generation Workflow

```
Trigger: User clicks "Generate Proposal"
         |
         v
+------------------+
| Gather Context   |
| - Selected svcs  |
| - Client history |
| - Past proposals |
+------------------+
         |
         v
+------------------+
| Compile Terms    |
| - Merge services |
| - Calculate total|
| - Build timeline |
+------------------+
         |
         v
+------------------+
| Generate Doc     |
| - Apply template |
| - Personalize    |
| - Format         |
+------------------+
         |
         v
+------------------+
| Human Review     |  <-- Always required
| - Edit           |
| - Approve        |
| - Send           |
+------------------+
```

## Anti-Patterns to Avoid

| Pattern | Why It Fails |
|---------|--------------|
| Agent per app | Coordination overhead exceeds value |
| HQ as orchestrator agent | Too broad, fails on ambiguity |
| Build agents first | 6-12 months before user value |
| Let agents decide everything | 41-87% failure rate |
| Invisible with no log | Users lose trust |

## Consequences

### Positive
- Faster time to value (weeks vs months)
- Lower failure rate
- Simpler debugging
- Better user trust
- Can evolve to agents later if needed

### Negative
- Less "wow factor" than full agent demo
- May need to add agents later for complex domains
- Requires careful workflow design

### Risks
- Workflows may not feel "intelligent" enough
- May need to revisit for truly unpredictable tasks

## Implementation Path

### Phase 1: Now - 3 months (Workflows)
- [ ] Daily briefing as prompt chain
- [ ] Smart inbox triage as pattern-based routing
- [ ] Proposal generator with validation gates
- [ ] Proactive nudges as scheduled jobs

### Phase 2: 3-6 months (Unified Assistant)
- [ ] Single "Salt" chat interface
- [ ] Context-aware (knows current page/client/project)
- [ ] Natural language queries ("How much did ACME pay last quarter?")
- [ ] Action execution with confirmation

### Phase 3: 6+ months (Selective Agents)
- [ ] Evaluate if any domain needs true agent
- [ ] Likely candidates: Research Agent, Analysis Agent
- [ ] Maximum 2-3 agents total
- [ ] Human checkpoints required

## References

- Anthropic: Building effective agents
- Linear AI architecture blog
- Notion 3.0 custom agents announcement
- Cursor vs Copilot analysis
- Microsoft Agent UX Design Principles
- Superhuman product philosophy
