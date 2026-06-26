# Context Scaling And Memory

A playbook must scale naturally as a workspace connects more tools and stores more memory. It should never depend on loading "everything" from every connected account or all of `/memory`.

The creator must make context selection explicit: what to retrieve, why it matters, how much to retrieve, and what to do when the workspace has too much or too little context.

## Scaling Principle

Every playbook needs a context budget:

- **Tool scope:** which connected tools are relevant, and which are ignored.
- **Memory scope:** which `/memory` surfaces are relevant: people, orgs, work, files, billing, conversations, meetings, teams, and me.
- **Operating surface scope:** whether the playbook is scoped to Spaces, Connections, or both. These are not `/memory`; they are collaboration/routing surfaces that can determine where a playbook runs, who sees it, and what relationship graph it should respect.
- **Time trigger:** whether clock time, elapsed time, deadlines, schedules, or quiet periods make the playbook run.
- **Time window:** how far back or forward to look when retrieving context.
- **Entity scope:** which person, organization, work item, file, invoice, conversation, meeting, team, or user/workspace profile anchors the retrieval.
- **Result budget:** maximum records per source and maximum facts passed into an `llm` step.
- **Ranking:** how records are sorted when there are too many.
- **Degradation:** what Salt does when context is missing, stale, duplicated, or ambiguous.

If a playbook cannot state these choices, it is not ready.

## `/memory` Retrieval Policy

`/memory` is Salt's durable workspace memory graph. A playbook should describe which memory should be surfaced and how it is filtered.

Use memory when the playbook needs durable business context:

- **people** - person facts, relationship history, roles, status, and corrections,
- **orgs** - organization context, domains, account state, and related people,
- **work** - projects, scopes, tasks, deliverables, and client work history,
- **files** - uploaded/reference files, docs, assets, proposals, contracts, and source material,
- **billing** - invoices, payments, retainers, MRR, billing status, and revenue context,
- **conversations** - email/chat/message threads and communication history,
- **meetings** - transcripts, recaps, attendees, and decisions,
- **teams** - internal collaborators, responsibilities, and ownership,
- **me** - the user's workspace profile, preferences, domains, voice, partner/vendor lists, and operating context.

Do not use memory as an unbounded context dump. Retrieve by anchored intent:

- "people memory for this resolved person,"
- "org memory for this email domain,"
- "work memory connected to this client,"
- "billing memory for this invoice/account,"
- "conversation memory for this thread,"
- "meeting memory for this transcript,"
- "file memory attached to this work item,"
- "team memory for the owner/collaborator,"
- "me memory for workspace domains, voice, partners, vendors, and preferences."

## Connected Tool Policy

More connected tools should improve evidence, not explode prompt size.

For each tool family, define:

- what signal it can produce,
- the smallest query that gets the signal,
- the time or count limit,
- whether it is required or optional,
- what happens if the user has not connected it.

Examples:

- Gmail can provide email count, signatures, thread direction, and domain evidence.
- Finance apps can provide payment evidence.
- Calendar can provide meeting evidence.
- Fireflies can provide transcript evidence.
- `/memory` can provide durable people, orgs, work, files, billing, conversations, meetings, teams, and me context.

If ten tools could provide the same signal, the playbook should name the canonical signal and let the engine/tool layer choose the best available source. The playbook should not duplicate the same decision rule ten times by app.

## Spaces And Connections

Spaces and Connections are context surfaces, but they are not `/memory`.

Use **Spaces** when the playbook needs collaboration or access context:

- which workspace, client space, project space, or shared area the playbook belongs to,
- who should see or approve the output,
- whether context should be scoped to a collaboration boundary,
- whether a playbook should run inside one space but not another.

Use **Connections** when the playbook needs relationship graph context:

- which people, orgs, accounts, collaborators, or external systems are connected,
- how entities relate to one another,
- whether a relationship exists before acting,
- which connected source can provide a signal.

In the UI, Spaces and Connections can naturally appear under:

- **When it runs** - if they scope the trigger. Example: "Runs when a new file appears in a client space" or "Runs when a connection becomes active."
- **What it uses** - if they provide context. Example: "Uses the client space, related connections, Gmail, and People memory."

Do not describe Spaces or Connections as memory. Describe them as operating surfaces or context boundaries.

## Time

Time can be a trigger, a filter, or both.

Use **time as a trigger** when the playbook should run because of:

- a schedule, such as daily, weekly, monthly, or business-day cadence,
- elapsed time, such as "7 days since last reply" or "3 days after meeting ended",
- a deadline, due date, renewal date, invoice due date, or project milestone,
- a quiet period, such as "no reply after 48 hours",
- a freshness threshold, such as "profile not updated in 30 days".

Use **time as context** when the playbook needs bounded retrieval:

- last 14 days of conversations,
- invoices due in the next 7 days,
- meetings from this week,
- files added since the last run,
- work items changed after the last approved update.

In the UI:

- **When it runs** should include time when time is part of the trigger. Example: "Runs 48 hours after no reply" or "Runs every Monday for invoices due this week."
- **What it uses** should include time only when it explains context scope. Example: "Uses the last 14 days of conversations."

Always state timezone/business-day assumptions when they matter. Avoid vague phrases like "recently" unless the playbook defines the window.

## Sidebar Selection Rules

The sidebar is not an inventory. It should show only the items that explain why the playbook runs and why the user should trust it.

### When it runs

Include an item only if it answers one of these questions:

- What event starts the playbook?
- What signal makes this playbook relevant now?
- What schedule or threshold causes it to run?
- What elapsed-time, deadline, or quiet-period rule causes it to run?
- What Space or Connection scopes where it runs?
- What user action manually starts it?

Order items by importance:

1. Primary trigger event.
2. Time trigger when it controls urgency or cadence.
3. Most important qualifying condition.
4. Space/Connection scope if it changes where the trigger applies.
5. Manual fallback, if useful.

Keep it to 2-4 items. Do not list data sources here unless the source itself is the trigger.

### What it uses

Include an item only if it materially affects the decision or output:

- connected tool family that produces a needed signal,
- `/memory` surface that provides durable context,
- Space that scopes visibility or collaboration,
- Connection that provides relationship graph context,
- bundled reference/script/asset that changes execution quality.

Order items by decision value:

1. Required sources.
2. High-trust evidence sources.
3. Memory surfaces that can correct or enrich the decision.
4. Spaces/Connections that define context boundaries.
5. Optional sources.

Keep it to 3-6 items. Group related items rather than listing every app or every memory surface. For example, write "People and Org memory" instead of "people, orgs, every linked note, every contact record."

### Exclusion rule

If removing the item would not change when the playbook runs, what it decides, who approves it, or how much the user trusts it, do not show it in the sidebar.

## Retrieval Budget Template

Add this to a domain reference when context matters:

```markdown
## Context Budget

### Connected tools

- Required:
- Optional:
- Ignored:

### Memory scope

- Entity anchor:
- Memory surfaces: people, orgs, work, files, billing, conversations, meetings, teams, me
- Relation filters:
- Time window:
- Max records:
- Ranking:

### Operating surfaces

- Spaces:
- Connections:
- Visibility or approval boundary:
- Trigger scope:

### Time

- Trigger schedule/deadline/elapsed-time rule:
- Lookback/lookahead window:
- Timezone/business-day assumption:
- Recency or staleness rule:

### LLM context

- Facts passed:
- Facts excluded:
- Max input paths:

### Degradation

- If a required source is missing:
- If optional sources are missing:
- If too many records match:
- If evidence conflicts:
```

## Good Patterns

- Fetch a small set of candidate records, then pass only normalized facts into the LLM.
- Prefer entity-anchored retrieval over broad search.
- Prefer canonical signals over tool-specific branches.
- Keep Spaces and Connections separate from `/memory` in the authoring model.
- Keep user-corrected memory high priority.
- Record which memory/tool source supported the decision.
- Ask for review when memory and connected-tool evidence disagree.

## Bad Patterns

- "Load all communication, finance, scheduling, files, conversations, meetings, notes, and CRM context."
- "Use every connected tool."
- "Pass the top 100 memory records into the model."
- "Treat Spaces or Connections as memory records."
- "If one source says client and another says vendor, pick whichever appeared first."
- "Assume the user has connected a specific app."
- "Ignore `/memory` corrections because an external tool has newer data."

## Eval Requirements

Add eval cases that prove scaling behavior:

- many connected tools, only relevant signals used,
- missing optional tool, graceful fallback,
- too many memory matches, top-ranked subset used,
- space-scoped trigger only runs in the intended space,
- connection-scoped context uses only relevant relationships,
- time-triggered run fires at the boundary and does not fire before it,
- time-windowed context excludes stale or out-of-window records,
- user-corrected memory conflicts with external signal, review required,
- no memory available, playbook still behaves safely.

The benchmark should prove the playbook is bounded and source-aware, not just correct in a tiny workspace.
