"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Sparkles,
  Network,
  MessageSquare,
  Briefcase,
  FileText,
  Calendar,
  Plus,
  MoreHorizontal,
} from "lucide-react";
import { Avatar, AvatarFallback, Button, Card } from "@repo/ui";
import { cn } from "@repo/utils";
import {
  MOCK_PEOPLE,
  MOCK_ORGANIZATIONS,
  MOCK_PROJECTS,
  MOCK_MESSAGES,
} from "@/app/_lib/demo";

/**
 * Person detail page (/people/[id]).
 *
 * Demo storyline beat 6 climax: click into Sarah Chen → see AI insight
 * card with relationship intelligence.
 */

type Tab = "overview" | "activity" | "projects" | "files";

export function PersonDetailPage({ personId }: { personId: string }) {
  const [tab, setTab] = React.useState<Tab>("overview");

  const person = MOCK_PEOPLE.find((p) => p.id === personId);
  if (!person) return null;

  const organization = person.organizationId
    ? MOCK_ORGANIZATIONS.find((o) => o.id === person.organizationId)
    : undefined;

  const personProjects = MOCK_PROJECTS.filter(
    (p) => p.organizationId === person.organizationId
  );

  const recentMessages = MOCK_MESSAGES.filter(
    (m) => m.senderName === person.name
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      {/* Back nav */}
      <Link
        href="/people"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="size-3.5" />
        People
      </Link>

      {/* Person header */}
      <div className="flex items-start gap-5 mb-6">
        <Avatar className="size-16 rounded-full">
          <AvatarFallback
            className={cn(
              "rounded-full text-xl font-semibold",
              person.avatarColor
            )}
          >
            {person.avatar}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {person.name}
            </h1>
            <RelationshipPill status={person.relationshipStatus} />
          </div>
          {person.title && (
            <p className="text-sm text-muted-foreground mb-2">
              {person.title}
              {organization && (
                <>
                  {" "}at{" "}
                  <Link
                    href="#"
                    className="text-foreground/80 hover:text-foreground underline-offset-2 hover:underline"
                  >
                    {organization.name}
                  </Link>
                </>
              )}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            {person.email && (
              <span className="inline-flex items-center gap-1">
                <Mail className="size-3" />
                {person.email}
              </span>
            )}
            {person.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="size-3" />
                {person.phone}
              </span>
            )}
            {person.lastContactDays !== null && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="size-3" />
                Last contact{" "}
                {person.lastContactDays === 0
                  ? "today"
                  : `${person.lastContactDays}d ago`}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Network className="size-3.5" />
            Show connections
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="size-4" />
          </Button>
        </div>
      </div>

      {/* AI Insights card */}
      {person.insights.length > 0 && (
        <Card className="border-primary/15 bg-gradient-to-br from-primary/[0.04] to-transparent p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center size-6 bg-primary/10">
              <Sparkles className="size-3.5 text-primary" />
            </div>
            <h2 className="text-sm font-semibold tracking-tight">
              AI Insights
            </h2>
          </div>
          <ul className="space-y-1.5">
            {person.insights.map((insight, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm leading-relaxed"
              >
                <span className="text-primary/60 mt-1 shrink-0">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-border">
        <TabButton
          active={tab === "overview"}
          onClick={() => setTab("overview")}
        >
          Overview
        </TabButton>
        <TabButton
          active={tab === "activity"}
          onClick={() => setTab("activity")}
        >
          Activity
        </TabButton>
        <TabButton
          active={tab === "projects"}
          onClick={() => setTab("projects")}
        >
          Projects
          {personProjects.length > 0 && (
            <span className="text-[10px] text-muted-foreground font-normal">
              ({personProjects.length})
            </span>
          )}
        </TabButton>
        <TabButton active={tab === "files"} onClick={() => setTab("files")}>
          Files
        </TabButton>
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <OverviewTab
          person={person}
          organization={organization}
          projects={personProjects}
          messages={recentMessages}
        />
      )}
      {tab === "activity" && <ActivityPlaceholder />}
      {tab === "projects" && <ProjectsTab projects={personProjects} />}
      {tab === "files" && <FilesPlaceholder />}
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
// OVERVIEW TAB
// ============================================================================

function OverviewTab({
  person,
  organization,
  projects,
  messages,
}: {
  person: ReturnType<typeof MOCK_PEOPLE.find>;
  organization: ReturnType<typeof MOCK_ORGANIZATIONS.find>;
  projects: typeof MOCK_PROJECTS;
  messages: typeof MOCK_MESSAGES;
}) {
  if (!person) return null;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
      <div className="space-y-6">
        {/* Recent messages */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold tracking-tight">
                Recent messages
              </h3>
            </div>
            {messages.length > 0 && (
              <Link
                href="/messages"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View all →
              </Link>
            )}
          </div>
          {messages.length === 0 ? (
            <EmptyHint text="No recent messages." />
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => (
                <Card key={msg.id} className="p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                    <span>{msg.receivedAgo}</span>
                    {msg.hasAIDraft && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 text-primary">
                          <Sparkles className="size-3" />
                          AI draft ready
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed line-clamp-2">
                    {msg.preview}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Notes */}
        {person.notes && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold tracking-tight">Notes</h3>
            </div>
            <Card className="p-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {person.notes}
              </p>
            </Card>
          </section>
        )}
      </div>

      {/* Right column — Organization + Projects summary */}
      <div className="space-y-4">
        {organization && (
          <Card className="p-4">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70 mb-2">
              Organization
            </p>
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="size-8 rounded-full">
                <AvatarFallback
                  className={cn(
                    "rounded-full text-[11px] font-semibold",
                    organization.avatarColor
                  )}
                >
                  {organization.avatar}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight">
                  {organization.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {organization.industry}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground mb-0.5">Status</p>
                <RelationshipPill status={organization.relationshipStatus} />
              </div>
              {organization.mrr > 0 && (
                <div>
                  <p className="text-muted-foreground mb-0.5">MRR</p>
                  <p className="font-semibold">
                    ${(organization.mrr / 1000).toFixed(1)}k
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}

        {projects.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                Projects
              </p>
              <Button variant="ghost" size="icon" className="h-5 w-5 -mr-1">
                <Plus className="size-3" />
              </Button>
            </div>
            <div className="space-y-2.5">
              {projects.slice(0, 3).map((project) => (
                <div key={project.id} className="text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium leading-tight">{project.name}</p>
                    <span className="text-muted-foreground tabular-nums text-[10px]">
                      {project.progress}%
                    </span>
                  </div>
                  <div className="h-1 bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all",
                        project.status === "stalled"
                          ? "bg-warning"
                          : "bg-foreground/70"
                      )}
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// OTHER TABS (light placeholders)
// ============================================================================

function ActivityPlaceholder() {
  return (
    <Card className="p-12 text-center">
      <Calendar className="size-8 text-muted-foreground/40 mx-auto mb-3" />
      <p className="text-sm font-medium mb-1">Activity timeline</p>
      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
        Every conversation, meeting, file, and AI action — chronologically.
      </p>
    </Card>
  );
}

function FilesPlaceholder() {
  return (
    <Card className="p-12 text-center">
      <FileText className="size-8 text-muted-foreground/40 mx-auto mb-3" />
      <p className="text-sm font-medium mb-1">Shared files</p>
      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
        Documents, brand assets, and deliverables — synced with The Table portal.
      </p>
    </Card>
  );
}

function ProjectsTab({ projects }: { projects: typeof MOCK_PROJECTS }) {
  if (projects.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Briefcase className="size-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm font-medium mb-1">No active projects</p>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {projects.map((project) => (
        <Card key={project.id} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">{project.name}</p>
            <span className="text-xs text-muted-foreground capitalize">
              {project.status.replace("_", " ")}
            </span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 h-1.5 bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  project.status === "stalled"
                    ? "bg-warning"
                    : "bg-foreground/70"
                )}
                style={{ width: `${project.progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
              {project.progress}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Next: {project.nextMilestone}
          </p>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function EmptyHint({ text }: { text: string }) {
  return (
    <p className="text-xs text-muted-foreground italic px-3 py-2">{text}</p>
  );
}

function RelationshipPill({ status }: { status: string }) {
  const meta = pillMeta(status);
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium tabular-nums whitespace-nowrap",
        meta.bg,
        meta.fg
      )}
    >
      {meta.label}
    </span>
  );
}

function pillMeta(status: string) {
  switch (status) {
    case "client":
      return {
        label: "Client",
        bg: "bg-success/10",
        fg: "text-success",
      };
    case "prospect":
      return {
        label: "Prospect",
        bg: "bg-info/10",
        fg: "text-info",
      };
    case "past_client":
      return {
        label: "Past",
        bg: "bg-muted",
        fg: "text-muted-foreground",
      };
    case "partner":
      return {
        label: "Partner",
        bg: "bg-accent/10",
        fg: "text-accent",
      };
    case "vendor":
      return {
        label: "Vendor",
        bg: "bg-warning/10",
        fg: "text-warning",
      };
    case "internal":
      return {
        label: "Team",
        bg: "bg-foreground/5",
        fg: "text-foreground/70",
      };
    default:
      return {
        label: "Other",
        bg: "bg-muted",
        fg: "text-muted-foreground",
      };
  }
}

// keep imports stable
void Building2;
