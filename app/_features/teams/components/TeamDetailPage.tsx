"use client";

import Link from "next/link";
import { ArrowLeft, Briefcase, Sparkles, Users } from "lucide-react";
import { Avatar, AvatarFallback, Button, Card, StatusPill } from "@repo/ui";
import { PageBanner } from "@repo/patterns";
import { cn } from "@repo/utils";
import {
  MOCK_PEOPLE,
  MOCK_PROJECTS,
  MOCK_TEAMS,
  type MockTeam,
} from "@/app/_lib/demo";
import { useMockContent } from "@/app/_features/shell/contexts/DashboardUserContext";
import { MockContentEmptyState } from "@/app/_features/shell/components/MockContentEmptyState";

export function TeamDetailPage({ teamId }: { teamId: string }) {
  const mockContent = useMockContent();
  const team = mockContent ? MOCK_TEAMS.find((item) => item.id === teamId) : undefined;

  if (!team) {
    return (
      <MockContentEmptyState
        title="Team not found"
        description="Teams will appear here once you organize people and work in Salt."
      />
    );
  }

  const Icon = team.icon;
  const members = MOCK_PEOPLE.filter((person) => team.memberIds.includes(person.id));
  const projects = MOCK_PROJECTS.filter((project) => project.teamId === team.id);

  return (
    <div className="w-full px-16 py-8">
      <Link
        href="/teams"
        className="mb-6 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Teams
      </Link>

      <PageBanner
        size="hero"
        eyebrow="TEAM"
        title={team.name}
        subtitle={`${members.length} members, ${projects.length} linked work items, ${team.capacityPercent}% capacity. Salt keeps coordination risk visible before it becomes project risk.`}
        fullWidthDivider
        actions={
          <Button variant="outline" size="sm" className="gap-1.5">
            <Sparkles className="size-3.5" />
            Improve brief
          </Button>
        }
      />

      <Card className="mb-6 border-primary/15 bg-gradient-to-br from-primary/[0.03] to-transparent p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-7 items-center justify-center bg-primary/10">
            <Sparkles className="size-3.5 text-primary" />
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold">Salt team brief</p>
            <p className="text-sm leading-relaxed text-foreground/90">
              {getTeamBrief(team, projects.length)}
            </p>
            <button
              type="button"
              className="mt-3 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Edit brief
            </button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <StatCard title="TEAM">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{team.name}</p>
                <div className="mt-1">
                  <CapacityPill value={team.capacityPercent} />
                </div>
              </div>
            </div>
          </StatCard>

          <StatCard title="MEMBERS">
            <div className="space-y-2">
              {members.map((person) => (
                <Link
                  key={person.id}
                  href={`/people/${person.id}`}
                  className="flex items-center gap-3 rounded-lg py-1.5 transition-colors hover:bg-muted/40"
                >
                  <Avatar className="size-8 ring-1 ring-border">
                    <AvatarFallback className={cn("text-[10px] font-semibold", person.avatarColor)}>
                      {person.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{person.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{person.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          </StatCard>
        </div>

        <div className="space-y-4">
          <StatCard title="LINKED WORK">
            <div className="space-y-2">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/work/${project.id}`}
                  className="flex items-center gap-3 rounded-lg py-1.5 transition-colors hover:bg-muted/40"
                >
                  <div className="flex size-8 items-center justify-center bg-muted">
                    <Briefcase className="size-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{project.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {project.organizationName} · {project.progress}% complete
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </StatCard>

          <StatCard title="EVIDENCE">
            <div className="space-y-3">
              <EvidenceItem icon={Users} title="Capacity" detail={`${team.capacityPercent}% assigned`} />
              <EvidenceItem icon={Briefcase} title="Active work" detail={`${projects.length} projects linked to this team`} />
              <EvidenceItem
                icon={Sparkles}
                title="Suggested next action"
                detail={
                  team.capacityPercent > 100
                    ? "Review assignments before adding more design work."
                    : "Keep this team available for the next active project."
                }
              />
            </div>
          </StatCard>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <p className="mb-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
        {title}
      </p>
      {children}
    </Card>
  );
}

function EvidenceItem({
  icon: Icon,
  title,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex size-7 shrink-0 items-center justify-center bg-muted">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function CapacityPill({ value }: { value: number }) {
  if (value > 100) {
    return <StatusPill color="var(--relationship-vendors)" label="AT RISK" />;
  }

  if (value < 70) {
    return <StatusPill color="var(--relationship-team)" label="OPEN" />;
  }

  return <StatusPill color="var(--relationship-clients)" label="STEADY" />;
}

function getTeamBrief(team: MockTeam, projectCount: number) {
  if (team.capacityPercent > 100) {
    return `${team.name} is carrying ${projectCount} active work items and is above planned capacity. Salt should protect focus by surfacing coordination risk before assigning new work.`;
  }

  return `${team.name} has ${projectCount} active work items and enough visible capacity for near-term coordination. Salt keeps linked work, people, and notes together so handoffs stay clear.`;
}
