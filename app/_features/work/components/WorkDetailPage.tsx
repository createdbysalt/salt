"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Sparkles,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, Button, Card, StatusPill } from "@repo/ui";
import { PageBanner } from "@repo/patterns";
import { cn } from "@repo/utils";
import {
  MOCK_NOTES,
  MOCK_ORGANIZATIONS,
  MOCK_PEOPLE,
  MOCK_PROJECTS,
  MOCK_TEAMS,
  type MockProject,
} from "@/app/_lib/demo";

export function WorkDetailPage({ projectId }: { projectId: string }) {
  const project = MOCK_PROJECTS.find((item) => item.id === projectId);
  if (!project) return null;

  const organization = MOCK_ORGANIZATIONS.find((item) => item.id === project.organizationId);
  const team = project.teamId ? MOCK_TEAMS.find((item) => item.id === project.teamId) : undefined;
  const people = MOCK_PEOPLE.filter((person) => person.organizationId === project.organizationId);
  const notes = MOCK_NOTES.filter((note) =>
    note.linkedEntities.some((entity) => entity.id === project.id || entity.id === project.organizationId)
  );
  const outstanding = people.reduce((sum, person) => sum + person.outstandingAmount, 0);

  return (
    <div className="w-full px-16 py-8">
      <Link
        href="/work"
        className="mb-6 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Work
      </Link>

      <PageBanner
        size="hero"
        eyebrow={project.organizationName.toUpperCase()}
        title={project.name}
        subtitle={`${project.nextMilestone}. Salt keeps this work connected to the people, company, team, notes, and payment context around it.`}
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
            <p className="mb-1 text-sm font-semibold">Salt work brief</p>
            <p className="text-sm leading-relaxed text-foreground/90">
              {getWorkBrief(project, outstanding)}
            </p>
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Edit brief
            </button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <StatCard title="STATUS">
            <div className="grid grid-cols-2 gap-4">
              <StatItem label="State" value={<ProjectStatusPill status={project.status} />} />
              <StatItem label="Progress" value={`${project.progress}%`} />
              <StatItem label="Days Active" value={`${project.daysActive}`} />
              <StatItem label="Next" value={project.nextMilestone} />
            </div>
          </StatCard>

          <StatCard title="LINKED PEOPLE">
            <div className="space-y-2">
              {people.map((person) => (
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
          <StatCard title="CONNECTED CONTEXT">
            <div className="grid grid-cols-2 gap-4">
              <StatItem label="Company" value={organization?.name ?? project.organizationName} />
              <StatItem label="Team" value={team?.name ?? "Unassigned"} />
              <StatItem label="Notes" value={notes.length} />
              <StatItem
                label="Payment"
                value={outstanding > 0 ? `$${outstanding.toLocaleString()} outstanding` : "Clear"}
              />
            </div>
          </StatCard>

          <StatCard title="EVIDENCE TRAIL">
            <div className="space-y-3">
              <EvidenceItem icon={Briefcase} title="Project milestone" detail={project.nextMilestone} />
              <EvidenceItem icon={Users} title="Relationship context" detail={`${people.length} linked people at ${project.organizationName}`} />
              <EvidenceItem
                icon={outstanding > 0 ? DollarSign : CheckCircle2}
                title="Payment context"
                detail={outstanding > 0 ? "Payment timing should be confirmed before final delivery." : "No payment blocker detected."}
              />
              <EvidenceItem icon={FileText} title="Notes" detail={`${notes.length} note${notes.length === 1 ? "" : "s"} connected`} />
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

function StatItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="mb-0.5 text-[10px] text-muted-foreground">{label}</p>
      <div className="text-sm font-medium">{value}</div>
    </div>
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

function ProjectStatusPill({ status }: { status: MockProject["status"] }) {
  const meta: Record<MockProject["status"], { label: string; color: string }> = {
    active: { label: "ACTIVE", color: "var(--relationship-clients)" },
    stalled: { label: "STALLED", color: "var(--relationship-vendors)" },
    complete: { label: "DONE", color: "var(--relationship-team)" },
    on_hold: { label: "ON HOLD", color: "var(--relationship-team)" },
  };

  return <StatusPill color={meta[status].color} label={meta[status].label} />;
}

function getWorkBrief(project: MockProject, outstanding: number) {
  const paymentContext =
    outstanding > 0
      ? ` There is $${outstanding.toLocaleString()} outstanding, so payment timing should stay visible in client-facing updates.`
      : " No payment blocker is currently attached.";

  if (project.status === "stalled") {
    return `${project.name} is waiting on the next client decision. Salt is keeping the proposal, company, people, and notes together so the next follow-up can be specific.${paymentContext}`;
  }

  return `${project.name} is active and ${project.progress}% complete. The next useful action is tied to ${project.nextMilestone.toLowerCase()}.${paymentContext}`;
}
