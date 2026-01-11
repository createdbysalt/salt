# PRD: SEO Monitoring Dashboard

## Introduction

Add SEO monitoring capabilities to Salt Core so studios can track website performance for their client projects and share curated insights via the Bridge portal. This initial release focuses on **site auditing** and **performance monitoring** using free APIs (Google Lighthouse and Chrome UX Report), with the architecture designed to support future paid integrations (rank tracking, AEO).

Studios get a comprehensive overview of all projects' SEO health plus per-project deep dives. Clients see a curated view in the Bridge—studios control exactly which metrics are visible to each client.

## Goals

- Enable studios to monitor site performance and SEO health for each project
- Provide actionable audit insights (accessibility, SEO, performance, best practices)
- Give clients visibility into their site's performance through the Bridge
- Allow studios to control which metrics clients can see (curated transparency)
- Build foundation for future integrations (DataForSEO, SerpApi) without rework
- Use free APIs (Lighthouse, CrUX) to deliver value without additional costs

## User Stories

### US-001: Database schema for SEO tracking
**Description:** As a developer, I need database tables to store SEO configuration and audit results so data persists and can be queried efficiently.

**Acceptance Criteria:**
- [ ] Create `seo_configs` table with: id, project_id, studio_id, domain, is_enabled, client_visible_metrics (JSONB), created_at, updated_at
- [ ] Create `seo_audits` table with: id, project_id, studio_id, audit_type ('lighthouse' | 'crux'), scores (JSONB), raw_data (JSONB), audited_at, created_at
- [ ] Add RLS policies scoped by studio_id
- [ ] Add foreign key constraints to projects table
- [ ] Create indexes on (project_id, audited_at) for efficient time-series queries
- [ ] Migration runs successfully
- [ ] Typecheck passes

---

### US-002: SEO configuration UI for projects
**Description:** As a studio owner, I want to configure SEO tracking for a project so I can specify which domain to monitor.

**Acceptance Criteria:**
- [ ] Add "SEO" tab to project settings page (`/dashboard/projects/[id]/settings`)
- [ ] Domain input field with URL validation
- [ ] Toggle to enable/disable SEO tracking for project
- [ ] Save button persists configuration to `seo_configs` table
- [ ] Show current configuration state when revisiting
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- Navigate to `/dashboard/projects/[id]/settings`
- Click "SEO" tab
- Enter domain "https://example.com"
- Toggle tracking ON
- Click Save and verify success toast appears
- Refresh page and verify settings persisted

---

### US-003: Manual Lighthouse audit trigger
**Description:** As a studio owner, I want to run a Lighthouse audit on-demand so I can get fresh performance data whenever needed.

**Acceptance Criteria:**
- [ ] "Run Audit" button on project SEO page
- [ ] Button shows loading state during audit (takes 10-30 seconds)
- [ ] Calls Google PageSpeed Insights API (free, uses Lighthouse)
- [ ] Stores results in `seo_audits` table
- [ ] Displays success/error toast on completion
- [ ] Prevents multiple simultaneous audits (disable button while running)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- Navigate to `/dashboard/projects/[id]/seo`
- Click "Run Audit" button
- Verify button shows loading spinner
- Wait for audit completion (10-30s)
- Verify success toast and scores update on page

---

### US-004: Project SEO dashboard with Lighthouse scores
**Description:** As a studio owner, I want to see Lighthouse audit results for a project so I can understand site health at a glance.

**Acceptance Criteria:**
- [ ] Create `/dashboard/projects/[id]/seo` page
- [ ] Display four score gauges: Performance, Accessibility, Best Practices, SEO
- [ ] Each gauge shows 0-100 score with color coding (red <50, orange 50-89, green 90+)
- [ ] Show "Last audited: [relative time]" below scores
- [ ] Empty state when no audits exist yet with prompt to run first audit
- [ ] Link to detailed audit breakdown
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- Navigate to `/dashboard/projects/[id]/seo` for project with audit data
- Verify four RadialGauge components display scores
- Verify color coding matches score ranges
- Verify "Last audited" timestamp is accurate
- Navigate to project without audits and verify empty state with "Run Audit" CTA

---

### US-005: Detailed audit breakdown view
**Description:** As a studio owner, I want to see detailed audit findings so I can identify specific issues to fix.

**Acceptance Criteria:**
- [ ] Expandable sections for each category (Performance, Accessibility, Best Practices, SEO)
- [ ] List individual audit items with pass/fail/warning status
- [ ] Show impact level (high/medium/low) for failed items
- [ ] Display recommendation text from Lighthouse
- [ ] Failed items sorted by impact (high first)
- [ ] Collapsible for easy scanning
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- Navigate to `/dashboard/projects/[id]/seo`
- Click on Performance section to expand
- Verify individual audit items are listed with status icons
- Verify failed items appear first, sorted by impact
- Click recommendation to see full details
- Collapse section and verify it closes

---

### US-006: Performance trends chart
**Description:** As a studio owner, I want to see how scores change over time so I can track improvement progress.

**Acceptance Criteria:**
- [ ] Line chart showing score trends over selected time period
- [ ] Four lines (one per category) with legend
- [ ] Time range selector: 7d, 30d, 90d, All
- [ ] Hover tooltip showing exact scores and date
- [ ] Graceful handling of sparse data (connect points, don't interpolate)
- [ ] Uses existing LineChart component with chart color variables
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- Navigate to `/dashboard/projects/[id]/seo`
- Verify line chart displays with four colored lines
- Click time range buttons (7d, 30d, 90d) and verify chart updates
- Hover over data point and verify tooltip shows scores

---

### US-007: Studio SEO overview dashboard
**Description:** As a studio owner, I want an overview of all projects' SEO health so I can prioritize which sites need attention.

**Acceptance Criteria:**
- [ ] Create `/dashboard/seo` page
- [ ] Add "SEO" nav item to dashboard sidebar (after Insights)
- [ ] Summary cards: Total tracked projects, Average scores, Projects needing attention
- [ ] Projects table with columns: Project name, Domain, Performance, SEO, Last Audit, Status
- [ ] Sort by any column
- [ ] Filter by status (healthy/needs attention/critical)
- [ ] Click row to navigate to project SEO detail
- [ ] Empty state when no projects have SEO configured
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- Navigate to `/dashboard/seo`
- Verify summary cards show aggregated metrics
- Verify projects table lists all SEO-enabled projects
- Click column header to sort
- Use filter dropdown to filter by status
- Click project row and verify navigation to `/dashboard/projects/[id]/seo`

---

### US-008: Client visibility controls
**Description:** As a studio owner, I want to control which SEO metrics clients can see so I can curate their experience.

**Acceptance Criteria:**
- [ ] Add "Client Visibility" section to project SEO settings
- [ ] Checkbox list of metrics: Performance score, SEO score, Accessibility score, Best Practices score, Detailed findings, Trend charts
- [ ] Default: all scores visible, detailed findings hidden
- [ ] Persist settings to `seo_configs.client_visible_metrics`
- [ ] Changes take effect immediately in Bridge
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- Navigate to `/dashboard/projects/[id]/settings` → SEO tab
- Locate "Client Visibility" section
- Uncheck "Detailed findings" checkbox
- Save settings
- Log in as client and verify detailed findings are hidden in Bridge

---

### US-009: Bridge SEO widget on project page
**Description:** As a client, I want to see my site's SEO health in the Bridge so I understand how my website is performing.

**Acceptance Criteria:**
- [ ] Add SEO section to `/bridge/projects/[id]` page
- [ ] Display only metrics enabled by studio in visibility settings
- [ ] Score gauges match studio dashboard styling (RadialGauge)
- [ ] Show "Last updated" timestamp
- [ ] Respect Bridge portal theming (colors inherit from client branding)
- [ ] Hide entire section if no metrics are enabled
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- Log in as test client user
- Navigate to `/bridge/projects/[id]`
- Verify SEO section displays with enabled metrics only
- Verify gauge colors match Bridge theme
- Verify "Last updated" shows correct timestamp

---

### US-010: Bridge SEO detail page
**Description:** As a client, I want to see detailed SEO information for my project so I can understand specific recommendations.

**Acceptance Criteria:**
- [ ] Create `/bridge/projects/[id]/seo` page
- [ ] Only accessible if studio has enabled SEO visibility
- [ ] Display curated view based on visibility settings
- [ ] Score gauges with trends (if trends enabled)
- [ ] Detailed findings (if enabled) - read-only, no studio-specific data
- [ ] Link from project page SEO widget
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- Log in as test client user
- Navigate to `/bridge/projects/[id]`
- Click "View Details" in SEO section
- Verify navigation to `/bridge/projects/[id]/seo`
- Verify only enabled metrics are displayed
- Verify no studio-internal data is exposed

---

### US-011: Core Web Vitals from CrUX API
**Description:** As a studio owner, I want to see real-user Core Web Vitals so I understand actual user experience, not just lab data.

**Acceptance Criteria:**
- [ ] Integrate Chrome UX Report (CrUX) API
- [ ] Display LCP, FID/INP, CLS metrics with good/needs improvement/poor thresholds
- [ ] Show field data alongside Lighthouse lab data
- [ ] Handle case where domain has insufficient traffic (no CrUX data)
- [ ] Store CrUX data in `seo_audits` with audit_type='crux'
- [ ] Fetch CrUX data when running Lighthouse audit
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- Navigate to `/dashboard/projects/[id]/seo` for high-traffic domain
- Verify Core Web Vitals section shows LCP, INP, CLS
- Verify threshold indicators (green/yellow/red)
- Navigate to low-traffic domain and verify "Insufficient data" message

---

### US-012: Scheduled audits (background job foundation)
**Description:** As a developer, I need infrastructure for scheduled audits so sites can be monitored automatically.

**Acceptance Criteria:**
- [ ] Create `/api/cron/seo-audits` endpoint
- [ ] Endpoint queries projects with SEO enabled and stale audits (>7 days)
- [ ] Runs Lighthouse audit for each (rate-limited, max 10 per run)
- [ ] Secured with cron secret header
- [ ] Logs success/failure for each audit
- [ ] Can be triggered by Vercel cron or external scheduler
- [ ] Typecheck passes

---

### US-013: SEO health alerts (future-ready)
**Description:** As a studio owner, I want to know when a site's scores drop significantly so I can address issues proactively.

**Acceptance Criteria:**
- [ ] Compare new audit scores to previous audit
- [ ] Flag significant drops (>10 points in any category)
- [ ] Store alert in new `seo_alerts` table
- [ ] Display alert badge on project in SEO overview
- [ ] Alert dismissible by studio user
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Browser Verification:**
- Navigate to `/dashboard/seo`
- Verify project with score drop shows alert badge
- Click to view alert details
- Dismiss alert and verify badge disappears

## Functional Requirements

- FR-1: Store SEO configuration per-project in `seo_configs` table
- FR-2: Store audit results in `seo_audits` table with JSONB for flexible data
- FR-3: Call Google PageSpeed Insights API for Lighthouse audits
- FR-4: Call Chrome UX Report API for field performance data
- FR-5: Display scores using RadialGauge components (0-100, color-coded)
- FR-6: Display trends using existing LineChart component
- FR-7: Enforce RLS policies so studios only see their own data
- FR-8: Respect client_visible_metrics when rendering Bridge views
- FR-9: Rate-limit API calls (Lighthouse: 25,000/day free, CrUX: 150/min)
- FR-10: Cache audit results; don't re-fetch unless explicitly requested
- FR-11: Add SEO nav item to studio dashboard sidebar
- FR-12: Add SEO section/page to Bridge project view

## Non-Goals (Out of Scope)

- **Rank tracking** - Requires paid API (DataForSEO/SerpApi); future phase
- **AEO (Answer Engine Optimization)** - Requires LLM API access; future phase
- **Competitor analysis** - Complex feature; not in initial release
- **Automated fixes** - We report issues, we don't auto-fix code
- **Email/Slack notifications** - Future enhancement; alerts are in-app only
- **Historical data import** - Start fresh; no migration from other tools
- **White-label PDF reports** - Future enhancement for agencies
- **Multi-URL tracking per project** - V1 tracks single domain per project

## Technical Considerations

### APIs Used

1. **Google PageSpeed Insights API** (free)
   - Endpoint: `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`
   - Rate limit: 25,000 queries/day (free tier)
   - Returns: Lighthouse scores + detailed audits
   - Latency: 10-30 seconds per audit

2. **Chrome UX Report API** (free)
   - Endpoint: `https://chromeuxreport.googleapis.com/v1/records:queryRecord`
   - Rate limit: 150 queries/minute
   - Returns: Real-user Core Web Vitals (LCP, INP, CLS)
   - Requires: Domain must have sufficient Chrome traffic

### Database Schema

```sql
-- SEO configuration per project
CREATE TABLE seo_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  client_visible_metrics JSONB DEFAULT '{"performance": true, "seo": true, "accessibility": true, "bestPractices": true, "details": false, "trends": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id)
);

-- Audit results (Lighthouse + CrUX)
CREATE TABLE seo_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  audit_type TEXT NOT NULL CHECK (audit_type IN ('lighthouse', 'crux')),
  scores JSONB NOT NULL, -- {performance: 85, seo: 92, ...}
  raw_data JSONB, -- Full API response for detailed view
  audited_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Alerts for score drops
CREATE TABLE seo_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- 'score_drop', 'critical_issue'
  message TEXT NOT NULL,
  metadata JSONB,
  is_dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX seo_audits_project_date ON seo_audits(project_id, audited_at DESC);
CREATE INDEX seo_alerts_project ON seo_alerts(project_id) WHERE NOT is_dismissed;
```

### RLS Policies
```sql
-- seo_configs
CREATE POLICY "Studios can manage their SEO configs"
  ON seo_configs FOR ALL
  USING (studio_id = (SELECT id FROM studios WHERE id = auth.uid()));

-- seo_audits
CREATE POLICY "Studios can view their audits"
  ON seo_audits FOR SELECT
  USING (studio_id = (SELECT id FROM studios WHERE id = auth.uid()));

-- Client access via project visibility (handled in application layer)
```

### File Structure
```
app/
├── (user_dashboard)/dashboard/
│   ├── seo/
│   │   └── page.tsx              # Overview dashboard
│   └── projects/[id]/
│       ├── seo/
│       │   └── page.tsx          # Project SEO detail
│       └── settings/
│           └── seo-settings.tsx  # SEO configuration tab
├── bridge/
│   └── projects/[id]/
│       ├── seo/
│       │   └── page.tsx          # Client SEO detail
│       └── seo-widget.tsx        # Embeddable widget
├── api/
│   ├── seo/
│   │   ├── audit/route.ts        # Trigger audit
│   │   └── crux/route.ts         # Fetch CrUX data
│   └── cron/
│       └── seo-audits/route.ts   # Scheduled audits
├── actions/
│   └── seo/
│       ├── get-seo-config.ts
│       ├── update-seo-config.ts
│       ├── get-audits.ts
│       ├── run-audit.ts
│       └── get-seo-overview.ts
components/
└── seo/
    ├── score-gauges.tsx          # Four RadialGauges
    ├── audit-breakdown.tsx       # Detailed findings
    ├── vitals-card.tsx           # Core Web Vitals display
    └── trends-chart.tsx          # Score history
libs/
└── seo/
    ├── lighthouse.ts             # PageSpeed API client
    └── crux.ts                   # CrUX API client
```

### Existing Components to Reuse
- `RadialGauge` from `/components/dataviz/radial-gauge.tsx`
- `LineChart` from `/components/charts/line-chart.tsx`
- `DataTile` from `/components/dataviz/data-tile.tsx`
- Tab patterns from InsightsDashboard
- Card/Badge/Button from shadcn/ui

### Environment Variables
```
GOOGLE_PAGESPEED_API_KEY=xxx  # Optional for higher limits
CRUX_API_KEY=xxx              # Required for CrUX
CRON_SECRET=xxx               # For securing cron endpoint
```

## Design Considerations

- **Score visualization**: Use RadialGauge with color thresholds matching Google's standards (red <50, orange 50-89, green 90+)
- **Mobile-first**: Bridge must work well on mobile devices
- **Loading states**: Audits take 10-30s; show clear progress indication
- **Empty states**: Guide users to configure SEO tracking when no data exists
- **Consistency**: Match existing Insights dashboard patterns

## Success Metrics

- Studios can run a Lighthouse audit in under 3 clicks
- Audit results display within 30 seconds of triggering
- 100% of configured projects have at least one audit within 7 days
- Clients can view their SEO scores in Bridge without studio intervention
- No increase in page load time for non-SEO pages

## Open Questions

1. Should we store full Lighthouse JSON (~500KB) or just extract key metrics?
   - **Recommendation**: Store full JSON in `raw_data`, extracted scores in `scores`

2. How should we handle domains without CrUX data (low traffic sites)?
   - **Recommendation**: Show "Insufficient traffic data" with explanation; rely on Lighthouse lab data

3. Should the cron job run daily or weekly by default?
   - **Recommendation**: Weekly to conserve API quota; allow manual override

4. Do we need to support authenticated pages (behind login)?
   - **Recommendation**: Not in V1; Lighthouse audits public URLs only

## Implementation Order

1. **Phase 1: Foundation** (US-001, US-002)
   - Database schema + migrations
   - SEO configuration UI

2. **Phase 2: Core Auditing** (US-003, US-004, US-005)
   - Lighthouse integration
   - Project SEO dashboard
   - Detailed breakdown

3. **Phase 3: Studio Overview** (US-006, US-007)
   - Trends chart
   - Overview dashboard

4. **Phase 4: Client Experience** (US-008, US-009, US-010)
   - Visibility controls
   - Bridge integration

5. **Phase 5: Enhancement** (US-011, US-012, US-013)
   - CrUX integration
   - Scheduled audits
   - Alerts
