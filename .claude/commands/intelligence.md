---
allowed-tools: Read, Glob, Grep, Bash(ls:*), Write, Task
description: "Generate, audit, and manage ambient intelligence panels. Orchestrates contextual insights across Salt Core pages."
---

# /intelligence - Ambient Intelligence Command

You are the Ambient Intelligence Agent, responsible for orchestrating contextual intelligence across Salt Core pages.

## Required Context

Before any operation, read the agent definition and core types:

```
!`cat .claude/agents/ambient-intelligence.md | head -100`
```

Load the page intelligence registry:

```
!`cat app/_features/intelligence/config/page-intelligence-registry.ts | head -80`
```

## Arguments

The command was invoked with: `$ARGUMENTS`

## Subcommand Routing

Parse the arguments to determine which mode to operate in:

### 1. `/intelligence generate [page-type]`
**Generate Insights for a Page**

Generate the appropriate insights for a specific page context.

Actions:
1. Look up page in PAGE_INTELLIGENCE_REGISTRY
2. Identify required generators for each section
3. Show what insights would be generated
4. Provide implementation guidance if panel doesn't exist

Output format:
```
┌─────────────────────────────────────────────────────────────────┐
│ Intelligence Generation: [page-type]                             │
├─────────────────────────────────────────────────────────────────┤
│ Question This Panel Answers:                                     │
│ "[question from registry]"                                       │
│                                                                  │
│ Sections:                                                        │
│ 1. [section-type] - [title]                                      │
│    └── Generator: [function name]                                │
│                                                                  │
│ Required Context:                                                │
│ • [contextRequired fields]                                       │
│                                                                  │
│ Cognitive Limits:                                                │
│ • Max insights: [maxInsights]                                    │
│ • Refresh interval: [refreshInterval]                            │
│                                                                  │
│ Implementation Status:                                           │
│ ✅ Registry configured                                           │
│ ✅ Generators available                                          │
│ ❌ Panel component not yet created                               │
│                                                                  │
│ Next Steps:                                                      │
│ 1. Create [PanelName]AmbientPanel.tsx                            │
│ 2. Wire up usePageIntelligence hook                              │
│ 3. Test with real data                                           │
└─────────────────────────────────────────────────────────────────┘
```

### 2. `/intelligence audit [page-type]`
**Audit Page Intelligence Configuration**

Verify that a page's ambient intelligence is correctly configured and data-grounded.

Actions:
1. Check page exists in registry
2. Verify all sections have generators
3. Validate DataSource fields on sample insights
4. Check cognitive load compliance
5. Verify UX compliance (semantic colors, valid hrefs)

Output format:
```
┌─────────────────────────────────────────────────────────────────┐
│ Intelligence Audit: [page-type]                                  │
├─────────────────────────────────────────────────────────────────┤
│ Configuration:                                                   │
│ ✅ Page registered in registry                                   │
│ ✅ N sections configured                                         │
│ ✅ maxInsights within cognitive limits                           │
│                                                                  │
│ Data Integrity:                                                  │
│ ✅ All insights have DataSource                                  │
│ ✅ No placeholder/mock data                                      │
│ ⚠️  Note: [any warnings]                                         │
│                                                                  │
│ UX Compliance:                                                   │
│ ✅ Semantic colors only                                          │
│ ✅ Action hrefs valid                                            │
│ ❌ [any issues]                                                  │
│                                                                  │
│ Score: [X]/100 - [STATUS]                                        │
└─────────────────────────────────────────────────────────────────┘
```

### 3. `/intelligence section [section-type]`
**Build a New Intelligence Section**

Generate implementation for a new intelligence section type.

Actions:
1. Analyze section requirements from SECTION_CONFIGS
2. Identify required data sources
3. Generate insight generator function scaffold
4. Show pages that would use this section

Output format:
```
┌─────────────────────────────────────────────────────────────────┐
│ Section Builder: [section-type]                                  │
├─────────────────────────────────────────────────────────────────┤
│ Section Config:                                                  │
│ • Title: [title]                                                 │
│ • Icon: [icon]                                                   │
│ • Max items: [maxItems]                                          │
│ • Priority: [priority]                                           │
│                                                                  │
│ Data Sources Required:                                           │
│ • [table] ([columns needed])                                     │
│                                                                  │
│ Generator Scaffold:                                              │
│ [code block with generator function]                             │
│                                                                  │
│ Pages Using This Section:                                        │
│ • [page-type-1]                                                  │
│ • [page-type-2]                                                  │
│                                                                  │
│ Next Steps:                                                      │
│ 1. Implement generator in generators/[name]-generator.ts         │
│ 2. Export from generators/index.ts                               │
│ 3. Test with real data                                           │
└─────────────────────────────────────────────────────────────────┘
```

### 4. `/intelligence list`
**List All Page Intelligence Configurations**

Show all pages with their intelligence configurations.

Actions:
1. Read PAGE_INTELLIGENCE_REGISTRY
2. List all pages with their sections
3. Identify which have panel implementations

Output format:
```
┌─────────────────────────────────────────────────────────────────┐
│ Page Intelligence Registry                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Studio Pages:                                                    │
│ ├── studio-inbox [✅ Panel]                                      │
│ │   └── urgent-alerts, today-summary, quick-actions              │
│ ├── studio-overview [❌ Pending]                                 │
│ │   └── portfolio-health, weekly-stats, needs-attention          │
│ └── studio-clients-list [✅ Panel]                               │
│     └── portfolio-health, needs-attention, pipeline              │
│                                                                  │
│ Client Pages:                                                    │
│ ├── studio-client-detail [✅ Panel]                              │
│ │   └── client-health, revenue-metrics, upcoming, activity       │
│ ...                                                              │
│                                                                  │
│ Summary: N/M pages have panel implementations                    │
└─────────────────────────────────────────────────────────────────┘
```

### 5. `/intelligence panel [page-type]`
**Generate Panel Component**

Generate the ambient panel component for a page.

Actions:
1. Look up page configuration
2. Identify required generators
3. Generate panel component code
4. Show integration instructions

Output:
- Creates `app/_features/shell/components/ambient/[Name]AmbientPanel.tsx`
- Shows how to wire up in the page

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `app/_features/intelligence/types/ambient-intelligence.ts` | Core insight types |
| `app/_features/intelligence/config/page-intelligence-registry.ts` | Page configurations |
| `app/_features/intelligence/generators/*.ts` | Insight generators |
| `app/_features/intelligence/components/*.tsx` | UI components |
| `app/_features/intelligence/hooks/usePageIntelligence.ts` | Hook for pages |
| `app/_features/shell/contexts/AmbientPanelContext.tsx` | Context provider |

---

## Anti-Hallucination Checklist

Before generating any insight or panel:

```
□ Every metric has a DataSource with table, computation, computedAt
□ No placeholder data or mock values
□ Generators fetch from real database tables
□ Empty states handled (return null, not fake data)
□ Semantic colors only (text-success, not text-green-500)
□ Action hrefs are valid routes
```

---

## Examples

### Example 1: Check what a page needs

```
/intelligence generate studio-project-detail
```

### Example 2: Audit an existing panel

```
/intelligence audit studio-client-detail
```

### Example 3: Build a new section type

```
/intelligence section seo-summary
```

### Example 4: Generate a panel component

```
/intelligence panel studio-projects-list
```
