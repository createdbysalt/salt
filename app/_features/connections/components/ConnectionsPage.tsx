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
  SlidersHorizontal,
  Info,
  X,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { Button, Card, AIButton } from "@repo/ui";
import { cn } from "@repo/utils";
import {
  InteractiveGraph,
  type InsightOverlay,
  type Filters,
  type PersonStatus,
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
  personStatuses: {
    client: true,
    prospect: true,
    past_client: true,
    partner: true,
    vendor: true,
    internal: true,
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

  const focusEntities = effectiveInsight?.entityIds ?? null;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Compact header */}
      <div className="px-12 pt-5 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Network className="size-4 text-primary" />
            <h1 className="text-lg font-semibold tracking-tight">Connections</h1>
            <span className="text-xs text-muted-foreground hidden md:inline">
              · how everyone in your world is linked
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Search className="size-3.5" />
            </Button>
            <AIButton
              variant="icon"
              size="sm"
              onClick={triggerAskSalt}
              title="Ask SALT · ⌘K"
            >
              <Sparkles className="size-3.5" />
            </AIButton>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 -mb-3 border-b border-border">
          <TabButton active={tab === "graph"} onClick={() => setTab("graph")}>
            <Network className="size-3.5" />
            Graph
          </TabButton>
          <TabButton
            active={tab === "insights"}
            onClick={() => setTab("insights")}
          >
            <Sparkles className="size-3.5" />
            Insights
            <span className="text-[10px] text-muted-foreground font-normal">
              ({INSIGHTS.length})
            </span>
          </TabButton>
          <TabButton active={tab === "paths"} onClick={() => setTab("paths")}>
            <Compass className="size-3.5" />
            Paths
          </TabButton>
          <TabButton active={tab === "find"} onClick={() => setTab("find")}>
            <Search className="size-3.5" />
            Find
          </TabButton>
        </div>
      </div>

      {tab === "graph" && (
        <GraphView
          filters={filters}
          setFilters={setFilters}
          focusEntities={focusEntities}
          insightOverlay={insightOverlay}
          insights={INSIGHTS}
          activeInsightId={activeInsightId}
          onCardHover={handleCardHover}
          onCardClick={(id) => {
            setActiveInsightId(id);
            setTab("insights");
          }}
          onTakeAction={handleTakeAction}
          onClearInsight={() => {
            setActiveInsightId(null);
            setHoveredInsightId(null);
          }}
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
// TABS
// ============================================================================

function TabButton({
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
        "relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-foreground" />
      )}
    </button>
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
  insights,
  activeInsightId,
  onCardHover,
  onCardClick,
  onTakeAction,
  onClearInsight,
}: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  focusEntities: string[] | null;
  insightOverlay: InsightOverlay[] | null;
  insights: Insight[];
  activeInsightId: string | null;
  onCardHover: (id: string | null) => void;
  onCardClick: (id: string) => void;
  onTakeAction: (insight: Insight) => void;
  onClearInsight: () => void;
}) {
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [legendOpen, setLegendOpen] = React.useState(false);
  const [showInsights, setShowInsights] = React.useState(true);
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(
    new Set()
  );

  const visibleInsights = insights.filter((i) => !dismissedIds.has(i.id));

  return (
    <div className="relative flex-1 min-h-0 px-12 pb-6">
      <div className="relative h-full w-full rounded-2xl overflow-hidden bg-gradient-to-br from-muted/20 to-transparent border border-border/40">
        {/* Graph canvas — shifts left when the insights panel is visible so the
            graph stays visually centered in the remaining space */}
        <div
          className={cn(
            "absolute inset-0 transition-[right] duration-300 ease-out",
            showInsights && visibleInsights.length > 0
              ? "right-[22.5rem]"
              : "right-0"
          )}
        >
          <InteractiveGraph
            filters={filters}
            focusEntities={focusEntities}
            insightOverlay={insightOverlay}
          />
        </div>

        {/* Top-left toolbar — Filters */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5">
          <FloatingToolButton
            active={filterOpen}
            label="Filters"
            onClick={() => setFilterOpen((v) => !v)}
          >
            <SlidersHorizontal className="size-3.5" />
            <span className="text-xs font-medium">Filters</span>
            {filterOpen ? (
              <X className="size-3 -mr-0.5 opacity-60" />
            ) : null}
          </FloatingToolButton>
        </div>

        {/* Filter panel slides in from the left */}
        {filterOpen && (
          <FilterPanel
            filters={filters}
            setFilters={setFilters}
            onClose={() => setFilterOpen(false)}
          />
        )}

        {/* Top-right toolbar — Show/hide insights, legend, etc */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
          <FloatingToolButton
            active={showInsights}
            label={showInsights ? "Hide insights" : "Show insights"}
            onClick={() => setShowInsights((v) => !v)}
          >
            {showInsights ? (
              <PanelRightClose className="size-3.5" />
            ) : (
              <PanelRightOpen className="size-3.5" />
            )}
            <span className="text-xs font-medium">
              {visibleInsights.length} insight
              {visibleInsights.length === 1 ? "" : "s"}
            </span>
          </FloatingToolButton>
        </div>

        {/* Active insight clear */}
        {activeInsightId && (
          <div className="absolute top-14 left-3 z-20">
            <FloatingToolButton
              active
              label="Clear highlight"
              onClick={onClearInsight}
            >
              <X className="size-3" />
              <span className="text-xs">Clear</span>
            </FloatingToolButton>
          </div>
        )}

        {/* Insight notification stack — floating bottom-right */}
        {showInsights && visibleInsights.length > 0 && (
          <div
            className={cn(
              "absolute bottom-4 right-4 z-20 flex flex-col-reverse gap-2",
              "w-[min(22rem,calc(100vw-3rem))]",
              "max-h-[calc(100%-5rem)] overflow-y-auto pointer-events-none"
            )}
          >
            {visibleInsights.map((insight, idx) => (
              <NotificationInsightCard
                key={insight.id}
                insight={insight}
                isActive={insight.id === activeInsightId}
                animationDelay={idx * 90}
                onMouseEnter={() => onCardHover(insight.id)}
                onMouseLeave={() => onCardHover(null)}
                onClickBody={() => onCardClick(insight.id)}
                onTakeAction={() => onTakeAction(insight)}
                onDismiss={() =>
                  setDismissedIds((s) => new Set(s).add(insight.id))
                }
              />
            ))}
          </div>
        )}

        {/* Bottom-left legend toggle */}
        <div className="absolute bottom-3 left-3 z-20">
          <FloatingToolButton
            active={legendOpen}
            label="Legend"
            onClick={() => setLegendOpen((v) => !v)}
          >
            <Info className="size-3.5" />
            <span className="text-xs font-medium">Legend</span>
          </FloatingToolButton>
          {legendOpen && (
            <FloatingLegend onClose={() => setLegendOpen(false)} />
          )}
        </div>

        {/* Re-show button when all insights are dismissed */}
        {showInsights && visibleInsights.length === 0 && (
          <div className="absolute bottom-4 right-4 z-20">
            <FloatingToolButton
              active={false}
              label="Restore insights"
              onClick={() => setDismissedIds(new Set())}
            >
              <Sparkles className="size-3.5" />
              <span className="text-xs">Restore insights</span>
            </FloatingToolButton>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// FLOATING TOOL BUTTON
// ============================================================================

function FloatingToolButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md transition-all",
        "border backdrop-blur",
        "shadow-sm hover:shadow",
        active
          ? "bg-foreground text-background border-foreground"
          : "bg-background/80 text-foreground hover:bg-background border-border"
      )}
    >
      {children}
    </button>
  );
}

// ============================================================================
// FILTER PANEL (slides in from left)
// ============================================================================

function FilterPanel({
  filters,
  setFilters,
  onClose,
}: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  onClose: () => void;
}) {
  return (
    <div
      className={cn(
        "absolute top-14 left-3 z-20 w-72",
        "rounded-xl border border-border bg-card shadow-lg",
        "animate-in fade-in slide-in-from-left-2 duration-200"
      )}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
        <span className="text-xs font-semibold tracking-tight">Filters</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close filters"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="p-3 space-y-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70 mb-2">
            Show
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <FilterChip
              active={filters.people}
              icon={UserIcon}
              color="pink"
              onClick={() =>
                setFilters((f) => ({ ...f, people: !f.people }))
              }
            >
              People
            </FilterChip>
            <FilterChip
              active={filters.organizations}
              icon={Building2}
              color="blue"
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  organizations: !f.organizations,
                }))
              }
            >
              Orgs
            </FilterChip>
            <FilterChip
              active={filters.projects}
              icon={Briefcase}
              color="indigo"
              onClick={() =>
                setFilters((f) => ({ ...f, projects: !f.projects }))
              }
            >
              Projects
            </FilterChip>
          </div>
        </div>
        {filters.people && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70 mb-2">
              People status
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <StatusChip
                active={filters.personStatuses.client}
                dotClass="bg-success"
                onClick={() => toggleStatus(setFilters, "client")}
              >
                Clients
              </StatusChip>
              <StatusChip
                active={filters.personStatuses.prospect}
                dotClass="bg-info"
                onClick={() => toggleStatus(setFilters, "prospect")}
              >
                Prospects
              </StatusChip>
              <StatusChip
                active={filters.personStatuses.past_client}
                dotClass="bg-muted-foreground"
                onClick={() => toggleStatus(setFilters, "past_client")}
              >
                Past
              </StatusChip>
              <StatusChip
                active={filters.personStatuses.partner}
                dotClass="bg-accent"
                onClick={() => toggleStatus(setFilters, "partner")}
              >
                Partners
              </StatusChip>
              <StatusChip
                active={filters.personStatuses.vendor}
                dotClass="bg-warning"
                onClick={() => toggleStatus(setFilters, "vendor")}
              >
                Vendors
              </StatusChip>
              <StatusChip
                active={filters.personStatuses.internal}
                dotClass="bg-foreground"
                onClick={() => toggleStatus(setFilters, "internal")}
              >
                Team
              </StatusChip>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// FLOATING LEGEND POPOVER
// ============================================================================

function FloatingLegend({ onClose }: { onClose: () => void }) {
  return (
    <div
      className={cn(
        "absolute bottom-9 left-0 z-20 w-72",
        "rounded-xl border border-border bg-card shadow-lg p-3",
        "animate-in fade-in slide-in-from-bottom-1 duration-200"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold tracking-tight">Legend</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close legend"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-3" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <LegendSection title="Nodes">
          <LegendRow color="bg-foreground" label="You" />
          <LegendRow color="bg-accent" label="Person" />
          <LegendRow color="bg-info" label="Org" />
          <LegendRow color="bg-muted-foreground" label="Project" />
        </LegendSection>
        <LegendSection title="Insights">
          <LegendInsight color="var(--warning)" label="Hub" />
          <LegendInsight color="var(--success)" label="Opportunity" />
          <LegendInsight color="var(--destructive)" label="Risk" />
          <LegendInsight color="var(--warning)" label="Re-engage" />
          <LegendInsight color="var(--accent)" label="Pattern" />
        </LegendSection>
      </div>
      <p className="text-[10px] text-muted-foreground/70 mt-3">
        Bigger orgs = higher MRR · red ring = overdue invoices · edge weight =
        recent activity
      </p>
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
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70 mb-2">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={cn("inline-block size-2.5 rounded-full", color)} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function LegendInsight({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className="inline-block px-1.5 py-0.5 rounded-full text-[9px] font-medium"
        style={{
          color,
          backgroundColor: `${color}20`,
          border: `1px solid ${color}50`,
        }}
      >
        ●
      </span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function StatusChip({
  active,
  onClick,
  dotClass,
  children,
}: {
  active: boolean;
  onClick: () => void;
  dotClass: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider transition-all border",
        active
          ? "bg-foreground/5 text-foreground border-border"
          : "bg-transparent text-muted-foreground/60 border-transparent hover:text-foreground"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-[2px] transition-opacity",
          dotClass,
          !active && "opacity-30"
        )}
      />
      {children}
    </button>
  );
}

function toggleStatus(
  setFilters: React.Dispatch<React.SetStateAction<Filters>>,
  status: PersonStatus
) {
  setFilters((f) => ({
    ...f,
    personStatuses: {
      ...f.personStatuses,
      [status]: !f.personStatuses[status],
    },
  }));
}

function FilterChip({
  active,
  onClick,
  icon: Icon,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  color: "pink" | "blue" | "indigo";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono uppercase tracking-wider transition-all border",
        active
          ? color === "pink"
            ? "bg-accent/10 text-accent border-accent/20"
            : color === "blue"
            ? "bg-info/10 text-info border-info/20"
            : "bg-muted text-foreground border-border"
          : "bg-transparent text-muted-foreground border-border hover:text-foreground"
      )}
    >
      <Icon className="size-3" />
      {children}
    </button>
  );
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
    <div>
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

export function insightKindStyle(kind: InsightKind): {
  bg: string;
  fg: string;
  ring: string;
} {
  switch (kind) {
    case "hub":
      return {
        bg: "bg-warning/10",
        fg: "text-warning",
        ring: "ring-warning",
      };
    case "underused":
      return {
        bg: "bg-warning/10",
        fg: "text-warning",
        ring: "ring-warning",
      };
    case "warm_path":
      return {
        bg: "bg-success/10",
        fg: "text-success",
        ring: "ring-success",
      };
    case "common_neighbors":
      return {
        bg: "bg-accent/10",
        fg: "text-accent",
        ring: "ring-accent",
      };
    case "risk":
      return {
        bg: "bg-destructive/10",
        fg: "text-destructive",
        ring: "ring-destructive",
      };
    case "growth":
      return {
        bg: "bg-info/10",
        fg: "text-info",
        ring: "ring-info",
      };
  }
}

// Hex colors for canvas rendering (used by InteractiveGraph)
export function insightKindHex(kind: InsightKind): string {
  switch (kind) {
    case "hub":
      return "#f59e0b"; // amber
    case "underused":
      return "#f97316"; // orange
    case "warm_path":
      return "#10b981"; // emerald
    case "common_neighbors":
      return "#8b5cf6"; // violet
    case "risk":
      return "#ef4444"; // red
    case "growth":
      return "#3b82f6"; // blue
  }
}

// ============================================================================
// PLACEHOLDERS
// ============================================================================

function PathsPlaceholder() {
  return (
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
  );
}

function FindPlaceholder() {
  return (
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
