"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Filter,
  Pin,
  Play,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge, Button, Card, Input, Progress, StatusPill } from "@repo/ui";
import { PageBanner } from "@repo/patterns";
import { cn } from "@repo/utils";
import {
  MOCK_ACTIONS,
  MOCK_PEOPLE,
  MOCK_PROJECTS,
  MOCK_TEAMS,
  type MockProject,
} from "@/app/_lib/demo";

type TableView = "home" | "all" | "pinned" | "detail";
type TableFilter = "all" | "worth_attention" | "pinned" | "active" | "stalled";
type TableTab = "worth_attention" | "tables";

interface TableCommandCenterPageProps {
  view?: TableView;
  tableId?: string;
}

const PINNED_TABLE_IDS = [
  "proj_q3_rebrand",
  "proj_series_a_launch",
  "proj_pricing_redesign",
] as const;

const TABLE_COPY: Record<
  TableView,
  {
    title: string;
    subtitle: string;
  }
> = {
  home: {
    title: "Roundtables",
    subtitle:
      "Everything and everyone around the project: people, AI players, plays, files, decisions, and next moves.",
  },
  all: {
    title: "All Roundtables",
    subtitle:
      "Every client and project workspace you can jump into from this studio.",
  },
  pinned: {
    title: "Pinned Roundtables",
    subtitle:
      "The roundtables that should stay one click away while work is active.",
  },
  detail: {
    title: "Roundtable",
    subtitle:
      "A project command center for the people, players, plays, and artifacts that matter now.",
  },
};

export function TableCommandCenterPage({
  view = "home",
  tableId,
}: TableCommandCenterPageProps) {
  const [activeTab, setActiveTab] = React.useState<TableTab>(
    view === "all" || view === "pinned" ? "tables" : "worth_attention"
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filter, setFilter] = React.useState<TableFilter>(
    view === "pinned" ? "pinned" : "all"
  );
  const selectedProject =
    tableId ? MOCK_PROJECTS.find((project) => project.id === tableId) : undefined;
  const activeView = view === "detail" && !selectedProject ? "home" : view;
  const attentionProjects = React.useMemo(
    () =>
      MOCK_PROJECTS.filter(
        (project) =>
          project.status === "stalled" ||
          project.progress >= 75 ||
          getProjectOutstandingCents(project) > 0
      ),
    []
  );
  const pinnedProjects = React.useMemo(
    () =>
      MOCK_PROJECTS.filter((project) =>
        PINNED_TABLE_IDS.includes(project.id as (typeof PINNED_TABLE_IDS)[number])
      ),
    []
  );
  const projects = React.useMemo(() => {
    if (activeView === "detail") return MOCK_PROJECTS;
    if (activeTab === "worth_attention") {
      return [...attentionProjects].sort((a, b) => {
        const pinnedDelta = Number(isPinned(b.id)) - Number(isPinned(a.id));
        if (pinnedDelta !== 0) return pinnedDelta;
        return getAttentionPriority(b) - getAttentionPriority(a);
      });
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();

    return [...MOCK_PROJECTS]
      .filter((project) => {
        if (filter === "worth_attention" && !attentionProjects.includes(project)) return false;
        if (filter === "pinned" && !isPinned(project.id)) return false;
        if (filter === "active" && project.status !== "active") return false;
        if (filter === "stalled" && project.status !== "stalled") return false;
        if (!normalizedQuery) return true;

        return [
          project.name,
          project.organizationName,
          project.status,
          project.nextMilestone,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((a, b) => {
        const pinnedDelta = Number(isPinned(b.id)) - Number(isPinned(a.id));
        if (pinnedDelta !== 0) return pinnedDelta;
        return a.name.localeCompare(b.name);
      });
  }, [activeTab, activeView, attentionProjects, filter, searchQuery]);
  const featuredProject = selectedProject ?? projects[0];
  const copy = TABLE_COPY[activeView];
  const tabs = React.useMemo(
    () => [
      {
        label: (
          <span className="flex items-center">
            Worth Attention
            {attentionProjects.length > 0 && <TabBadge count={attentionProjects.length} />}
          </span>
        ),
        value: "worth_attention",
      },
      { label: "Roundtables", value: "tables" },
    ],
    [attentionProjects.length]
  );

  return (
    <div className="w-full px-16 py-8">
      <PageBanner
        size="hero"
        eyebrow="ROUNDTABLE"
        title={activeView === "detail" && featuredProject ? featuredProject.name : copy.title}
        subtitle={activeView === "detail" && featuredProject
          ? `${featuredProject.organizationName} roundtable — ${copy.subtitle}`
          : copy.subtitle}
        tabs={activeView === "detail" ? undefined : tabs}
        activeTab={activeView === "detail" ? undefined : activeTab}
        onTabChange={(value) => setActiveTab(value as TableTab)}
        fullWidthDivider
        actions={
          <Button size="sm" asChild>
            <Link href="/roundtables/all">
              View all roundtables
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        }
      />

      {activeView === "detail" && featuredProject ? (
        <TableDetail project={featuredProject} />
      ) : (
        <TableOverview
          projects={projects}
          activeTab={activeTab}
          filter={filter}
          onFilterChange={setFilter}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          counts={{
            all: MOCK_PROJECTS.length,
            worth_attention: attentionProjects.length,
            pinned: pinnedProjects.length,
            active: MOCK_PROJECTS.filter((project) => project.status === "active").length,
            stalled: MOCK_PROJECTS.filter((project) => project.status === "stalled").length,
          }}
        />
      )}
    </div>
  );
}

function TabBadge({ count }: { count: number }) {
  return (
    <span
      className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-light text-foreground"
      style={{ backgroundColor: "#e8e9fe" }}
    >
      {count}
    </span>
  );
}

function TableOverview({
  projects,
  activeTab,
  filter,
  onFilterChange,
  searchQuery,
  onSearchQueryChange,
  counts,
}: {
  projects: MockProject[];
  activeTab: TableTab;
  filter: TableFilter;
  onFilterChange: (_filter: TableFilter) => void;
  searchQuery: string;
  onSearchQueryChange: (_query: string) => void;
  counts: Record<TableFilter, number>;
}) {
  return (
    <div className="space-y-6">
      {activeTab === "tables" ? (
        <TableToolbar
          filter={filter}
          onFilterChange={onFilterChange}
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          counts={counts}
        />
      ) : (
        <WorthAttentionIntro count={projects.length} />
      )}
      {projects.length > 0 ? (
        <div className={cn("grid gap-4", activeTab === "tables" && "md:grid-cols-2")}>
          {projects.map((project) => (
            activeTab === "worth_attention" ? (
              <AttentionTableRow key={project.id} project={project} />
            ) : (
              <TableCard key={project.id} project={project} pinned={isPinned(project.id)} />
            )
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <CheckCircle2 className="mx-auto mb-3 size-8 text-muted-foreground/60" />
          <p className="text-sm font-medium">No roundtables need attention</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Roundtables with stalled work, high progress, or open balances will appear here.
          </p>
        </Card>
      )}
    </div>
  );
}

function WorthAttentionIntro({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-4">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{count} roundtables</span> need a next move.
      </p>
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        Sorted by urgency
      </span>
    </div>
  );
}

function AttentionTableRow({ project }: { project: MockProject }) {
  return (
    <Link
      href={`/roundtables/${project.id}`}
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:bg-muted/40 md:flex-row md:items-center md:justify-between"
    >
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <ProjectStatusPill status={project.status} />
          {isPinned(project.id) && (
            <Badge variant="secondary" className="gap-1">
              <Pin className="size-3" />
              Pinned
            </Badge>
          )}
          <AttentionReason project={project} />
        </div>
        <h3 className="truncate font-semibold tracking-tight">{project.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {project.organizationName} · {project.nextMilestone}
        </p>
      </div>
      <div className="w-full shrink-0 space-y-2 md:w-44">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{project.progress}%</span>
        </div>
        <Progress value={project.progress} />
      </div>
    </Link>
  );
}

function AttentionReason({ project }: { project: MockProject }) {
  const outstanding = getProjectOutstandingCents(project);

  if (project.status === "stalled") {
    return <Badge variant="destructive">Stalled</Badge>;
  }

  if (outstanding > 0) {
    return <Badge variant="secondary">{formatCurrency(outstanding)} open</Badge>;
  }

  if (project.progress >= 75) {
    return <Badge variant="outline">Nearing handoff</Badge>;
  }

  return <Badge variant="outline">Review</Badge>;
}

function TableToolbar({
  filter,
  onFilterChange,
  searchQuery,
  onSearchQueryChange,
  counts,
}: {
  filter: TableFilter;
  onFilterChange: (_filter: TableFilter) => void;
  searchQuery: string;
  onSearchQueryChange: (_query: string) => void;
  counts: Record<TableFilter, number>;
}) {
  const [showFilterMenu, setShowFilterMenu] = React.useState(false);
  const filters: { label: string; value: TableFilter; dotClassName: string }[] = [
    { label: "All", value: "all", dotClassName: "bg-[#cbcfd8]" },
    { label: "Worth Attention", value: "worth_attention", dotClassName: "bg-warning" },
    { label: "Pinned", value: "pinned", dotClassName: "bg-primary" },
    { label: "Active", value: "active", dotClassName: "bg-success" },
    { label: "Stalled", value: "stalled", dotClassName: "bg-destructive" },
  ];
  const activeFilter = filters.find((item) => item.value === filter) ?? filters[0];
  const hasActiveFilter = filter !== "all";

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Search roundtables..."
          className="h-8 pl-8 text-sm"
        />
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setShowFilterMenu((value) => !value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-sm transition-colors",
            hasActiveFilter
              ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
              : "border-border bg-foreground/5 text-foreground hover:bg-foreground/10"
          )}
        >
          <Filter className="size-3.5" />
          <span>{activeFilter.label}</span>
          {hasActiveFilter && (
            <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {counts[filter]}
            </span>
          )}
          <ChevronDown className="size-3.5 opacity-50" />
        </button>
        {showFilterMenu && (
          <div className="absolute right-0 top-full z-10 mt-1 w-56 rounded-lg border border-border bg-card py-1 shadow-lg">
            <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Filter roundtables
            </div>
            {filters.map((item) => {
              const isActive = filter === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    onFilterChange(item.value);
                    setShowFilterMenu(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted",
                    isActive && "bg-muted"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className={cn("size-1.5 rounded-[2px]", item.dotClassName)} />
                    {item.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{counts[item.value]}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TableDetail({ project }: { project: MockProject }) {
  const participants = getProjectParticipants(project);
  const actions = getProjectActions(project);
  const team = project.teamId
    ? MOCK_TEAMS.find((item) => item.id === project.teamId)
    : undefined;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <ProjectStatusPill status={project.status} />
                {isPinned(project.id) && (
                  <Badge variant="secondary" className="gap-1">
                    <Pin className="size-3" />
                    Pinned
                  </Badge>
                )}
              </div>
              <h2 className="text-xl font-semibold tracking-tight">
                Everything around {project.name}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                This is the shared project roundtable: the current status, the people
                involved, the AI players responsible for next moves, and the
                artifacts that keep the work moving.
              </p>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href="/roundtables/pinned">Back to pinned</Link>
            </Button>
          </div>
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Project progress</span>
              <span className="text-muted-foreground">{project.progress}%</span>
            </div>
            <Progress value={project.progress} />
          </div>
        </Card>

        <Card className="p-6">
          <SectionHeader
            icon={Users}
            title="Around the roundtable"
            subtitle="Human participants and AI players with context for this project."
          />
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {participants.map((person) => (
              <div
                key={person.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
              >
                <div className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {person.avatar}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{person.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {person.title ?? person.organizationName ?? "Participant"}
                  </p>
                </div>
              </div>
            ))}
            <PlayerCard name="Client Success Assistant" role="Keeps updates and replies moving" />
            <PlayerCard name="Project Steward" role="Watches milestones, files, and next plays" />
          </div>
        </Card>

        <Card className="p-6">
          <SectionHeader
            icon={Play}
            title="Next plays"
            subtitle="Suggested or active moves connected to this roundtable."
          />
          <div className="mt-5 space-y-3">
            {actions.length > 0 ? (
              actions.map((action) => (
                <div
                  key={action.id}
                  className="rounded-lg border border-border bg-background p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{action.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {action.triggerReason}
                      </p>
                    </div>
                    <Badge variant="secondary">{action.confidence}%</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
                No active plays yet. Salt can suggest one when this roundtable has a new signal.
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <PinnedArtifactsCard project={project} teamName={team?.name} />
        <RecentDecisionsCard project={project} />
        <ClientPaymentsCard project={project} />
      </div>
    </div>
  );
}

function TableCard({
  project,
  pinned,
}: {
  project: MockProject;
  pinned: boolean;
}) {
  return (
    <Link
      href={`/roundtables/${project.id}`}
      className="block rounded-xl border border-border bg-card p-5 transition-colors hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <ProjectStatusPill status={project.status} />
            {pinned && <Pin className="size-3.5 text-muted-foreground" />}
          </div>
          <h3 className="font-semibold tracking-tight">{project.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.organizationName}
          </p>
        </div>
        <ArrowRight className="size-4 text-muted-foreground" />
      </div>
      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{project.progress}%</span>
        </div>
        <Progress value={project.progress} />
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Next: {project.nextMilestone}
      </p>
    </Link>
  );
}

function ClientPaymentsCard({ project }: { project: MockProject }) {
  const outstanding = getProjectOutstandingCents(project);
  const hasOutstanding = outstanding > 0;

  return (
    <Card className="p-5">
      <SectionHeader
        icon={CreditCard}
        title="Client payments"
        subtitle="Payments and subscriptions belong inside the client's roundtable view, paid to the studio through Stripe Connect."
      />
      <div className="mt-5 rounded-lg bg-muted/50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">
              {hasOutstanding ? formatCurrency(outstanding) : "No open balance"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {hasOutstanding
                ? "Visible to the client as a payable invoice or subscription."
                : "Retainers and invoices will appear here when shared."}
            </p>
          </div>
          <Badge variant={hasOutstanding ? "secondary" : "outline"}>
            {hasOutstanding ? "Payable" : "Current"}
          </Badge>
        </div>
      </div>
    </Card>
  );
}

function PinnedArtifactsCard({
  project,
  teamName,
}: {
  project: MockProject;
  teamName?: string;
}) {
  const artifacts = [
    { icon: Clock3, label: "Next milestone", value: project.nextMilestone },
    { icon: Users, label: "Owner team", value: teamName ?? "Unassigned" },
    { icon: FileText, label: "Pinned file", value: `${project.name} working brief` },
  ];

  return (
    <Card className="p-5">
      <SectionHeader
        icon={Pin}
        title="Pinned to the roundtable"
        subtitle="The artifacts that should stay close while work is active."
      />
      <div className="mt-5 space-y-3">
        {artifacts.map((artifact) => (
          <div key={artifact.label} className="flex items-start gap-3">
            <artifact.icon className="mt-0.5 size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{artifact.label}</p>
              <p className="text-sm font-medium">{artifact.value}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RecentDecisionsCard({ project }: { project: MockProject }) {
  return (
    <Card className="p-5">
      <SectionHeader
        icon={CheckCircle2}
        title="Recent decisions"
        subtitle="Decision memory belongs with the project roundtable."
      />
      <div className="mt-5 space-y-3">
        <DecisionRow text={`Keep ${project.name} scoped to the current milestone.`} />
        <DecisionRow text="Use async updates unless client feedback needs a live walkthrough." />
      </div>
    </Card>
  );
}

function PlayerCard({ name, role }: { name: string; role: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-primary/5 p-3">
      <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{role}</p>
      </div>
    </div>
  );
}

function DecisionRow({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-lg bg-muted/50 p-3 text-sm">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
      <span>{text}</span>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function getProjectParticipants(project: MockProject) {
  const projectPeople = MOCK_PEOPLE.filter(
    (person) => person.organizationId === project.organizationId
  );
  const internalPeople = MOCK_PEOPLE.filter((person) => person.isInternal).slice(0, 2);
  return [...projectPeople.slice(0, 2), ...internalPeople];
}

function getProjectActions(project: MockProject) {
  return MOCK_ACTIONS.filter(
    (action) =>
      action.relatedEntityName === project.organizationName ||
      getProjectParticipants(project).some((person) => person.id === action.relatedEntityId)
  ).slice(0, 3);
}

function getProjectOutstandingCents(project: MockProject) {
  return MOCK_PEOPLE
    .filter((person) => person.organizationId === project.organizationId)
    .reduce((sum, person) => sum + person.outstandingAmount * 100, 0);
}

function getAttentionPriority(project: MockProject) {
  const stalledScore = project.status === "stalled" ? 100 : 0;
  const balanceScore = getProjectOutstandingCents(project) > 0 ? 40 : 0;
  const handoffScore = project.progress >= 75 ? 30 : 0;

  return stalledScore + balanceScore + handoffScore + project.progress / 100;
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function isPinned(projectId: string) {
  return PINNED_TABLE_IDS.includes(projectId as (typeof PINNED_TABLE_IDS)[number]);
}

function ProjectStatusPill({ status }: { status: MockProject["status"] }) {
  return <StatusPill color={statusColor(status)} label={statusLabel(status)} />;
}

function statusColor(status: MockProject["status"]) {
  if (status === "complete") return "hsl(var(--success))";
  if (status === "stalled") return "hsl(var(--warning))";
  if (status === "on_hold") return "hsl(var(--muted-foreground))";
  return "hsl(var(--primary))";
}

function statusLabel(status: MockProject["status"]) {
  return status.replace("_", " ");
}
