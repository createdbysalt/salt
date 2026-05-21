"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Users } from "lucide-react";
import { AIButton, Avatar, AvatarFallback, Card, StatusPill } from "@repo/ui";
import { PageBanner } from "@repo/patterns";
import { cn } from "@repo/utils";
import {
  MOCK_PEOPLE,
  MOCK_PROJECTS,
  MOCK_TEAMS,
  type MockTeam,
} from "@/app/_lib/demo";

type Tab = "coordination" | "all" | "capacity";

export function TeamsPage() {
  const [tab, setTab] = React.useState<Tab>("coordination");

  return (
    <div className="w-full px-16 py-8">
      <PageBanner
        size="hero"
        eyebrow="TEAMS"
        title="Teams"
        subtitle="Internal teams Salt keeps connected to active work, relationship context, and capacity signals."
        fullWidthDivider
        actions={
          <AIButton size="sm" onClick={triggerAskSalt} title="Ask Salt · ⌘K">
            <Sparkles className="size-3.5" />
            Ask Salt
          </AIButton>
        }
      />

      <div className="flex items-center gap-1 mb-6 border-b border-border">
        <TabButton active={tab === "coordination"} onClick={() => setTab("coordination")}>
          <Sparkles className="size-3.5" />
          Coordination
        </TabButton>
        <TabButton active={tab === "all"} onClick={() => setTab("all")}>
          All
        </TabButton>
        <TabButton active={tab === "capacity"} onClick={() => setTab("capacity")}>
          Capacity
        </TabButton>
      </div>

      {tab === "coordination" && <CoordinationView />}
      {tab === "all" && <TeamList teams={MOCK_TEAMS} />}
      {tab === "capacity" && <CapacityView />}
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

function CoordinationView() {
  const prioritized = [...MOCK_TEAMS].sort((a, b) => b.capacityPercent - a.capacityPercent);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
        <Sparkles className="size-3 text-primary" />
        <span>AI-curated based on capacity, active work, and internal coordination risk.</span>
      </div>
      <TeamList teams={prioritized} />
    </div>
  );
}

function TeamList({ teams }: { teams: MockTeam[] }) {
  return (
    <div className="space-y-2">
      {teams.map((team) => (
        <TeamRow key={team.id} team={team} />
      ))}
    </div>
  );
}

function TeamRow({ team }: { team: MockTeam }) {
  const Icon = team.icon;
  const members = MOCK_PEOPLE.filter((person) => team.memberIds.includes(person.id));
  const projects = MOCK_PROJECTS.filter((project) => project.teamId === team.id);

  return (
    <Link
      href={`/teams/${team.id}`}
      className="group flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/40"
    >
      <div className="flex size-9 items-center justify-center rounded-full bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{team.name}</p>
          <CapacityPill value={team.capacityPercent} />
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {team.activeProjects} active project{team.activeProjects === 1 ? "" : "s"} · {members.length} member{members.length === 1 ? "" : "s"}
        </p>
      </div>
      <div className="hidden min-w-40 items-center gap-3 sm:flex">
        <div className="h-1.5 flex-1 overflow-hidden bg-muted">
          <div
            className={cn(
              "h-full",
              team.capacityPercent > 100
                ? "bg-warning"
                : team.capacityPercent < 70
                  ? "bg-muted-foreground/40"
                  : "bg-success"
            )}
            style={{ width: `${Math.min(team.capacityPercent, 100)}%` }}
          />
        </div>
        <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
          {team.capacityPercent}%
        </span>
      </div>
      <div className="hidden items-center -space-x-2 sm:flex">
        {members.map((person) => (
          <Avatar key={person.id} className="size-7 ring-1 ring-border">
            <AvatarFallback className={cn("text-[10px] font-semibold", person.avatarColor)}>
              {person.avatar}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      <ArrowRight className="size-3.5 text-muted-foreground/30 transition-colors group-hover:text-foreground/60" />
    </Link>
  );
}

function CapacityView() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {MOCK_TEAMS.map((team) => (
        <Card key={team.id} className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">{team.name}</p>
            <CapacityPill value={team.capacityPercent} />
          </div>
          <div className="mb-2 h-1.5 overflow-hidden bg-muted">
            <div
              className={cn(
                "h-full",
                team.capacityPercent > 100 ? "bg-warning" : "bg-success"
              )}
              style={{ width: `${Math.min(team.capacityPercent, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {team.capacityPercent > 100
              ? "Salt should protect focus before assigning more work."
              : "Capacity is available for active work."}
          </p>
        </Card>
      ))}
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

function triggerAskSalt() {
  const event = new KeyboardEvent("keydown", {
    key: "k",
    metaKey: true,
    bubbles: true,
  });
  window.dispatchEvent(event);
}
