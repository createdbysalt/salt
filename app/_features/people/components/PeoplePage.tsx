"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Building2,
  User as UserIcon,
  Network,
  Tag,
  Mail,
  Phone,
  DollarSign,
} from "lucide-react";
import { Avatar, AvatarFallback, Card, AIButton, StatusPill } from "@repo/ui";
import { PageBanner } from "@repo/patterns";
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
 * is the default landing tab. All / People / Companies /
 * Internal are filter tabs.
 */

type Tab = "worth_attention" | "all" | "people" | "companies" | "internal";

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

const TABS = [
  {
    label: (
      <span className="flex items-center">
        <Sparkles className="mr-1.5 size-3.5" />
        Worth Attention
        {MOCK_WORTH_REACHING_OUT.length > 0 && (
          <TabBadge count={MOCK_WORTH_REACHING_OUT.length} />
        )}
      </span>
    ),
    value: "worth_attention" as const,
  },
  { label: "All", value: "all" as const },
  { label: "People", value: "people" as const },
  { label: "Companies", value: "companies" as const },
  { label: "Internal", value: "internal" as const },
];

export function PeoplePage() {
  const [tab, setTab] = React.useState<Tab>("worth_attention");

  return (
    <div className="w-full px-16 py-8">
      <PageBanner
        size="hero"
        eyebrow="RELATIONSHIPS"
        title="People"
        subtitle="People and companies Salt keeps organized from captures, notes, work, and payment signals. You review, correct, and decide."
        tabs={TABS}
        activeTab={tab}
        onTabChange={(value) => setTab(value as Tab)}
        fullWidthDivider
        actions={
          <AIButton size="sm" onClick={triggerAskSalt} title="Ask Salt · ⌘K">
            <Sparkles className="size-3.5" />
            Ask Salt
          </AIButton>
        }
      />

      {tab === "worth_attention" && <WorthAttentionView />}
      {tab === "all" && <AllView />}
      {tab === "people" && <PeopleOnlyView />}
      {tab === "companies" && <CompaniesView />}
      {tab === "internal" && <InternalView />}
    </div>
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
        <span>
          AI-curated based on recent activity, work status, payment context, and meeting history.
        </span>
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
        <Avatar className="size-10 ring-1 ring-border">
          <AvatarFallback
            className={cn("text-xs font-semibold", person.avatarColor)}
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
      <PaymentSignal person={person} />
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

function PeopleOnlyView() {
  return <PersonList people={MOCK_PEOPLE.filter((p) => !p.isInternal)} />;
}

function InternalView() {
  return <PersonList people={MOCK_PEOPLE.filter((p) => p.isInternal)} />;
}

function CompaniesView() {
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
          <Avatar className="size-9 ring-1 ring-border">
            <AvatarFallback
              className={cn("text-[11px] font-semibold", org.avatarColor)}
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
            {org.insights.length > 0 && (
              <p className="text-[10px] text-muted-foreground/70 truncate">
                {org.insights[0]}
              </p>
            )}
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
      <Avatar className="size-8 ring-1 ring-border">
        <AvatarFallback
          className={cn("text-[10px] font-semibold", person.avatarColor)}
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
        <PaymentSignal person={person} compact />
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

function PaymentSignal({
  person,
  compact = false,
}: {
  person: MockPerson;
  compact?: boolean;
}) {
  const signal = getPaymentSignal(person);
  if (!signal) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs text-muted-foreground",
        !compact && "mb-3"
      )}
    >
      <DollarSign className="size-3 text-warning" />
      {signal}
    </span>
  );
}

// ============================================================================
// RELATIONSHIP STATUS PILL
// ============================================================================

function RelationshipPill({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    client: "var(--relationship-clients)",
    prospect: "var(--relationship-clients)",
    past_client: "var(--relationship-team)",
    partner: "var(--relationship-partners)",
    vendor: "var(--relationship-vendors)",
    internal: "var(--relationship-team)",
  };
  const labelMap: Record<string, string> = {
    client: "CLIENT",
    prospect: "PROSPECT",
    past_client: "PAST",
    partner: "PARTNER",
    vendor: "VENDOR",
    internal: "TEAM",
  };
  return (
    <StatusPill
      color={colorMap[status] ?? "var(--relationship-team)"}
      label={labelMap[status] ?? "OTHER"}
    />
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

function getPaymentSignal(person: MockPerson) {
  if (person.outstandingAmount > 0) {
    return `$${person.outstandingAmount.toLocaleString()} outstanding`;
  }

  if (person.lifetimeValue > 0) {
    return `$${person.lifetimeValue.toLocaleString()} lifetime`;
  }

  return null;
}

// silence unused-icon warnings (reserved for future use)
void Building2;
void UserIcon;
void Network;
void Tag;
void Mail;
void Phone;
