"use client";

import * as React from "react";
import Link from "next/link";
import {
  Network,
  Sparkles,
  Search,
  Compass,
  ArrowRight,
  User as UserIcon,
  Building2,
  Briefcase,
  Users,
  AlertCircle,
  Filter,
  X,
  PanelRightClose,
  PanelRightOpen,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Shield,
  Heart,
} from "lucide-react";
import { Button, Card, AIButton } from "@repo/ui";
import { PageBanner } from "@repo/patterns";
import { cn } from "@repo/utils";
import {
  InteractiveGraph,
  type InsightOverlay,
  type Filters,
  type RelationshipType,
  type EntityStatus,
} from "./InteractiveGraph";

/**
 * Connections page (/connections).
 *
 * The "mouth of the relationship intelligence funnel." Shows the
 * graph of who knows whom and AI-derived insights about your network.
 *
 * Insights and Graph share state: clicking an Insight card switches
 * to Graph tab and highlights the relevant subgraph. A toggle lets
 * users overlay insight badges directly on the graph.
 */

type Tab = "graph" | "insights" | "paths" | "find";

type InsightKind =
  | "hub"
  | "underused"
  | "warm_path"
  | "common_neighbors"
  | "risk"
  | "growth";


type Insight = {
  id: string;
  kind: InsightKind;
  icon: typeof Compass;
  headline: string;
  evidence: string;
  hint: string;
  /** Dollar impact estimate, if applicable */
  impact?: string;
  entityIds: string[];
  /** Prefilled prompt for "Take action" → Ask SALT */
  actionPrompt: string;
};

const INSIGHTS: Insight[] = [
  {
    id: "ins_referral_champion",
    kind: "hub",
    icon: Users,
    headline: "Sarah is your top referral champion",
    evidence: "3 client wins via her in the last year — Helios, Flux, and Northwind.",
    hint: "Worth asking for 1-2 more this quarter.",
    impact: "Avg referral = $14k LTV",
    entityIds: ["sarah", "helios", "flux", "northwind", "you"],
    actionPrompt: "Draft a referral ask to Sarah Chen, warm and specific",
  },
  {
    id: "ins_renewal_risk",
    kind: "risk",
    icon: AlertCircle,
    headline: "Acme renewal at risk",
    evidence:
      "Renewal in 14 days. Sentiment trending negative in last 3 messages — Sarah's been short.",
    hint: "Schedule a check-in before next Friday.",
    impact: "$12.5k MRR at risk",
    entityIds: ["acme", "sarah"],
    actionPrompt:
      "Draft a relationship check-in to Sarah Chen at Acme — open, no agenda, warm",
  },
  {
    id: "ins_upsell_signal",
    kind: "growth",
    icon: Sparkles,
    headline: "Beta is ready for a bigger engagement",
    evidence: "Mike mentioned 'brand refresh' 3× in the last month.",
    hint: "Propose a scoped brand engagement before renewal.",
    impact: "+$10-25k one-time",
    entityIds: ["beta", "mike", "series_a"],
    actionPrompt:
      "Draft a brand-refresh proposal pitch to Mike Hart at Beta Inc",
  },
  {
    id: "ins_topic_pattern",
    kind: "common_neighbors",
    icon: Building2,
    headline: "Rebrand work is in demand",
    evidence:
      "3 clients mentioned 'rebrand' this quarter (Acme, Helios, Beta).",
    hint: "Productize this — 40% premium over one-offs historically.",
    impact: "Pricing power",
    entityIds: ["acme", "helios", "beta"],
    actionPrompt:
      "Draft a productized 'Rebrand Sprint' service description with pricing",
  },
  {
    id: "ins_reengage_window",
    kind: "underused",
    icon: ArrowRight,
    headline: "Marcus's re-engage window is closing",
    evidence:
      "Quiet 92 days. Past clients re-engaged within 90d convert at 60%.",
    hint: "One touch this week could revive the relationship.",
    impact: "Potential $8-15k",
    entityIds: ["marcus", "northwind"],
    actionPrompt:
      "Draft a re-engagement message to Marcus Webb at Northwind — light, no ask, reference our 2025 site refresh project",
  },
  {
    id: "ins_coverage_risk",
    kind: "risk",
    icon: AlertCircle,
    headline: "Single-contact dependency at Flux",
    evidence:
      "$8k MRR but only David Kim is a known contact. If he leaves, you lose the relationship.",
    hint: "Ask David to loop in a teammate on the next call.",
    impact: "$8k MRR exposure",
    entityIds: ["flux", "david"],
    actionPrompt:
      "Draft a message to David Kim asking who else from his team should be looped in",
  },
];

const DEFAULT_FILTERS: Filters = {
  people: true,
  organizations: true,
  projects: true,
  relationships: {
    revenue: true,
    collaboration: true,
    support: true,
    internal: true,
  },
  statuses: {
    active: true,
    potential: true,
    attention: true,
  },
};

export function ConnectionsPage() {
  const [tab, setTab] = React.useState<Tab>("graph");
  const [filters, setFilters] = React.useState<Filters>(DEFAULT_FILTERS);
  const [activeInsightId, setActiveInsightId] = React.useState<string | null>(
    null
  );

  // Hover state from graph pin → temporary highlight (separate from sticky active)
  const [hoveredInsightId, setHoveredInsightId] = React.useState<string | null>(
    null
  );

  const activeInsight = activeInsightId
    ? INSIGHTS.find((i) => i.id === activeInsightId) ?? null
    : null;
  const hoveredInsight = hoveredInsightId
    ? INSIGHTS.find((i) => i.id === hoveredInsightId) ?? null
    : null;
  const effectiveInsight = activeInsight ?? hoveredInsight;

  // When an insight is clicked from the Insights tab, jump to Graph + highlight
  const handleInsightClick = (insightId: string) => {
    setActiveInsightId(insightId);
    setTab("graph");
  };

  // Hover an insight card on the right rail → preview highlight on graph
  const handleCardHover = (insightId: string | null) => {
    setHoveredInsightId(insightId);
  };

  // "Take action" on an insight → opens Ask SALT with prefilled prompt
  const handleTakeAction = (insight: Insight) => {
    // Open Ask SALT modal with prefilled prompt by triggering the global event
    // First store the prompt so AskSaltModal can pick it up on open
    try {
      window.sessionStorage.setItem("askSaltPrefill", insight.actionPrompt);
    } catch {
      // ignore storage failures
    }
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
  };

  // Build insight overlay map (entity → highest-priority insight applied)
  const insightOverlay: InsightOverlay[] | null = React.useMemo(() => {
    // Only overlay halos when there's a focused insight (active or hovered)
    if (!effectiveInsight) return null;
    const map = new Map<string, InsightKind>();
    for (const entityId of effectiveInsight.entityIds) {
      if (!map.has(entityId)) {
        map.set(entityId, effectiveInsight.kind);
      }
    }
    return Array.from(map.entries()).map(([entityId, kind]) => ({
      entityId,
      kind,
    }));
  }, [effectiveInsight]);

  // Highlight entities for both hover and click
  const focusEntities = effectiveInsight?.entityIds ?? null;
  // Only zoom on click (activeInsight), not hover
  const shouldZoomToFocus = !!activeInsight;

  // Tabs configuration for PageBanner
  const TABS = [
    { label: "Graph", value: "graph" as const },
    { label: "Insights", value: "insights" as const },
    { label: "Paths", value: "paths" as const },
    { label: "Find", value: "find" as const },
  ];

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* PageBanner header */}
      <div className="px-16 pt-8 shrink-0">
        <PageBanner
          size="hero"
          eyebrow="YOUR NETWORK"
          title="Connections"
          subtitleContent={
            <div className="flex items-center gap-1.5">
              <Network className="size-3.5 text-primary" />
              <span>See how everyone in your world is linked</span>
            </div>
          }
          tabs={TABS}
          activeTab={tab}
          onTabChange={(value) => setTab(value as Tab)}
          fullWidthDivider
          className="!mb-0"
          actions={
            <AIButton size="sm" onClick={triggerAskSalt}>
              <Sparkles className="size-3.5" />
              Ask SALT
            </AIButton>
          }
        />
      </div>

      {tab === "graph" && (
        <GraphView
          filters={filters}
          setFilters={setFilters}
          focusEntities={focusEntities}
          insightOverlay={insightOverlay}
          shouldZoomToFocus={shouldZoomToFocus}
          onInsightHover={handleCardHover}
          onInsightClick={handleInsightClick}
          onTakeAction={handleTakeAction}
          activeInsightId={activeInsightId}
        />
      )}
      {tab === "insights" && (
        <InsightsView
          activeInsightId={activeInsightId}
          onInsightClick={(id) => {
            setActiveInsightId(id);
            setTab("graph");
          }}
          onTakeAction={handleTakeAction}
        />
      )}
      {tab === "paths" && <PathsPlaceholder />}
      {tab === "find" && <FindPlaceholder />}
    </div>
  );
}

// ============================================================================
// GRAPH VIEW
// ============================================================================

function GraphView({
  filters,
  setFilters,
  focusEntities,
  insightOverlay,
  shouldZoomToFocus,
  onInsightHover,
  onInsightClick,
  onTakeAction,
  activeInsightId,
}: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  focusEntities: string[] | null;
  insightOverlay: InsightOverlay[] | null;
  shouldZoomToFocus?: boolean;
  onInsightHover?: (id: string | null) => void;
  onInsightClick?: (id: string) => void;
  onTakeAction?: (insight: Insight) => void;
  activeInsightId?: string | null;
}) {
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [simpleMode, setSimpleMode] = React.useState(false);

  return (
    <div className="relative flex-1 min-h-0">
      {/* Full-width graph container - edge to edge, flush with tabs */}
      <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-muted/20 to-transparent">
        {/* Graph canvas - full width */}
        <div className="absolute inset-0">
          <InteractiveGraph
            filters={filters}
            focusEntities={focusEntities}
            insightOverlay={insightOverlay}
            shouldZoomToFocus={shouldZoomToFocus}
            simpleMode={simpleMode}
          />
        </div>

        {/* Bottom-left: Filter button + Legend card */}
        <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2">
          {/* Filter panel opens upward */}
          {filterOpen && (
            <FilterPanelMono
              filters={filters}
              setFilters={setFilters}
              simpleMode={simpleMode}
              setSimpleMode={setSimpleMode}
              onClose={() => setFilterOpen(false)}
            />
          )}

          {/* Filter button - mono styling, self-sizing */}
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            className={cn(
              "self-start inline-flex items-center gap-1.5 px-2 py-1 font-mono text-[9px] uppercase tracking-wider",
              "bg-card/90 backdrop-blur-sm border border-border rounded-md",
              "text-muted-foreground/70 hover:text-foreground transition-colors",
              filterOpen && "text-foreground"
            )}
          >
            <Filter className="size-2.5" />
            <span>Filter</span>
            {filterOpen ? (
              <ChevronDown className="size-2.5 opacity-50" />
            ) : (
              <ChevronUp className="size-2.5 opacity-50" />
            )}
          </button>

          {/* Legend card - always visible */}
          <PersistentLegend />
        </div>

        {/* Bottom-right: Floating insight cards */}
        <FloatingInsightStack
          insights={INSIGHTS}
          activeInsightId={activeInsightId}
          onHover={onInsightHover}
          onClick={onInsightClick}
          onTakeAction={onTakeAction}
        />
      </div>
    </div>
  );
}

// ============================================================================
// FLOATING INSIGHT STACK (bottom-right, animates from below)
// ============================================================================

/** Categories for insight cards following DESIGN.md */
type InsightCategory = "grow" | "protect" | "nurture";

const INSIGHT_CATEGORIES: Record<InsightKind, InsightCategory> = {
  hub: "grow",
  growth: "grow",
  warm_path: "grow",
  risk: "protect",
  underused: "nurture",
  common_neighbors: "grow",
};

const CATEGORY_ICONS: Record<InsightCategory, typeof TrendingUp> = {
  grow: TrendingUp,
  protect: Shield,
  nurture: Heart,
};

function FloatingInsightStack({
  insights,
  activeInsightId,
  onHover,
  onClick,
  onTakeAction,
}: {
  insights: Insight[];
  activeInsightId?: string | null;
  onHover?: (id: string | null) => void;
  onClick?: (id: string) => void;
  onTakeAction?: (insight: Insight) => void;
}) {
  // Track dismissed insights
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(new Set());

  // Track which cards have appeared and completed their entry animation
  const [appearedIds, setAppearedIds] = React.useState<Set<string>>(new Set());
  const [animatingIds, setAnimatingIds] = React.useState<Set<string>>(new Set());

  // Filter out dismissed insights
  const availableInsights = React.useMemo(
    () => insights.filter((i) => !dismissedIds.has(i.id)),
    [insights, dismissedIds]
  );

  // Max visible cards
  const maxVisible = 3;
  const displayedInsights = availableInsights.slice(0, maxVisible);

  // Stagger card appearances - trigger one card at a time
  React.useEffect(() => {
    const nextCard = displayedInsights.find(
      (i) => !appearedIds.has(i.id) && !animatingIds.has(i.id)
    );

    if (!nextCard) return;

    // Delay before starting next card animation
    // First card after 1s, then 2.5s between each to feel light and readable
    const delay = appearedIds.size === 0 ? 1000 : 2500;

    const timeout = setTimeout(() => {
      // First: add to animating (renders off-screen)
      setAnimatingIds((prev) => new Set([...prev, nextCard.id]));

      // After a frame, move to appeared (triggers the slide-up transition)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimatingIds((prev) => {
            const next = new Set(prev);
            next.delete(nextCard.id);
            return next;
          });
          setAppearedIds((prev) => new Set([...prev, nextCard.id]));
        });
      });
    }, delay);

    return () => clearTimeout(timeout);
  }, [displayedInsights, appearedIds, animatingIds]);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
    setAppearedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Only render cards that have started appearing
  const visibleInsights = displayedInsights.filter(
    (i) => appearedIds.has(i.id) || animatingIds.has(i.id)
  );

  // Refs to measure actual card heights
  const cardRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());
  const [cardHeights, setCardHeights] = React.useState<Map<string, number>>(new Map());

  // Measure card heights after render
  React.useLayoutEffect(() => {
    const newHeights = new Map<string, number>();
    cardRefs.current.forEach((el, id) => {
      if (el) {
        newHeights.set(id, el.offsetHeight);
      }
    });
    // Only update if heights changed
    const hasChanges = visibleInsights.some(
      (i) => newHeights.get(i.id) !== cardHeights.get(i.id)
    );
    if (hasChanges) {
      setCardHeights(newHeights);
    }
  }, [visibleInsights, cardHeights]);

  const gap = 10; // Consistent gap between cards

  // Calculate Y offset for each card based on actual heights of cards below it
  const getYOffset = (index: number): number => {
    let offset = 0;
    // Sum heights of all cards below this one (higher index = newer = lower position)
    for (let i = index + 1; i < visibleInsights.length; i++) {
      const height = cardHeights.get(visibleInsights[i].id) || 80; // fallback height
      offset += height + gap;
    }
    return offset;
  };

  if (visibleInsights.length === 0) return null;

  return (
    <div className="absolute bottom-4 right-4 z-20 pointer-events-none" style={{ overflow: "visible" }}>
      {/* Container for absolutely positioned cards */}
      <div className="relative" style={{ width: 288 }}> {/* w-72 = 288px */}
        {visibleInsights.map((insight, index) => {
          const isAnimating = animatingIds.has(insight.id);
          const isActive = insight.id === activeInsightId;
          const category = INSIGHT_CATEGORIES[insight.kind];
          const CategoryIcon = CATEGORY_ICONS[category];

          const yOffset = getYOffset(index);

          // Older cards (lower index) fade slightly
          const cardOpacity = Math.max(0.7, 1 - index * 0.12);

          return (
            <div
              key={insight.id}
              ref={(el) => {
                if (el) cardRefs.current.set(insight.id, el);
              }}
              onMouseEnter={() => onHover?.(insight.id)}
              onMouseLeave={() => onHover?.(null)}
              onClick={() => onClick?.(insight.id)}
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: "100%",
                opacity: isAnimating ? 0 : cardOpacity,
                transform: isAnimating
                  ? `translateY(300px)`
                  : `translateY(-${yOffset}px)`,
                transition: "transform 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s ease-out",
              }}
              className={cn(
                "group rounded-lg p-3 cursor-pointer pointer-events-auto",
                "bg-muted/40 hover:bg-muted/60 backdrop-blur-md",
                "border border-border/40 hover:border-border/70",
                "shadow-sm hover:shadow-md",
                isActive && "ring-1 ring-primary/30 bg-muted/60"
              )}
            >
              <div className="flex items-start gap-2.5">
                {/* Category icon */}
                <div className="flex items-center justify-center size-7 rounded-full bg-foreground/10 text-foreground shrink-0">
                  <CategoryIcon className="size-3.5" />
                </div>

                <div className="flex-1 min-w-0">
                  {/* Header with dismiss */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-[13px] font-normal leading-tight">
                      {insight.headline}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDismiss(insight.id);
                      }}
                      aria-label="Dismiss"
                      className={cn(
                        "shrink-0 text-muted-foreground/40 hover:text-foreground/80 transition-colors",
                        "opacity-0 group-hover:opacity-100 -mt-0.5"
                      )}
                    >
                      <X className="size-3" />
                    </button>
                  </div>

                  {/* Meta text */}
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {insight.impact || insight.hint}
                  </p>

                  {/* Action - appears on hover */}
                  <div className="flex items-center justify-between mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTakeAction?.(insight);
                      }}
                      className="text-[11px] text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Explore →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// FILTER PANEL (mono styling, opens upward)
// ============================================================================

/** Relationship colors from DESIGN.md */
const RELATIONSHIP_COLORS: Record<RelationshipType, string> = {
  revenue: "#c1f8ae",
  collaboration: "#b76dfb",
  support: "#ee794d",
  internal: "#cbcfd8",
};

function FilterPanelMono({
  filters,
  setFilters,
  simpleMode,
  setSimpleMode,
  onClose,
}: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  simpleMode: boolean;
  setSimpleMode: React.Dispatch<React.SetStateAction<boolean>>;
  onClose: () => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 p-3 font-mono text-[10px] text-muted-foreground/70 select-none",
        "bg-card/90 backdrop-blur-sm border border-border rounded-lg shadow-sm",
        "animate-in fade-in slide-in-from-bottom-2 duration-200"
      )}
    >
      {/* View Mode Toggle */}
      <div className="flex items-center gap-3">
        <span className="uppercase tracking-wider text-[8px] text-muted-foreground/50 w-12">View</span>
        <div className="flex items-center gap-1 bg-foreground/5 rounded p-0.5">
          <button
            type="button"
            onClick={() => setSimpleMode(false)}
            className={cn(
              "px-2 py-0.5 rounded text-[9px] transition-all",
              !simpleMode
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Detailed
          </button>
          <button
            type="button"
            onClick={() => setSimpleMode(true)}
            className={cn(
              "px-2 py-0.5 rounded text-[9px] transition-all",
              simpleMode
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Simple
          </button>
        </div>
      </div>

      {/* Detailed mode filters */}
      {!simpleMode && (
        <>
          {/* Entity Types (Shape) */}
          <div className="flex items-center gap-3">
            <span className="uppercase tracking-wider text-[8px] text-muted-foreground/50 w-12">Show</span>
            <div className="flex items-center gap-1">
              <FilterToggle
                active={filters.people}
                onClick={() => setFilters((f) => ({ ...f, people: !f.people }))}
              >
                <LegendShapeMono shape="circle" label="People" />
              </FilterToggle>
              <FilterToggle
                active={filters.organizations}
                onClick={() => setFilters((f) => ({ ...f, organizations: !f.organizations }))}
              >
                <LegendShapeMono shape="square" label="Orgs" />
              </FilterToggle>
              <FilterToggle
                active={filters.projects}
                onClick={() => setFilters((f) => ({ ...f, projects: !f.projects }))}
              >
                <LegendShapeMono shape="diamond" label="Work" />
              </FilterToggle>
            </div>
          </div>

          {/* Relationship Types (Color) */}
          <div className="flex items-center gap-3">
            <span className="uppercase tracking-wider text-[8px] text-muted-foreground/50 w-12">Color</span>
            <div className="flex items-center gap-1">
              <FilterToggle
                active={filters.relationships.revenue}
                onClick={() => toggleRelationship(setFilters, "revenue")}
              >
                <LegendColorMono color={RELATIONSHIP_COLORS.revenue} label="Clients" />
              </FilterToggle>
              <FilterToggle
                active={filters.relationships.collaboration}
                onClick={() => toggleRelationship(setFilters, "collaboration")}
              >
                <LegendColorMono color={RELATIONSHIP_COLORS.collaboration} label="Partners" />
              </FilterToggle>
              <FilterToggle
                active={filters.relationships.support}
                onClick={() => toggleRelationship(setFilters, "support")}
              >
                <LegendColorMono color={RELATIONSHIP_COLORS.support} label="Vendors" />
              </FilterToggle>
              <FilterToggle
                active={filters.relationships.internal}
                onClick={() => toggleRelationship(setFilters, "internal")}
              >
                <LegendColorMono color={RELATIONSHIP_COLORS.internal} label="Team" />
              </FilterToggle>
            </div>
          </div>

          {/* Status (Fill) */}
          <div className="flex items-center gap-3">
            <span className="uppercase tracking-wider text-[8px] text-muted-foreground/50 w-12">Fill</span>
            <div className="flex items-center gap-1">
              <FilterToggle
                active={filters.statuses.active}
                onClick={() => toggleStatus(setFilters, "active")}
              >
                <LegendFillMono fill="solid" label="Active" />
              </FilterToggle>
              <FilterToggle
                active={filters.statuses.potential}
                onClick={() => toggleStatus(setFilters, "potential")}
              >
                <LegendFillMono fill="hollow" label="Potential" />
              </FilterToggle>
              <FilterToggle
                active={filters.statuses.attention}
                onClick={() => toggleStatus(setFilters, "attention")}
              >
                <LegendFillMono fill="ring" label="Attention" />
              </FilterToggle>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FilterToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-1.5 py-0.5 rounded transition-all",
        active
          ? "bg-foreground/10 text-foreground"
          : "opacity-40 hover:opacity-70 hover:bg-foreground/5 line-through decoration-muted-foreground/30"
      )}
    >
      {children}
    </button>
  );
}

// ============================================================================
// PERSISTENT LEGEND (always visible, mono styling)
// ============================================================================

function PersistentLegend() {
  return (
    <div className="flex flex-col gap-2.5 p-3 font-mono text-[10px] text-muted-foreground/70 select-none bg-card/90 backdrop-blur-sm border border-border rounded-lg shadow-sm">
      {/* Title */}
      <span className="uppercase tracking-wider text-[9px] text-muted-foreground/60 font-medium">Legend</span>

      {/* Shape = What */}
      <div className="flex items-center gap-3">
        <span className="uppercase tracking-wider text-[8px] text-muted-foreground/50 w-12">Shape</span>
        <div className="flex items-center gap-2.5">
          <LegendShapeMono shape="circle" label="People" />
          <LegendShapeMono shape="square" label="Orgs" />
          <LegendShapeMono shape="diamond" label="Work" />
          <LegendShapeMono shape="pentagon" label="You" />
        </div>
      </div>

      {/* Color = Relationship */}
      <div className="flex items-center gap-3">
        <span className="uppercase tracking-wider text-[8px] text-muted-foreground/50 w-12">Color</span>
        <div className="flex items-center gap-2.5">
          <LegendColorMono color="#c1f8ae" label="Clients" />
          <LegendColorMono color="#b76dfb" label="Partners" />
          <LegendColorMono color="#ee794d" label="Vendors" />
          <LegendColorMono color="#cbcfd8" label="Team" />
        </div>
      </div>

      {/* Fill = Status */}
      <div className="flex items-center gap-3">
        <span className="uppercase tracking-wider text-[8px] text-muted-foreground/50 w-12">Fill</span>
        <div className="flex items-center gap-2.5">
          <LegendFillMono fill="solid" label="Active" />
          <LegendFillMono fill="hollow" label="Potential" />
          <LegendFillMono fill="ring" label="Attention" />
        </div>
      </div>

      {/* Size = Importance */}
      <div className="flex items-center gap-3">
        <span className="uppercase tracking-wider text-[8px] text-muted-foreground/50 w-12">Size</span>
        <span>Bigger = more important</span>
      </div>
    </div>
  );
}

function LegendShapeMono({ shape, label }: { shape: "circle" | "square" | "diamond" | "pentagon"; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <svg width="8" height="8" viewBox="0 0 8 8" className="shrink-0 opacity-60">
        {shape === "circle" && <circle cx="4" cy="4" r="3" fill="currentColor" />}
        {shape === "square" && <rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor" />}
        {shape === "diamond" && <polygon points="4,0.5 7.5,4 4,7.5 0.5,4" fill="currentColor" />}
        {shape === "pentagon" && <polygon points="4,0.5 7.3,2.8 6,7 2,7 0.7,2.8" fill="currentColor" />}
      </svg>
      <span>{label}</span>
    </div>
  );
}

function LegendColorMono({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span
        className="size-2 rounded-[2px]"
        style={{ backgroundColor: color }}
      />
      <span>{label}</span>
    </div>
  );
}

function LegendFillMono({ fill, label }: { fill: "solid" | "hollow" | "ring"; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <svg width="8" height="8" viewBox="0 0 8 8" className="shrink-0">
        {fill === "solid" && <circle cx="4" cy="4" r="3" fill="currentColor" className="opacity-60" />}
        {fill === "hollow" && <circle cx="4" cy="4" r="2.5" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-60" />}
        {fill === "ring" && (
          <>
            <circle cx="4" cy="4" r="2" fill="currentColor" className="opacity-40" />
            <circle cx="4" cy="4" r="3.5" fill="none" stroke="currentColor" strokeWidth="0.8" className="opacity-60" />
          </>
        )}
      </svg>
      <span>{label}</span>
    </div>
  );
}

function LegendSizeMono({ size, label }: { size: "small" | "medium" | "large"; label: string }) {
  const r = size === "small" ? 1.5 : size === "medium" ? 2.5 : 3.5;
  return (
    <div className="flex items-center gap-1">
      <svg width="8" height="8" viewBox="0 0 8 8" className="shrink-0 opacity-60">
        <circle cx="4" cy="4" r={r} fill="currentColor" />
      </svg>
      <span>{label}</span>
    </div>
  );
}

// ============================================================================
// NOTIFICATION-STYLE INSIGHT CARD (floating bottom-right)
// ============================================================================

function NotificationInsightCard({
  insight,
  isActive,
  animationDelay,
  onMouseEnter,
  onMouseLeave,
  onClickBody,
  onTakeAction,
  onDismiss,
}: {
  insight: Insight;
  isActive: boolean;
  animationDelay: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClickBody: () => void;
  onTakeAction: () => void;
  onDismiss: () => void;
}) {
  const Icon = insight.icon;
  const style = insightKindStyle(insight.kind);
  const [dragX, setDragX] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const dragStartX = React.useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    dragStartX.current = e.clientX;
    setDragging(true);
  };
  React.useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartX.current;
      setDragX(Math.max(0, dx));
    };
    const handleUp = () => {
      setDragging(false);
      if (dragX > 120) {
        onDismiss();
      } else {
        setDragX(0);
      }
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragging, dragX, onDismiss]);

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={handleMouseDown}
      onClick={() => {
        if (dragX === 0) onClickBody();
      }}
      style={{
        animationDelay: `${animationDelay}ms`,
        transform: `translateX(${dragX}px)`,
        opacity: dragX > 0 ? Math.max(0, 1 - dragX / 200) : 1,
        transition: dragging ? "none" : "transform 0.18s, opacity 0.18s",
      }}
      className={cn(
        "group relative rounded-2xl p-3 cursor-pointer pointer-events-auto select-none",
        "bg-background/85 backdrop-blur-md",
        "border border-border/70 shadow-xl",
        "hover:shadow-2xl hover:-translate-y-0.5",
        "animate-in fade-in slide-in-from-right-4 duration-300 fill-mode-both",
        isActive && "ring-1 ring-primary/30"
      )}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            "flex items-center justify-center size-7 rounded-md shrink-0",
            style.bg,
            style.fg
          )}
        >
          <Icon className="size-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <p className="text-sm font-semibold leading-tight">
              {insight.headline}
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              aria-label="Dismiss"
              className={cn(
                "shrink-0 text-muted-foreground/40 hover:text-foreground/80 transition-colors",
                "opacity-0 group-hover:opacity-100"
              )}
            >
              <X className="size-3" />
            </button>
          </div>
          {insight.impact && (
            <p className="text-[10px] font-medium text-foreground/60 uppercase tracking-wide mb-1">
              {insight.impact}
            </p>
          )}
          <p className="text-xs text-muted-foreground leading-snug mb-1">
            {insight.evidence}
          </p>
          <p className="text-xs leading-snug mb-2.5">
            <Sparkles className="inline size-2.5 text-primary mr-1 -translate-y-px" />
            {insight.hint}
          </p>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTakeAction();
              }}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium",
                "bg-foreground text-background hover:opacity-90 transition-opacity"
              )}
            >
              <Sparkles className="size-3" />
              Take action
            </button>
            <span className="text-[10px] text-muted-foreground group-hover:text-foreground/70 inline-flex items-center gap-0.5 transition-colors">
              Read more
              <ArrowRight className="size-2.5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}


function LegendSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70 mb-1.5">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function LegendShape({ shape, label }: { shape: "circle" | "square" | "diamond" | "pentagon"; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0">
        {shape === "circle" && (
          <circle cx="7" cy="7" r="5" fill="#9ca3af" />
        )}
        {shape === "square" && (
          <rect x="2" y="2" width="10" height="10" rx="2" fill="#9ca3af" />
        )}
        {shape === "diamond" && (
          <polygon points="7,1 13,7 7,13 1,7" fill="#9ca3af" />
        )}
        {shape === "pentagon" && (
          <polygon points="7,1 12.5,4.5 10.5,11 3.5,11 1.5,4.5" fill="#9ca3af" />
        )}
      </svg>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function LegendColor({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span
        className="inline-block size-3 rounded-[3px]"
        style={{ backgroundColor: color }}
      />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function LegendFill({ fill, label }: { fill: "solid" | "hollow" | "ring"; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0">
        {fill === "solid" && (
          <circle cx="7" cy="7" r="5" fill="#9ca3af" />
        )}
        {fill === "hollow" && (
          <circle cx="7" cy="7" r="4" fill="none" stroke="#9ca3af" strokeWidth="2" />
        )}
        {fill === "ring" && (
          <>
            <circle cx="7" cy="7" r="4" fill="#9ca3af" />
            <circle cx="7" cy="7" r="6" fill="none" stroke="#27251e" strokeWidth="1.5" />
          </>
        )}
      </svg>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function LegendSize({ size, label }: { size: "small" | "medium" | "large"; label: string }) {
  const r = size === "small" ? 3 : size === "medium" ? 4.5 : 6;
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0">
        <circle cx="7" cy="7" r={r} fill="#9ca3af" />
      </svg>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

// Filter chip for entity type (shape indicator)
function ShapeChip({
  active,
  shape,
  onClick,
  children,
}: {
  active: boolean;
  shape: "circle" | "square" | "diamond";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono uppercase tracking-wider transition-all border rounded-md",
        active
          ? "bg-foreground/5 text-foreground border-border"
          : "bg-transparent text-muted-foreground/60 border-transparent hover:text-foreground"
      )}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" className="shrink-0">
        {shape === "circle" && (
          <circle cx="5" cy="5" r="4" fill={active ? "#27251e" : "#9ca3af"} />
        )}
        {shape === "square" && (
          <rect x="1" y="1" width="8" height="8" rx="1.5" fill={active ? "#27251e" : "#9ca3af"} />
        )}
        {shape === "diamond" && (
          <polygon points="5,0 10,5 5,10 0,5" fill={active ? "#27251e" : "#9ca3af"} />
        )}
      </svg>
      {children}
    </button>
  );
}

// Filter chip for relationship type (color dot indicator)
function RelationshipChip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono uppercase tracking-wider transition-all border rounded-md",
        active
          ? "bg-foreground/5 text-foreground border-border"
          : "bg-transparent text-muted-foreground/60 border-transparent hover:text-foreground"
      )}
    >
      <span
        className="size-2.5 rounded-[3px] transition-opacity"
        style={{
          backgroundColor: color,
          opacity: active ? 1 : 0.4,
        }}
      />
      {children}
    </button>
  );
}

// Filter chip for status (fill indicator: solid/hollow/ring)
function FillChip({
  active,
  fill,
  onClick,
  children,
}: {
  active: boolean;
  fill: "solid" | "hollow" | "ring";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono uppercase tracking-wider transition-all border rounded-md",
        active
          ? "bg-foreground/5 text-foreground border-border"
          : "bg-transparent text-muted-foreground/60 border-transparent hover:text-foreground"
      )}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" className="shrink-0" style={{ opacity: active ? 1 : 0.4 }}>
        {fill === "solid" && (
          <circle cx="5" cy="5" r="4" fill="#27251e" />
        )}
        {fill === "hollow" && (
          <circle cx="5" cy="5" r="3" fill="none" stroke="#27251e" strokeWidth="1.5" />
        )}
        {fill === "ring" && (
          <>
            <circle cx="5" cy="5" r="2.5" fill="#9ca3af" />
            <circle cx="5" cy="5" r="4" fill="none" stroke="#27251e" strokeWidth="1" />
          </>
        )}
      </svg>
      {children}
    </button>
  );
}

function toggleRelationship(
  setFilters: React.Dispatch<React.SetStateAction<Filters>>,
  relationship: RelationshipType
) {
  setFilters((f) => ({
    ...f,
    relationships: {
      ...f.relationships,
      [relationship]: !f.relationships[relationship],
    },
  }));
}

function toggleStatus(
  setFilters: React.Dispatch<React.SetStateAction<Filters>>,
  status: EntityStatus
) {
  setFilters((f) => ({
    ...f,
    statuses: {
      ...f.statuses,
      [status]: !f.statuses[status],
    },
  }));
}

// ============================================================================
// INSIGHTS VIEW
// ============================================================================

function InsightsView({
  activeInsightId,
  onInsightClick,
  onTakeAction,
}: {
  activeInsightId: string | null;
  onInsightClick: (id: string) => void;
  onTakeAction: (insight: Insight) => void;
}) {
  return (
    <div className="px-16 pb-6 flex-1 overflow-y-auto">
      <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
        <Sparkles className="size-3 text-primary" />
        <span>
          AI-derived patterns from your graph and conversations — revenue, risk,
          and opportunities. Hover a card to see the source on the graph.
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {INSIGHTS.map((insight) => {
          const Icon = insight.icon;
          const active = insight.id === activeInsightId;
          const style = insightKindStyle(insight.kind);
          return (
            <div
              key={insight.id}
              className={cn(
                "rounded-xl border p-4 transition-all",
                active
                  ? "border-primary/40 bg-primary/[0.04] shadow-sm"
                  : "border-border/60 bg-card hover:border-foreground/20 hover:shadow-sm"
              )}
            >
              <button
                type="button"
                onClick={() => onInsightClick(insight.id)}
                className="w-full text-left mb-3"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex items-center justify-center size-8 rounded-md shrink-0",
                      style.bg,
                      style.fg
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight mb-1">
                      {insight.headline}
                    </p>
                    {insight.impact && (
                      <p className="text-[10px] font-medium text-foreground/60 uppercase tracking-wide mb-1.5">
                        {insight.impact}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {insight.evidence}
                    </p>
                    <p className="text-xs leading-relaxed mt-1">
                      <Sparkles className="inline size-2.5 text-primary mr-1 -translate-y-px" />
                      {insight.hint}
                    </p>
                  </div>
                </div>
              </button>
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => onTakeAction(insight)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-foreground text-background hover:opacity-90 transition-opacity"
                >
                  <Sparkles className="size-3" />
                  Take action
                </button>
                <button
                  type="button"
                  onClick={() => onInsightClick(insight.id)}
                  className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
                >
                  <Network className="size-2.5" />
                  Show on graph
                  <ArrowRight className="size-2.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function insightKindStyle(_kind: InsightKind): {
  bg: string;
  fg: string;
  ring: string;
} {
  // Monochrome: all insights use neutral styling
  // Icons (TrendingUp, Shield, Heart, etc.) differentiate categories
  // This keeps graph relationship colors unambiguous
  return {
    bg: "bg-foreground/10",
    fg: "text-foreground",
    ring: "ring-foreground/20",
  };
}

// Hex colors for canvas rendering (used by InteractiveGraph)
// Monochrome to keep graph relationship colors unambiguous
export function insightKindHex(_kind: InsightKind): string {
  return "#27251e"; // foreground color - all insights same
}

// ============================================================================
// PLACEHOLDERS
// ============================================================================

function PathsPlaceholder() {
  return (
    <div className="px-16 pb-6 flex-1">
    <Card className="p-12 text-center">
      <Compass className="size-8 text-muted-foreground/40 mx-auto mb-3" />
      <p className="text-sm font-medium mb-1">Paths</p>
      <p className="text-xs text-muted-foreground max-w-md mx-auto">
        Trace the shortest path between any two entities in your network —
        "How am I connected to Mike at Beta?"
      </p>
      <AIButton
        size="sm"
        className="mt-4"
        onClick={triggerAskSalt}
      >
        <Sparkles className="size-3.5" />
        Try via Ask SALT
      </AIButton>
    </Card>
    </div>
  );
}

function FindPlaceholder() {
  return (
    <div className="px-16 pb-6 flex-1">
    <Card className="p-12 text-center">
      <Search className="size-8 text-muted-foreground/40 mx-auto mb-3" />
      <p className="text-sm font-medium mb-1">Find</p>
      <p className="text-xs text-muted-foreground max-w-md mx-auto">
        Natural-language search across your network — "Who do I know at Acme?",
        "Mutual connections with Jane".
      </p>
      <AIButton
        size="sm"
        className="mt-4"
        onClick={triggerAskSalt}
      >
        <Sparkles className="size-3.5" />
        Try via Ask SALT
      </AIButton>
    </Card>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function triggerAskSalt() {
  const event = new KeyboardEvent("keydown", {
    key: "k",
    metaKey: true,
    bubbles: true,
  });
  window.dispatchEvent(event);
}

// silence unused warnings
void Link;

export type { InsightKind, Insight };
