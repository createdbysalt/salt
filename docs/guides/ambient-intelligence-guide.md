# Ambient Intelligence Developer Guide

> How to add contextual intelligence panels to Salt pages.

---

## Overview

Ambient Intelligence is Salt's system for displaying contextual, actionable data in the right sidebar. Each page has a dedicated panel that answers a specific question and helps users understand their business.

---

## Quick Start

### 1. Register Your Page

Add your page to the registry:

```typescript
// app/_features/intelligence/config/page-intelligence-registry.ts

"studio-your-page": {
  name: "Your Page",
  question: "What question does this panel answer?",
  sections: ["health-section", "alerts-section", "quick-actions"],
  maxInsights: 10,
  contextRequired: ["entityId"], // Optional
  refreshInterval: 60000, // Optional: ms between refreshes
}
```

### 2. Create Your Panel Component

```typescript
// app/_features/shell/components/ambient/your-feature/YourPageAmbientPanel.tsx

"use client";

import { usePageIntelligence } from "@/app/_features/intelligence/hooks/usePageIntelligence";
import { InsightSection, AlertCard } from "@/app/_features/intelligence/components";

export function YourPageAmbientPanel({ entityId }: { entityId: string }) {
  const { insights, loading, refresh, pageConfig } = usePageIntelligence({
    pageType: "studio-your-page",
    context: { entityId },
    autoRefresh: true,
  });

  return (
    <div className="flex h-full flex-col pt-2 px-6 pb-6 space-y-4">
      {pageConfig && (
        <div className="text-xs text-muted-foreground italic px-1">
          {pageConfig.question}
        </div>
      )}

      {/* Your sections here */}
    </div>
  );
}
```

### 3. Export Your Panel

```typescript
// app/_features/shell/components/ambient/your-feature/index.ts

export { YourPageAmbientPanel } from "./YourPageAmbientPanel";
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Page Component                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ usePageIntelligence("studio-your-page", context)     │   │
│  └─────────────────────────────────────────────────────┘   │
│                            ↓                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ PAGE_INTELLIGENCE_REGISTRY["studio-your-page"]       │   │
│  │ • sections: ["health", "alerts", "actions"]          │   │
│  │ • maxInsights: 10                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                            ↓                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Insight Generators                                   │   │
│  │ • generateHealthInsight(entityId)                    │   │
│  │ • generateAlerts(entityId)                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                            ↓                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ AmbientInsight[]                                     │   │
│  │ Each insight has:                                    │   │
│  │ • metric (label, value, dataSource)                  │   │
│  │ • meaning (plainEnglish, whyItMatters)               │   │
│  │ • action (label, href, urgency)                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Files

| File | Purpose |
|------|---------|
| `app/_features/intelligence/types/ambient-intelligence.ts` | Core type definitions |
| `app/_features/intelligence/config/page-intelligence-registry.ts` | Page configurations |
| `app/_features/intelligence/generators/*.ts` | Insight computation functions |
| `app/_features/intelligence/components/*.tsx` | UI components |
| `app/_features/intelligence/hooks/usePageIntelligence.ts` | Main hook |

---

## Available Components

### Core Components

| Component | Purpose |
|-----------|---------|
| `MetricWithExplanation` | Three-layer metric display |
| `HealthScoreCard` | Health score with factors |
| `TrendCard` | Metric with sparkline |
| `AlertCard` | Actionable alert |
| `OpportunityCard` | Growth suggestion |
| `BenchmarkCard` | Value vs benchmark |

### Container Components

| Component | Purpose |
|-----------|---------|
| `InsightSection` | Section with title, loading state |
| `InsightEmptyState` | Empty state message |
| `AmbientInsightRenderer` | Renders any insight type |

### Usage Examples

```tsx
import {
  InsightSection,
  AlertCard,
  HealthScoreCard,
  TrendCard,
} from "@/app/_features/intelligence/components";

// Health Score
<HealthScoreCard
  score={78}
  variant="client"
  factors={[
    { reason: "On-time payments", impact: 10 },
    { reason: "No contact in 30 days", impact: -12 },
  ]}
  dataSource={{
    table: "clients, bridge_invoices",
    computation: "Health score algorithm",
    computedAt: new Date(),
  }}
/>

// Trend Card
<TrendCard
  label="Monthly Revenue"
  value="$12.5k"
  direction="up"
  changePercent={12}
  sentiment="positive"
  sparklineValues={[8000, 9500, 10200, 11000, 12500]}
  dataSource={{
    table: "bridge_invoices",
    computation: "SUM(amount_cents) WHERE paid",
    computedAt: new Date(),
  }}
/>

// Alert Card
<AlertCard
  alert={{
    id: "1",
    category: "alert",
    metric: { label: "Invoice Overdue", value: "$2,400" },
    meaning: {
      plainEnglish: "Invoice #1234 is 14 days overdue",
      whyItMatters: "This client usually pays within 7 days",
    },
    action: {
      label: "Send reminder",
      href: "/studio/invoices/1234",
      urgency: "high",
    },
    sentiment: "negative",
    priority: 10,
    freshness: new Date(),
    dataSource: { ... },
  }}
/>
```

---

## The Three-Layer Model

Every metric should support three interaction layers:

### Layer 1: Glance (Always Visible)
- Metric value
- Trend indicator (up/down arrow)
- Status badge (healthy/warning/critical)
- Sparkline if applicable

### Layer 2: Explain (Tooltip on Hover)
- "What this means" in plain English
- "Why it matters" for context
- ~2 seconds to read

### Layer 3: Deep-Dive (Sheet on Click)
- Full metric breakdown
- Data source (table, computation, timestamp)
- Benchmark comparison
- Recommended actions

---

## Anti-Hallucination Requirements

**CRITICAL:** Every metric MUST have a `dataSource`:

```typescript
dataSource: {
  table: string;        // Which database tables
  computation: string;  // How the value was computed
  computedAt: Date;     // When it was calculated
  entityIds?: string[]; // Optional: which entities
}
```

If you cannot provide a valid `dataSource`, DO NOT show the metric.

---

## Data Accuracy Patterns (Research-Backed)

Based on research from Linear, Stripe, HubSpot, and academic sources, Salt implements these trust patterns:

### Data Provenance Components

Show where every metric comes from:

```tsx
import {
  InlineProvenance,    // Smallest - for tight spaces
  CompactProvenance,   // For card footers
  ExpandableProvenance, // For detail views
  ProvenanceCard,      // For deep-dive sheets
} from "@/app/_features/intelligence/components";

// Inline (smallest)
<InlineProvenance dataSource={dataSource} />
// Output: "📊 bridge_invoices • 30m ago"

// Compact (card footer)
<CompactProvenance dataSource={dataSource} />

// Expandable (detail view)
<ExpandableProvenance dataSource={dataSource} defaultOpen={false} />

// Full card (deep-dive)
<ProvenanceCard dataSource={dataSource} />
```

### AI Disclosure Components

Clearly label AI-generated content:

```tsx
import {
  AIBadge,           // Inline label
  AIDisclosureText,  // Attribution text
  ConfidenceIndicator, // HIGH/MEDIUM/LOW
  AIInsightCard,     // Full AI insight
  AISectionHeader,   // Group header
} from "@/app/_features/intelligence/components";

// Badge (inline)
<AIBadge action="summarized" />
// Output: "✨ Summarized with AI"

// Confidence indicator
<ConfidenceIndicator confidence="high" />
// Output: "✓ High confidence"

// Full AI insight card
<AIInsightCard
  insight="Revenue increased 12% this month..."
  action="analyzed"
  confidence="high"
  dataSource={dataSource}
  supportingData={[
    { label: "New clients", value: "2" },
    { label: "Revenue increase", value: "+$1,340" },
  ]}
  actionButton={{
    label: "View pipeline",
    href: "/studio/pipeline",
  }}
/>
```

### Freshness Indicators

Show when data was last updated:

```tsx
import { FreshnessIndicator } from "@/app/_features/intelligence/components";

// Inline (smallest)
<FreshnessIndicator computedAt={new Date()} variant="inline" />
// Output: "● just now" (green dot = fresh)

// Badge (with refresh button)
<FreshnessIndicator
  computedAt={dataSource.computedAt}
  variant="badge"
  showRefresh
  onRefresh={handleRefresh}
  isRefreshing={isRefreshing}
/>

// Detailed (for stale data warning)
<FreshnessIndicator
  computedAt={oldDate}
  variant="detailed"
  showRefresh
  onRefresh={handleRefresh}
/>
```

### Freshness Levels

| Level | Time | Visual | Color |
|-------|------|--------|-------|
| Fresh | < 1 hour | Green dot | `text-success` |
| Recent | < 24 hours | No indicator | `text-muted-foreground` |
| Stale | > 24 hours | Warning indicator | `text-warning` |

---

## AI Insight Type

For AI-generated insights, use the `AIInsight` type:

```typescript
interface AIInsight extends BaseInsight {
  category: "ai_insight";
  insight: string;           // The AI-generated text
  aiAction: AIAction;        // What the AI did
  confidence: AIConfidence;  // HIGH | MEDIUM | LOW
  dataSource: DataSource;    // Anti-hallucination
  supportingData?: Array<{   // Evidence
    label: string;
    value: string;
    source: string;
  }>;
}
```

### AI Actions

| Action | Use When | Example |
|--------|----------|---------|
| `summarized` | AI condensed data | "Summarized from 12 invoices" |
| `analyzed` | AI performed analysis | "Analyzed revenue trends" |
| `generated` | AI created new content | "Generated insight" |
| `suggested` | AI made suggestion | "Suggested next steps" |
| `predicted` | AI made prediction | "Predicted churn risk" |

### Confidence Levels

| Level | Description | Show When |
|-------|-------------|-----------|
| `high` | Substantial historical data | >100 data points |
| `medium` | Limited or recent data | 10-100 data points |
| `low` | Preliminary, may change | <10 data points |

---

## Cognitive Load Limits

| Section Type | Max Items |
|--------------|-----------|
| Urgent alerts | 3 |
| Health metrics | 4 |
| Trends | 4 |
| Activity | 5 |
| Quick actions | 4 |

| Page Type | Max Total |
|-----------|-----------|
| Inbox | 8 |
| List pages | 10 |
| Detail pages | 12 |
| Dashboard | 15 |

---

## Sentiment & Colors

**ONLY use semantic colors:**

| Sentiment | Badge Class | Text Class |
|-----------|-------------|------------|
| `positive` | `bg-success/10 text-success border-success/20` | `text-success` |
| `negative` | `bg-destructive/10 text-destructive border-destructive/20` | `text-destructive` |
| `warning` | `bg-warning/10 text-warning border-warning/20` | `text-warning` |
| `neutral` | `bg-muted text-muted-foreground` | `text-muted-foreground` |

**NEVER use raw Tailwind colors** like `bg-green-500` or `text-red-600`.

---

## Creating a New Panel

### Step 1: Plan

1. What question does this panel answer?
2. What sections are needed?
3. What data sources are required?
4. What actions are available?

### Step 2: Register

Add to `page-intelligence-registry.ts`:

```typescript
"studio-your-page": {
  name: "Your Page",
  question: "Your question?",
  sections: [...],
  maxInsights: 10,
},
```

### Step 3: Create Generators (if needed)

If you need new insight types:

```typescript
// app/_features/intelligence/generators/your-generator.ts

export async function generateYourInsight(
  entityId: string
): Promise<YourInsight | null> {
  // Fetch real data
  const data = await fetchData(entityId);
  if (!data) return null;

  return {
    id: `your-insight-${entityId}`,
    category: "health",
    metric: {
      label: "Your Metric",
      value: data.value,
    },
    meaning: {
      plainEnglish: "What this means...",
      whyItMatters: "Why it matters...",
    },
    dataSource: {
      table: "your_table",
      computation: "How computed",
      computedAt: new Date(),
    },
    sentiment: data.value > 80 ? "positive" : "warning",
    priority: 8,
    freshness: new Date(),
  };
}
```

### Step 4: Build the Panel

Create the panel component using existing UI components.

### Step 5: Test

- [ ] Panel renders without errors
- [ ] Loading states work
- [ ] Empty states work
- [ ] All data has DataSource
- [ ] Actions navigate correctly
- [ ] Colors are semantic only

---

## Testing

### Unit Tests

```typescript
// YourPageAmbientPanel.test.tsx

import { render, screen } from "@testing-library/react";
import { YourPageAmbientPanel } from "./YourPageAmbientPanel";

describe("YourPageAmbientPanel", () => {
  it("renders the page question", () => {
    render(<YourPageAmbientPanel entityId="123" />);
    expect(screen.getByText(/your question/i)).toBeInTheDocument();
  });

  it("shows loading state initially", () => {
    render(<YourPageAmbientPanel entityId="123" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
```

---

## Related Documentation

- [Ambient Intelligence Patterns](../../brand-identity/research/ambient-intelligence-patterns.md)
- [Metric Explanation Examples](../../brand-identity/research/metric-explanation-examples.md)
- [Alert Fatigue Prevention](../../brand-identity/research/alert-fatigue-prevention.md)
- [Agent Definition](../../.claude/agents/ambient-intelligence.md)
- [Command Specification](../../.claude/commands/intelligence.md)

---

## Troubleshooting

### "No insights showing"
- Check that page is registered in registry
- Check that generators are returning data
- Check that `contextRequired` fields are provided

### "Loading forever"
- Check generator for errors
- Ensure generators handle null/error cases
- Check network requests in dev tools

### "Colors look wrong"
- Ensure using semantic color classes
- Check `sentiment` value matches expected

### "Actions not working"
- Verify `href` is a valid route
- Check that routes exist in app directory
