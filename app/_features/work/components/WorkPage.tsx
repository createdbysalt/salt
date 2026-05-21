"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Briefcase, Clock, Sparkles, Users } from "lucide-react";
import { AIButton, Avatar, AvatarFallback, Card, StatusPill } from "@repo/ui";
import { PageBanner } from "@repo/patterns";
import { cn } from "@repo/utils";
import {
  MOCK_ORGANIZATIONS,
  MOCK_PEOPLE,
  MOCK_PROJECTS,
  MOCK_TEAMS,
  type MockProject,
} from "@/app/_lib/demo";

type Tab = "needs_attention" | "active" | "companies" | "archive";

export function WorkPage() {
  const [tab, setTab] = React.useState<Tab>("needs_attention");

  return (
    <div className="w-full px-16 py-8">
      <PageBanner
        size="hero"
        eyebrow="WORK"
        title="Work"
        subtitle="Active projects Salt keeps connected to the right people, companies, notes, teams, and payment context."
        fullWidthDivider
        actions={
          <AIButton size="sm" onClick={triggerAskSalt} title="Ask Salt · ⌘K">
            <Sparkles className="size-3.5" />
            Ask Salt
          </AIButton>
        }
      />

      <div className="flex items-center gap-1 mb-6 border-b border-border">
        <TabButton active={tab === "needs_attention"} onClick={() => setTab("needs_attention")}>
          <Sparkles className="size-3.5" />
          Needs Attention
        </TabButton>
        <TabButton active={tab === "active"} onClick={() => setTab("active")}>
          Active
        </TabButton>
        <TabButton active={tab === "companies"} onClick={() => setTab("companies")}>
          Companies
        </TabButton>
        <TabButton active={tab === "archive"} onClick={() => setTab("archive")}>
          Archive
        </TabButton>
      </div>

      {tab === "needs_attention" && <NeedsAttentionView />}
      {tab === "active" && <ProjectList projects={MOCK_PROJECTS} />}
      {tab === "companies" && <CompanyWorkView />}
      {tab === "archive" && <ArchiveView />}
    </div>
  );
}

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
      {active && <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-foreground" />}
    </button>
  );
}

function NeedsAttentionView() {
  const prioritized = [...MOCK_PROJECTS].sort((a, b) => {
    const score = (projectPriority(b) - projectPriority(a));
    return score || a.name.localeCompare(b.name);
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
        <Sparkles className="size-3 text-primary" />
        <span>AI-curated based on project momentum, client context, team capacity, and payment timing.</span>
      </div>
      <ProjectList projects={prioritized.slice(0, 4)} />
    </div>
  );
}

function ProjectList({ projects }: { projects: MockProject[] }) {
  return (
    <div className="space-y-2">
      {projects.map((project) => (
        <ProjectRow key={project.id} project={project} />
      ))}
    </div>
  );
}

function ProjectRow({ project }: { project: MockProject }) {
  const organization = MOCK_ORGANIZATIONS.find((org) => org.id === project.organizationId);
  const team = project.teamId ? MOCK_TEAMS.find((item) => item.id === project.teamId) : undefined;
  const people = MOCK_PEOPLE.filter((person) => person.organizationId === project.organizationId);
  const paymentSignal = getProjectPaymentSignal(project.organizationId);

  return (
    <Link
      href={`/work/${project.id}`}
      className="group flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/40"
    >
      <div className="flex size-9 items-center justify-center rounded-full bg-muted">
        <Briefcase className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{project.name}</p>
          <ProjectStatusPill status={project.status} />
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {project.organizationName}
          {team ? ` · ${team.name}` : ""}
          {paymentSignal ? ` · ${paymentSignal}` : ""}
        </p>
      </div>
      <div className="hidden min-w-40 items-center gap-3 sm:flex">
        <div className="h-1.5 flex-1 overflow-hidden bg-muted">
          <div
            className={cn("h-full", project.status === "stalled" ? "bg-warning" : "bg-foreground/70")}
            style={{ width: `${project.progress}%` }}
          />
        </div>
        <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
          {project.progress}%
        </span>
      </div>
      <div className="hidden items-center -space-x-2 sm:flex">
        {people.slice(0, 3).map((person) => (
          <Avatar key={person.id} className="size-7 ring-1 ring-border">
            <AvatarFallback className={cn("text-[10px] font-semibold", person.avatarColor)}>
              {person.avatar}
            </AvatarFallback>
          </Avatar>
        ))}
        {organization && (
          <Avatar className="size-7 ring-1 ring-border">
            <AvatarFallback className={cn("text-[10px] font-semibold", organization.avatarColor)}>
              {organization.avatar}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
      <ArrowRight className="size-3.5 text-muted-foreground/30 transition-colors group-hover:text-foreground/60" />
    </Link>
  );
}

function CompanyWorkView() {
  return (
    <div className="space-y-1">
      {MOCK_ORGANIZATIONS.map((org) => {
        const projects = MOCK_PROJECTS.filter((project) => project.organizationId === org.id);
        return (
          <Card key={org.id} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar className="size-9 ring-1 ring-border">
                  <AvatarFallback className={cn("text-[11px] font-semibold", org.avatarColor)}>
                    {org.avatar}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{org.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {projects.length} active work item{projects.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {org.insights[0] ?? "No urgent work signal"}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function ArchiveView() {
  const archived = MOCK_PROJECTS.filter((project) => project.status === "complete" || project.status === "on_hold");

  if (archived.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Clock className="mx-auto mb-3 size-8 text-muted-foreground/40" />
        <p className="mb-1 text-sm font-medium">No archived work yet</p>
        <p className="text-xs text-muted-foreground">Completed projects will stay connected to people and companies.</p>
      </Card>
    );
  }

  return <ProjectList projects={archived} />;
}

function ProjectStatusPill({ status }: { status: MockProject["status"] }) {
  const meta: Record<MockProject["status"], { label: string; color: string }> = {
    active: { label: "ACTIVE", color: "var(--relationship-clients)" },
    stalled: { label: "STALLED", color: "var(--relationship-vendors)" },
    complete: { label: "DONE", color: "var(--relationship-team)" },
    on_hold: { label: "ON HOLD", color: "var(--relationship-team)" },
  };

  return <StatusPill color={meta[status].color} label={meta[status].label} />;
}

function projectPriority(project: MockProject) {
  const stalledScore = project.status === "stalled" ? 100 : 0;
  const deadlineScore = Math.max(0, 60 - project.daysActive);
  const paymentScore = getProjectPaymentSignal(project.organizationId) ? 30 : 0;
  return stalledScore + deadlineScore + paymentScore;
}

function getProjectPaymentSignal(organizationId: string) {
  const totalOutstanding = MOCK_PEOPLE
    .filter((person) => person.organizationId === organizationId)
    .reduce((sum, person) => sum + person.outstandingAmount, 0);

  if (totalOutstanding <= 0) return null;
  return `$${totalOutstanding.toLocaleString()} outstanding`;
}

function triggerAskSalt() {
  const event = new KeyboardEvent("keydown", {
    key: "k",
    metaKey: true,
    bubbles: true,
  });
  window.dispatchEvent(event);
}
