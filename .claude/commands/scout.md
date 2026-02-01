# /scout - UX Pattern Scout

Research best-in-class UX patterns for any feature area and adapt them for Salt Core using our Linear design system.

## Usage

```bash
# Scout patterns for a feature area
/scout clients
/scout projects
/scout invoices
/scout messaging

# With specific focus
/scout clients --focus "detail page"
/scout projects --focus "kanban board"
/scout invoices --focus "payment flow"

# With autonomy level
/scout clients --level supervised   # Pause after each phase
/scout clients --level guided       # Pause before implementation (default)
/scout clients --level autonomous   # Full auto for small changes

# With specific reference
/scout clients --reference "copilot.com"
/scout projects --reference "linear.app"
```

## Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `feature` | Feature area to scout (required) | - |
| `--focus` | Specific aspect to focus on | Entire feature |
| `--level` | Autonomy level | `guided` |
| `--reference` | Specific product to prioritize | Auto-select best |
| `--skip-research` | Use cached research, go straight to proposal | `false` |

## Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    /scout [feature]                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PHASE 1: DISCOVER                                          │
│  ─────────────────                                          │
│  • Read current Salt Core implementation                    │
│  • Identify pain points and gaps                            │
│  • Define success criteria                                  │
│                                                             │
│  PHASE 2: SCOUT                                             │
│  ─────────────────                                          │
│  • Search Mobbin for patterns                               │
│  • Analyze competitor products                              │
│  • Extract patterns with reasoning                          │
│  • Document information architecture                        │
│                                                             │
│  PHASE 3: ANALYZE                                           │
│  ─────────────────                                          │
│  • Score patterns (relevance, complexity, density)          │
│  • Create recommendation matrix                             │
│  • Select "hero pattern" to adapt                           │
│                                                             │
│  PHASE 4: PROPOSE                                           │
│  ─────────────────                                          │
│  • Present findings with visual references                  │
│  • Show current vs. recommended comparison                  │
│  • Map to Salt Core components                              │
│  • Estimate implementation effort                           │
│                                                             │
│  [PAUSE FOR APPROVAL]                                       │
│                                                             │
│  PHASE 5: IMPLEMENT                                         │
│  ─────────────────                                          │
│  • Build using Salt Core's Linear design system             │
│  • Use semantic colors and existing components              │
│  • Create new components as needed                          │
│  • Ensure keyboard accessibility and dark mode              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Example Output

```
/scout clients

═══════════════════════════════════════════════════════════════
UX PATTERN SCOUT: CLIENTS
═══════════════════════════════════════════════════════════════

PHASE 1: DISCOVER
─────────────────────────────────────────────────────────────────
Current implementation:
  • app/(user_dashboard)/dashboard/clients/page.tsx
  • Basic card grid layout
  • Simple client detail page

Pain points identified:
  ❌ No unified client hub (info scattered across pages)
  ❌ Missing tabbed content view
  ❌ No property sidebar for quick context
  ❌ Company grouping not prominent

PHASE 2: SCOUT
─────────────────────────────────────────────────────────────────
Researching industry patterns...

Found 5 strong examples:

┌─────────────────────────────────────────────────────────────┐
│ 1. COPILOT - Client Hub Pattern                    ⭐ BEST │
├─────────────────────────────────────────────────────────────┤
│ Structure:                                                  │
│ • Client List → Client Detail (click row)                   │
│ • Detail: Tabs (Messages, Files, Contracts, Invoices, Forms)│
│ • Right sidebar: User info, Properties, Payment, Subs       │
│                                                             │
│ Why it works:                                               │
│ • Single place for all client touchpoints                   │
│ • Tabs reduce cognitive load                                │
│ • Sidebar keeps context visible while browsing              │
│ • Inline property editing                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 2. HONEYBOOK - Client Workspace                             │
├─────────────────────────────────────────────────────────────┤
│ Structure: Project-centric with client attached             │
│ Good for: Freelancers with project-based work               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 3. LINEAR - Issue Detail Pattern                            │
├─────────────────────────────────────────────────────────────┤
│ Structure: Full-page detail with properties sidebar         │
│ Good for: Dense information, keyboard navigation            │
└─────────────────────────────────────────────────────────────┘

PHASE 3: ANALYZE
─────────────────────────────────────────────────────────────────
Scoring matrix:

│ Pattern     │ Relevance │ Complexity │ Density │ Mobile │ TOTAL │
│─────────────│───────────│────────────│─────────│────────│───────│
│ Copilot     │ ⭐⭐⭐⭐⭐ │ ⭐⭐⭐      │ ⭐⭐⭐⭐⭐│ ⭐⭐⭐⭐ │  17   │
│ HoneyBook   │ ⭐⭐⭐⭐   │ ⭐⭐⭐⭐    │ ⭐⭐⭐⭐ │ ⭐⭐⭐  │  15   │
│ Linear      │ ⭐⭐⭐     │ ⭐⭐⭐      │ ⭐⭐⭐⭐⭐│ ⭐⭐⭐  │  14   │

RECOMMENDATION: Copilot Client Hub pattern

PHASE 4: PROPOSE
─────────────────────────────────────────────────────────────────

CURRENT                          RECOMMENDED
─────────────────────────────    ─────────────────────────────
┌────────────────────────┐       ┌────────────────────────────┐
│ Clients                │       │ Clients                    │
│ ┌────┐ ┌────┐ ┌────┐  │       │ Search │ View │ Export │+New│
│ │Card│ │Card│ │Card│  │       │ ┌──────────────────────────┐│
│ └────┘ └────┘ └────┘  │       │ │ Name    │Company│Status │││
│ ┌────┐ ┌────┐ ┌────┐  │       │ │─────────│───────│───────│││
│ │Card│ │Card│ │Card│  │       │ │ Alex S  │ASMob  │Invited│││
│ └────┘ └────┘ └────┘  │       │ │ Jane D  │Rocket │Active │││
└────────────────────────┘       │ └──────────────────────────┘│
                                 └────────────────────────────┘

Client Detail (current)          Client Detail (recommended)
─────────────────────────────    ─────────────────────────────
┌────────────────────────┐       ┌────────────────────────────┐
│ Client Name            │       │ Clients > Alex S     [+New]│
│ ───────────────────    │       │ ┌────────────────┐┌───────┐│
│ Email: ...             │       │ │Msgs│Files│Inv│ ││ User  ││
│ Phone: ...             │       │ ├────────────────┤│ Info  ││
│ Company: ...           │       │ │                ││───────││
│ Notes: ...             │       │ │ [Messages]     ││Props  ││
│                        │       │ │                ││Payment││
│                        │       │ │                ││Subs   ││
│                        │       │ │ [Composer]     ││       ││
└────────────────────────┘       │ └────────────────┘└───────┘│
                                 └────────────────────────────┘

COMPONENT MAPPING (Salt Core)
─────────────────────────────────────────────────────────────────
Copilot Element          →  Salt Core Component
────────────────────────────────────────────────────
Client list table        →  @repo/ui Table (exists)
Status badge            →  @repo/ui Badge (exists)
Tabs                    →  @repo/ui Tabs (exists)
Properties sidebar      →  NEW: ClientPropertiesSidebar
User info card          →  NEW: UserInfoCard
Property row            →  NEW: PropertyRow (inline edit)
Message thread          →  Reuse existing messaging components
Composer                →  Reuse existing MessageComposer

IMPLEMENTATION PLAN
─────────────────────────────────────────────────────────────────
Files to create:
  • app/_features/clients/components/ClientListTable.tsx
  • app/_features/clients/components/ClientDetailLayout.tsx
  • app/_features/clients/components/ClientPropertiesSidebar.tsx
  • app/_features/clients/components/UserInfoCard.tsx
  • app/_features/clients/components/PropertyRow.tsx

Files to modify:
  • app/(user_dashboard)/dashboard/clients/page.tsx
  • app/(user_dashboard)/dashboard/clients/[id]/page.tsx

Estimated effort: Medium (2-3 days)

═══════════════════════════════════════════════════════════════

DECISION REQUIRED:
  [1] Approve and proceed with implementation
  [2] Request modifications to the proposal
  [3] Scout additional alternatives
  [4] Save proposal and decide later

Your choice:
```

## Key Principles

### UX from the Best
- Extract information architecture and flows
- Understand WHY patterns work
- Adapt for freelancer/agency context

### Visual Design from Salt Core
- Use semantic colors (bg-card, text-foreground, etc.)
- Use existing @repo/ui components
- Follow Linear Standard typography
- Dark mode first, keyboard accessible

### Implementation Quality
- No raw Tailwind colors (ESLint will catch this)
- Use existing patterns from @repo/patterns
- Mobile responsive
- Accessible (aria-labels, focus management)

## Related Commands

| Command | Use With |
|---------|----------|
| `/research` | Deep dive on user psychology |
| `/replicate` | Pixel-perfect component extraction |
| `/prd` | Generate PRD from approved pattern |
| `/ralph` | Autonomous implementation |

## Feature Research Database

The agent maintains knowledge of best-in-class products for each feature area:

| Feature | Primary References |
|---------|-------------------|
| Clients | Copilot, HoneyBook, Dubsado |
| Projects | Linear, Notion, Asana |
| Invoices | Stripe, Wave, FreshBooks |
| Messaging | Intercom, Slack, Linear |
| Calendar | Cal.com, Calendly, Notion |
| Files | Notion, Dropbox, Google Drive |
| Forms | Typeform, Tally, Notion |

## Tips

1. **Start with the user flow** - Don't just copy UI, understand the journey
2. **Validate with screenshots** - Provide visual references from your research
3. **Map to existing components** - Reuse before creating new
4. **Consider mobile** - Many freelancers work on mobile
5. **Test keyboard navigation** - Linear Standard requires it
