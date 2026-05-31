"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Briefcase,
  Building2,
  FileText,
  Layers,
  Network,
} from "lucide-react";
import { EmptyState } from "@repo/patterns";
import type { PersonConnections } from "../getPersonConnections";
import {
  ConnectionNoteRow,
  ConnectionOrgRow,
  ConnectionTeamRow,
  ConnectionWorkRow,
} from "../connection-rows";

export function PersonConnectionsTab({
  connections,
}: {
  connections: PersonConnections;
}) {
  const { organizations, projects, teams, notes } = connections;
  const total =
    organizations.length + projects.length + teams.length + notes.length;

  if (total === 0) {
    return (
      <EmptyState
        icon={<Network className="size-8" />}
        title="No connections yet"
        description="Orgs, work, teams, and notes linked to this person will appear here as Salt connects the graph."
        action={
          <Link
            href="/connections"
            className="text-sm text-primary hover:opacity-80"
          >
            Open connections graph
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {total} connection{total === 1 ? "" : "s"} across orgs, work, teams,
          and notes
        </p>
        <Link
          href="/connections"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <Network className="size-3.5" />
          Open in graph
        </Link>
      </div>

      <ConnectionsGroup
        icon={<Building2 className="size-3.5" />}
        title="Organizations"
        count={organizations.length}
        empty="No organizations linked"
      >
        {organizations.map((org) => (
          <ConnectionOrgRow key={org.id} org={org} />
        ))}
      </ConnectionsGroup>

      <ConnectionsGroup
        icon={<Briefcase className="size-3.5" />}
        title="Work"
        count={projects.length}
        empty="No projects linked"
      >
        {projects.map((project) => (
          <ConnectionWorkRow key={project.id} project={project} />
        ))}
      </ConnectionsGroup>

      <ConnectionsGroup
        icon={<Layers className="size-3.5" />}
        title="Teams"
        count={teams.length}
        empty="No teams linked"
      >
        {teams.map((team) => (
          <ConnectionTeamRow key={team.id} team={team} />
        ))}
      </ConnectionsGroup>

      <ConnectionsGroup
        icon={<FileText className="size-3.5" />}
        title="Notes"
        count={notes.length}
        empty="No notes linked"
        action={
          <Link
            href="/me"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            All notes
          </Link>
        }
      >
        {notes.map((note) => (
          <ConnectionNoteRow key={note.id} note={note} />
        ))}
      </ConnectionsGroup>
    </div>
  );
}

function ConnectionsGroup({
  icon,
  title,
  count,
  empty,
  action,
  children,
}: {
  icon: ReactNode;
  title: string;
  count: number;
  empty: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {icon}
          {title}
          <span className="tabular-nums text-muted-foreground/70">({count})</span>
        </div>
        {action}
      </div>
      {count > 0 ? (
        <div className="space-y-0.5">{children}</div>
      ) : (
        <p className="px-3 py-2 text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}
