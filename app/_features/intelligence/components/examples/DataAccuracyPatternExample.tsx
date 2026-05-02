"use client";

/**
 * DataAccuracyPatternExample
 *
 * Example showing how to use the research-backed data accuracy patterns
 * in an ambient intelligence panel. This serves as a reference implementation.
 *
 * Key patterns demonstrated:
 * 1. Data Provenance - Show where every metric comes from
 * 2. AI Disclosure - Clearly label AI-generated content
 * 3. Three-Layer Model - Glance → Explain → Deep-dive
 * 4. Freshness Indicators - Show when data was last updated
 * 5. Confidence Levels - Indicate AI certainty
 */

import * as React from "react";
import { DollarSign, Users, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Separator } from "@repo/ui";

// Import all the data accuracy components
import {
  // Data Provenance
  InlineProvenance,
  CompactProvenance,
  ExpandableProvenance,
  ProvenanceCard,
  // AI Disclosure
  AIBadge,
  AIDisclosureText,
  ConfidenceIndicator,
  AIInsightCard,
  AISectionHeader,
  // Freshness
  FreshnessIndicator,
  // Existing components
  MetricWithExplanation,
} from "../index";

import type { DataSource } from "../../types/ambient-intelligence";

// ============================================================================
// Example Data (Would come from generators in production)
// ============================================================================

const exampleDataSource: DataSource = {
  table: "portal_invoices",
  computation: "SUM(amount_cents) WHERE status = 'paid' AND created_at > NOW() - INTERVAL '30 days'",
  computedAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
  entityIds: ["inv-001", "inv-002", "inv-003"],
};

const staleDataSource: DataSource = {
  table: "clients",
  computation: "COUNT(*) WHERE status = 'active'",
  computedAt: new Date(Date.now() - 1000 * 60 * 60 * 48), // 48 hours ago
};

// ============================================================================
// Example Component
// ============================================================================

export function DataAccuracyPatternExample() {
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 2000);
  };

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-lg font-semibold">Data Accuracy Patterns</h2>
      <p className="text-sm text-muted-foreground">
        Research-backed patterns for displaying accurate, trustworthy data.
      </p>

      {/* ================================================================== */}
      {/* SECTION 1: Data Provenance Indicators */}
      {/* ================================================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Data Provenance</CardTitle>
          <p className="text-xs text-muted-foreground">
            Show where every metric comes from (anti-hallucination pattern)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Inline Provenance */}
          <div>
            <div className="text-sm font-medium mb-2">Inline (for tight spaces)</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">$12,400</span>
              <InlineProvenance dataSource={exampleDataSource} />
            </div>
          </div>

          <Separator />

          {/* Compact Provenance */}
          <div>
            <div className="text-sm font-medium mb-2">Compact (for card footers)</div>
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="text-lg font-semibold">Monthly Revenue</div>
              <div className="text-2xl font-bold">$12,400</div>
              <CompactProvenance dataSource={exampleDataSource} className="mt-2" />
            </div>
          </div>

          <Separator />

          {/* Expandable Provenance */}
          <div>
            <div className="text-sm font-medium mb-2">Expandable (for detail views)</div>
            <ExpandableProvenance dataSource={exampleDataSource} />
          </div>

          <Separator />

          {/* Full Provenance Card */}
          <div>
            <div className="text-sm font-medium mb-2">Full Card (for deep-dive sheets)</div>
            <ProvenanceCard dataSource={exampleDataSource} />
          </div>
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* SECTION 2: AI Disclosure Labels */}
      {/* ================================================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. AI Disclosure</CardTitle>
          <p className="text-xs text-muted-foreground">
            Clearly label AI-generated content (trust pattern)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* AI Badges */}
          <div>
            <div className="text-sm font-medium mb-2">AI Badges</div>
            <div className="flex flex-wrap gap-2">
              <AIBadge action="summarized" />
              <AIBadge action="analyzed" />
              <AIBadge action="generated" />
              <AIBadge action="suggested" />
              <AIBadge action="predicted" />
            </div>
          </div>

          <Separator />

          {/* Confidence Indicators */}
          <div>
            <div className="text-sm font-medium mb-2">Confidence Levels</div>
            <div className="flex flex-wrap gap-4">
              <ConfidenceIndicator confidence="high" />
              <ConfidenceIndicator confidence="medium" />
              <ConfidenceIndicator confidence="low" />
            </div>
          </div>

          <Separator />

          {/* AI Disclosure Text */}
          <div>
            <div className="text-sm font-medium mb-2">Disclosure Text</div>
            <AIDisclosureText
              sources={["portal_invoices", "clients"]}
              context="Analysis based on last 30 days of activity"
            />
          </div>

          <Separator />

          {/* AI Section Header */}
          <div>
            <div className="text-sm font-medium mb-2">Section Header</div>
            <AISectionHeader
              title="AI Insights"
              description="Generated from your actual business data"
            />
            <p className="text-sm text-muted-foreground">
              (Section content would go here)
            </p>
          </div>

          <Separator />

          {/* Full AI Insight Card */}
          <div>
            <div className="text-sm font-medium mb-2">AI Insight Card</div>
            <AIInsightCard
              insight="Revenue increased 12% this month, primarily driven by 2 new retainer clients. Consider reaching out to similar prospects in your pipeline."
              action="analyzed"
              confidence="high"
              dataSource={exampleDataSource}
              supportingData={[
                { label: "New clients", value: "2" },
                { label: "Revenue increase", value: "+$1,340" },
                { label: "Pipeline prospects", value: "5" },
              ]}
              actionButton={{
                label: "View pipeline",
                href: "/studio/pipeline",
              }}
            />
          </div>

          {/* Compact AI Insight */}
          <div>
            <div className="text-sm font-medium mb-2">Compact Variant</div>
            <AIInsightCard
              insight="2 clients are showing signs of churn risk based on reduced engagement."
              action="predicted"
              confidence="medium"
              compact
            />
          </div>
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* SECTION 3: Freshness Indicators */}
      {/* ================================================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. Freshness Indicators</CardTitle>
          <p className="text-xs text-muted-foreground">
            Show when data was last updated
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Inline (Fresh) */}
          <div>
            <div className="text-sm font-medium mb-2">Inline - Fresh (30m ago)</div>
            <div className="flex items-center gap-2">
              <span>Active Clients: 24</span>
              <FreshnessIndicator
                computedAt={exampleDataSource.computedAt}
                variant="inline"
              />
            </div>
          </div>

          <Separator />

          {/* Inline (Stale) */}
          <div>
            <div className="text-sm font-medium mb-2">Inline - Stale (48h ago)</div>
            <div className="flex items-center gap-2">
              <span>Active Clients: 24</span>
              <FreshnessIndicator
                computedAt={staleDataSource.computedAt}
                variant="inline"
              />
            </div>
          </div>

          <Separator />

          {/* Badge Variant */}
          <div>
            <div className="text-sm font-medium mb-2">Badge (with refresh)</div>
            <FreshnessIndicator
              computedAt={exampleDataSource.computedAt}
              variant="badge"
              showRefresh
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
            />
          </div>

          <Separator />

          {/* Detailed Variant */}
          <div>
            <div className="text-sm font-medium mb-2">Detailed (for stale data)</div>
            <FreshnessIndicator
              computedAt={staleDataSource.computedAt}
              variant="detailed"
              showRefresh
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
            />
          </div>
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* SECTION 4: Complete Example (Three-Layer Model) */}
      {/* ================================================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">4. Complete Example</CardTitle>
          <p className="text-xs text-muted-foreground">
            Combining all patterns in the three-layer interaction model
          </p>
        </CardHeader>
        <CardContent>
          <MetricWithExplanation
            label="Monthly Revenue"
            value="$12.4k"
            rawValue={12400}
            sentiment="positive"
            dataSource={exampleDataSource}
            meaning={{
              plainEnglish: "Your revenue increased 12% compared to last month.",
              whyItMatters: "This growth is driven by 2 new retainer clients, indicating strong client acquisition.",
              benchmark: {
                value: 10000,
                source: "user_historical",
                label: "Your average",
                comparison: "above",
              },
            }}
            sparkline={{
              values: [8500, 9200, 9800, 10500, 11200, 12400],
              direction: "up",
              changePercent: 12,
            }}
            action={{
              label: "View revenue details",
              href: "/studio/insights/revenue",
              urgency: "low",
              icon: "DollarSign",
            }}
            icon={<DollarSign className="h-4 w-4" />}
          />
          <p className="text-xs text-muted-foreground mt-3">
            ↑ Hover to see explanation (Layer 2), click to open deep-dive (Layer 3)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default DataAccuracyPatternExample;
