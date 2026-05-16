"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Sparkles,
  Plus,
  ArrowRight,
  Building2,
  User as UserIcon,
  Network,
  Tag,
  Mail,
  Phone,
} from "lucide-react";
import { Avatar, AvatarFallback, Button, Card, AIButton } from "@repo/ui";
import { cn } from "@repo/utils";
import {
  MOCK_PEOPLE,
  MOCK_ORGANIZATIONS,
  MOCK_WORTH_REACHING_OUT,
  type MockPerson,
} from "@/app/_lib/demo";

/**
 * People page (/people).
 *
 * Unified directory of all relationships. AI-curated "Worth Attention"
 * is the default landing tab. All / Individuals / Organizations /
 * Internal are filter tabs.
 */

type Tab = "worth_attention" | "all" | "individuals" | "organizations" | "internal";

export function PeoplePage() {
  const [tab, setTab] = React.useState<Tab>("worth_attention");

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="size-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">People</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Everyone you work with — clients, prospects, partners, your team.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Search className="size-4" />
          </Button>
          <AIButton
            variant="icon"
            size="sm"
            onClick={triggerAskSalt}
            title="Ask SALT · ⌘K"
          >
            <Sparkles className="size-4" />
          </AIButton>
          <Button size="sm" className="h-8 gap-1.5">
            <Plus className="size-3.5" />
            New
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-border">
        <TabButton active={tab === "worth_attention"} onClick={() => setTab("worth_attention")}>
          <Sparkles className="size-3.5" />
          Worth Attention
          <span className="text-[10px] text-muted-foreground font-normal">
            ({MOCK_WORTH_REACHING_OUT.length})
          </span>
        </TabButton>
        <TabButton active={tab === "all"} onClick={() => setTab("all")}>
          All
        </TabButton>
        <TabButton active={tab === "individuals"} onClick={() => setTab("individuals")}>
          Individuals
        </TabButton>
        <TabButton active={tab === "organizations"} onClick={() => setTab("organizations")}>
          Organizations
        </TabButton>
        <TabButton active={tab === "internal"} onClick={() => setTab("internal")}>
          Internal
        </TabButton>
      </div>

      {tab === "worth_attention" && <WorthAttentionView />}
      {tab === "all" && <AllView />}
      {tab === "individuals" && <IndividualsView />}
      {tab === "organizations" && <OrganizationsView />}
      {tab === "internal" && <InternalView />}
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
// WORTH ATTENTION VIEW (default landing)
// ============================================================================

function WorthAttentionView() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
        <Sparkles className="size-3 text-primary" />
        <span>AI-curated based on recent activity, contract status, and meeting history.</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
        {MOCK_WORTH_REACHING_OUT.map((item) => {
          const person = MOCK_PEOPLE.find((p) => p.id === item.personId);
          if (!person) return null;
          return (
            <WorthAttentionCard
              key={item.personId}
              person={person}
              reason={item.reason}
              suggestedAction={item.suggestedAction}
            />
          );
        })}
      </div>

      {/* Below: brief summary of the rest */}
      <div className="flex items-center justify-between mt-8 mb-3">
        <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
          Everyone else
        </h2>
        <button
          type="button"
          onClick={() => {
            // Switch to All tab — would need state lifted up; for demo, simpler to just hint
          }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all →
        </button>
      </div>
      <div className="space-y-1">
        {MOCK_PEOPLE.filter((p) => !p.isInternal)
          .filter((p) => !MOCK_WORTH_REACHING_OUT.some((w) => w.personId === p.id))
          .slice(0, 4)
          .map((person) => (
            <PersonRow key={person.id} person={person} />
          ))}
      </div>
    </div>
  );
}

function WorthAttentionCard({
  person,
  reason,
  suggestedAction,
}: {
  person: MockPerson;
  reason: string;
  suggestedAction: string;
}) {
  return (
    <Link
      href={`/people/${person.id}`}
      className={cn(
        "group flex flex-col rounded-xl border border-border/60 bg-card p-4",
        "hover:border-foreground/20 hover:shadow-sm transition-all"
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="size-10 rounded-md">
          <AvatarFallback
            className={cn("rounded-md text-xs font-semibold", person.avatarColor)}
          >
            {person.avatar}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">{person.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {person.title}
            {person.organizationName ? ` · ${person.organizationName}` : ""}
          </p>
        </div>
        <RelationshipPill status={person.relationshipStatus} />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3 flex-1">
        {reason}
      </p>
      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors">
          <Sparkles className="size-3 text-primary" />
          {suggestedAction}
        </span>
        <ArrowRight className="size-3.5 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
      </div>
    </Link>
  );
}

// ============================================================================
// ALL / FILTERED VIEWS
// ============================================================================

function AllView() {
  return <PersonList people={MOCK_PEOPLE} />;
}

function IndividualsView() {
  return <PersonList people={MOCK_PEOPLE.filter((p) => !p.isInternal)} />;
}

function InternalView() {
  return <PersonList people={MOCK_PEOPLE.filter((p) => p.isInternal)} />;
}

function OrganizationsView() {
  return (
    <div className="space-y-1">
      {MOCK_ORGANIZATIONS.map((org) => (
        <Link
          key={org.id}
          href="#"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg",
            "hover:bg-muted/40 transition-colors group"
          )}
        >
          <Avatar className="size-9 rounded-md">
            <AvatarFallback
              className={cn("rounded-md text-[11px] font-semibold", org.avatarColor)}
            >
              {org.avatar}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{org.name}</p>
              <RelationshipPill status={org.relationshipStatus} />
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {org.industry} · {org.peopleCount} {org.peopleCount === 1 ? "person" : "people"}
              {org.mrr > 0 ? ` · $${(org.mrr / 1000).toFixed(1)}k MRR` : ""}
            </p>
          </div>
          <ArrowRight className="size-3.5 text-muted-foreground/30 group-hover:text-foreground/60 transition-colors" />
        </Link>
      ))}
    </div>
  );
}

function PersonList({ people }: { people: MockPerson[] }) {
  // Group by first letter
  const grouped = React.useMemo(() => {
    const sorted = [...people].sort((a, b) => a.name.localeCompare(b.name));
    const groups: Record<string, MockPerson[]> = {};
    for (const p of sorted) {
      const letter = p.name[0]?.toUpperCase() ?? "?";
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(p);
    }
    return groups;
  }, [people]);

  const letters = Object.keys(grouped).sort();

  return (
    <div>
      {letters.map((letter) => (
        <div key={letter} className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60 mb-1.5 px-3">
            {letter}
          </p>
          <div className="space-y-0.5">
            {grouped[letter].map((person) => (
              <PersonRow key={person.id} person={person} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PersonRow({ person }: { person: MockPerson }) {
  return (
    <Link
      href={`/people/${person.id}`}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg",
        "hover:bg-muted/40 transition-colors group"
      )}
    >
      <Avatar className="size-8 rounded-md">
        <AvatarFallback
          className={cn("rounded-md text-[10px] font-semibold", person.avatarColor)}
        >
          {person.avatar}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{person.name}</p>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {person.title}
          {person.organizationName ? ` · ${person.organizationName}` : ""}
        </p>
      </div>
      <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
        {person.lastContactDays !== null && (
          <span>
            {person.lastContactDays === 0
              ? "Today"
              : `${person.lastContactDays}d ago`}
          </span>
        )}
      </div>
      <RelationshipPill status={person.relationshipStatus} />
      <ArrowRight className="size-3.5 text-muted-foreground/30 group-hover:text-foreground/60 transition-colors" />
    </Link>
  );
}

// ============================================================================
// RELATIONSHIP STATUS PILL
// ============================================================================

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

// silence unused-icon warnings (reserved for future use)
void Building2;
void UserIcon;
void Network;
void Tag;
void Mail;
void Phone;
