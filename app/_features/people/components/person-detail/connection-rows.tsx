"use client";

import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Building2,
  FileText,
  Layers,
} from "lucide-react";
import { Avatar, AvatarFallback, Badge, StatusPill } from "@repo/ui";
import { cn } from "@repo/utils";
import {
  MOCK_PEOPLE,
  MOCK_TEAMS,
  type MockNote,
  type MockOrganization,
  type MockProject,
  type MockTeam,
} from "@/app/_lib/demo";

const NOTE_CATEGORY_LABEL: Record<MockNote["category"], string> = {
  idea: "Idea",
  reminder: "Reminder",
  reflection: "Reflection",
};

const ORG_STATUS: Record<
  MockOrganization["relationshipStatus"],
  { color: string; label: string }
> = {
  client: { color: "var(--relationship-clients)", label: "CLIENT" },
  prospect: { color: "var(--relationship-partners)", label: "PROSPECT" },
  past_client: { color: "var(--relationship-team)", label: "PAST" },
  partner: { color: "var(--relationship-partners)", label: "PARTNER" },
  vendor: { color: "var(--relationship-vendors)", label: "VENDOR" },
  other: { color: "var(--relationship-team)", label: "OTHER" },
};

const PROJECT_STATUS: Record<
  MockProject["status"],
  { color: string; label: string }
> = {
  active: { color: "var(--relationship-clients)", label: "ACTIVE" },
  stalled: { color: "var(--relationship-vendors)", label: "STALLED" },
  complete: { color: "var(--relationship-team)", label: "DONE" },
  on_hold: { color: "var(--relationship-team)", label: "ON HOLD" },
};

export function ConnectionOrgRow({ org }: { org: MockOrganization }) {
  const linkedPeople = MOCK_PEOPLE.filter((p) => p.organizationId === org.id);
  const status = ORG_STATUS[org.relationshipStatus];

  return (
    <Link
      href="/orgs"
      className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/40"
    >
      <Avatar className="size-9 ring-1 ring-border">
        <AvatarFallback className={cn("text-[11px] font-semibold", org.avatarColor)}>
          {org.avatar}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{org.name}</p>
          <StatusPill color={status.color} label={status.label} />
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {org.industry} · {linkedPeople.length || org.peopleCount}{" "}
          {(linkedPeople.length || org.peopleCount) === 1 ? "person" : "people"}
        </p>
      </div>
      <Building2 className="size-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60" />
      <ArrowRight className="size-3.5 text-muted-foreground/30 transition-colors group-hover:text-foreground/60" />
    </Link>
  );
}

export function ConnectionWorkRow({ project }: { project: MockProject }) {
  const status = PROJECT_STATUS[project.status];
  const team = project.teamId
    ? MOCK_TEAMS.find((item) => item.id === project.teamId)
    : undefined;

  return (
    <Link
      href={`/work/${project.id}`}
      className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/40"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
        <Briefcase className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{project.name}</p>
          <StatusPill color={status.color} label={status.label} />
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {project.organizationName}
          {team ? ` · ${team.name}` : ""}
          {" · "}
          {project.nextMilestone}
        </p>
      </div>
      <div className="hidden min-w-28 items-center gap-2 sm:flex">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full",
              project.status === "stalled" ? "bg-warning" : "bg-foreground/70"
            )}
            style={{ width: `${project.progress}%` }}
          />
        </div>
        <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
          {project.progress}%
        </span>
      </div>
      <ArrowRight className="size-3.5 text-muted-foreground/30 transition-colors group-hover:text-foreground/60" />
    </Link>
  );
}

export function ConnectionTeamRow({ team }: { team: MockTeam }) {
  const Icon = team.icon;
  const members = MOCK_PEOPLE.filter((p) => team.memberIds.includes(p.id));

  return (
    <Link
      href={`/teams/${team.id}`}
      className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/40"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{team.name}</p>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
            {team.capacityPercent}% cap
          </Badge>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {team.activeProjects} active project
          {team.activeProjects === 1 ? "" : "s"} · {members.length} member
          {members.length === 1 ? "" : "s"}
        </p>
      </div>
      <Layers className="size-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60" />
      <ArrowRight className="size-3.5 text-muted-foreground/30 transition-colors group-hover:text-foreground/60" />
    </Link>
  );
}

export function ConnectionNoteRow({ note }: { note: MockNote }) {
  const preview =
    note.content.length > 120 ? `${note.content.slice(0, 120)}…` : note.content;

  return (
    <Link
      href="/notes"
      className="group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/40"
    >
      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
        <FileText className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {NOTE_CATEGORY_LABEL[note.category]}
          </Badge>
          {note.isPinned ? (
            <Badge variant="secondary" className="text-[10px]">
              Pinned
            </Badge>
          ) : null}
          <span className="text-[10px] text-muted-foreground">{note.dateLabel}</span>
        </div>
        <p className="text-sm leading-relaxed text-foreground/90">{preview}</p>
        {note.linkedEntities.length > 1 ? (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            Also linked to{" "}
            {note.linkedEntities
              .filter((e) => e.type !== "person")
              .map((e) => e.label)
              .join(", ")}
          </p>
        ) : null}
      </div>
      <ArrowRight className="mt-2 size-3.5 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-foreground/60" />
    </Link>
  );
}
