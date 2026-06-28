"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui";

import { PersonHero } from "./PersonHero";
import { PersonHealthCard } from "./PersonHealthCard";
import { PersonPlaysCard } from "./PersonPlaysCard";
import { PersonOverviewTab } from "./PersonOverviewTab";
import type { PersonProfileFieldsView } from "@/app/_features/plays/playbooks/profile/types";
import { PersonConnectionsTab } from "./PersonConnectionsTab";
import { PersonPaymentsTab } from "./PersonPaymentsTab";
import { PersonNotesTab } from "./PersonNotesTab";
import { PersonFilesTab } from "./PersonFilesTab";
import { PersonActivityTab } from "./PersonActivityTab";
import {
  findPerson,
  type Connection,
  type Person,
  type RecordStatus,
  type RelationshipType as DemoRelationshipType,
} from "@/app/_lib/demo/people-demo-data";
import { MockContentEmptyState } from "@/app/_features/shell/components/MockContentEmptyState";
import type { PersonDetailSummary, RelationshipHealthResult } from "@/app/_features/people/queries";
import type { PersonActivityEvent } from "@/app/_features/people/utils/activity";
import type { LifecycleEventDisplay } from "@/app/_features/memory/queries/lifecycle-events";
import type { BillingAccountMetrics } from "@/app/_features/billing/queries/billing-accounts";
import {
  buildPersonSummary,
  resolvePersonWorthAttention,
} from "@/app/_features/memory/utils/record-summary";
import type { FreshRecordNarrative } from "@/app/_features/memory/utils/record-narrative-cache";
import type { HealthBand } from "@/app/_lib/health/core";
import {
  memoryDetailGridClass,
  memoryDetailShellClass,
  memoryTabPanelClass,
  memoryTabsListClass,
  memoryTabTriggerClass,
} from "@/app/_features/memory/utils/memory-layout";

type PersonDetailPageProps = {
  personId: string;
  personSummary?: PersonDetailSummary | null;
  profileFields?: PersonProfileFieldsView | null;
  activity?: PersonActivityEvent[];
  health?: RelationshipHealthResult | null;
  lifecycleEvents?: LifecycleEventDisplay[];
  billingMetrics?: BillingAccountMetrics | null;
  aiNarrative?: FreshRecordNarrative | null;
};

function initialsFromName(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "?"
  );
}

function mapRelationship(
  relationshipType: PersonDetailSummary["relationshipType"],
  relationshipStatus: PersonDetailSummary["relationshipStatus"],
): DemoRelationshipType {
  switch (relationshipType ?? relationshipStatus) {
    case "client":
      return "Client";
    case "partner":
      return "Partner";
    case "vendor":
      return "Vendor";
    case "team":
      return "Internal";
    case "past_client":
      return "Past client";
    case "personal":
      return "Personal";
    case "unknown":
      return "Unknown";
    case "prospect":
    default:
      return "Prospect";
  }
}

function mapHealthBandToWorthAttention(
  band: HealthBand | null | undefined,
): "good" | "watch" | "risk" | null {
  switch (band) {
    case "healthy":
      return "good";
    case "watch":
      return "watch";
    case "risk":
      return "risk";
    default:
      return null;
  }
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function personFromSummary(
  personId: string,
  personSummary: PersonDetailSummary | null,
  profileFields: PersonProfileFieldsView | null,
  health: RelationshipHealthResult | null,
  aiNarrative: FreshRecordNarrative | null,
): Person | null {
  if (!personSummary) return null;

  const primaryOrg = personSummary.primaryOrg ?? profileFields?.primaryOrg ?? null;
  const title = personSummary.title ?? profileFields?.title ?? null;
  const relationshipType = personSummary.relationshipType ?? profileFields?.relationshipType ?? null;

  const composedSummary = buildPersonSummary({
    name: personSummary.name,
    title,
    relationshipType,
    primaryOrg: primaryOrg ? { name: primaryOrg.name } : null,
    activeWork: personSummary.metrics.activeWork,
    mrrCents: personSummary.metrics.mrrCents,
    retainerLabel: personSummary.metrics.retainerLabel,
    outstandingCents: personSummary.metrics.outstandingCents,
    meetingWithinDays: personSummary.metrics.meetingWithinDays,
  });

  const deterministicWorthAttention = resolvePersonWorthAttention({
    relationshipType,
    activeWork: personSummary.metrics.activeWork,
    outstandingCents: personSummary.metrics.outstandingCents,
    mrrCents: personSummary.metrics.mrrCents,
    meetingWithinDays: personSummary.metrics.meetingWithinDays,
    healthBand: mapHealthBandToWorthAttention(health?.band),
    lastContactDaysAgo: daysSince(personSummary.lastContactAt),
  });

  const summary = aiNarrative?.summary ?? composedSummary;
  const worthAttention = aiNarrative?.worthAttention.reason
    ? {
        reason: aiNarrative.worthAttention.reason,
        suggestedPlay: aiNarrative.worthAttention.suggestedPlay,
      }
    : { reason: deterministicWorthAttention, suggestedPlay: "" };

  return {
    id: personId,
    name: personSummary.name,
    initials: initialsFromName(personSummary.name),
    role: title ?? undefined,
    org: primaryOrg ? { id: primaryOrg.id, name: primaryOrg.name } : undefined,
    relationship: mapRelationship(relationshipType, personSummary.relationshipStatus),
    lifecycle: "New",
    recordStatus: "active",
    email: personSummary.email ?? undefined,
    tags: [],
    lastContactAt: personSummary.lastContactAt ?? new Date(0).toISOString(),
    source: "salt_inferred",
    signals: [],
    metrics: {
      activeWork: personSummary.metrics.activeWork,
      outstandingCents: personSummary.metrics.outstandingCents,
      meetingWithinDays: personSummary.metrics.meetingWithinDays ?? undefined,
      health: "good",
    },
    retainerLabel: personSummary.metrics.retainerLabel ?? undefined,
    mrrCents: personSummary.metrics.mrrCents ?? undefined,
    summary,
    worthAttention,
    work: [],
    invoices: [],
    files: [],
    notes: [],
    activity: [],
    connections: primaryOrg
      ? [
          {
            id: primaryOrg.id,
            name: primaryOrg.name,
            type: "org",
            subtitle: "Primary organization",
          },
        ]
      : [],
  };
}

export function PersonDetailPage({
  personId,
  personSummary = null,
  profileFields = null,
  activity = [],
  health = null,
  lifecycleEvents = [],
  billingMetrics = null,
  aiNarrative = null,
}: PersonDetailPageProps) {
  const router = useRouter();
  const demoPerson = findPerson(personId);
  const isDemoPerson = Boolean(demoPerson);
  const person =
    demoPerson ?? personFromSummary(personId, personSummary, profileFields, health, aiNarrative);

  const [tab, setTab] = useState("overview");
  const [recordStatus, setRecordStatus] = useState<RecordStatus>(person?.recordStatus ?? "active");
  const [relationship, setRelationship] = useState<DemoRelationshipType>(person?.relationship ?? "Prospect");
  const [organization, setOrganization] = useState(person?.org?.name ?? "");
  const [connections, setConnections] = useState<Connection[]>(person?.connections ?? []);

  const handleLink = (connection: Connection) => {
    setConnections((prev) => {
      if (prev.some((c) => c.id === connection.id && c.type === connection.type)) return prev;
      return [...prev, connection];
    });
    toast.success(`Connected ${connection.name}`);
  };

  const handleSavedProfileField = () => {
    router.refresh();
  };

  if (!person && !personSummary && !profileFields) {
    return (
      <div className="relative min-h-full">
        <div aria-hidden className="salt-ambient-wash" />
        <div className={memoryDetailShellClass}>
          <Link
            href="/people"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition mb-2"
          >
            <ArrowLeft className="size-3.5" strokeWidth={2} />
            Back to People
          </Link>
          <MockContentEmptyState
            title="Person not found"
            description="This contact is not in your workspace yet. Add people from Capture or connect your CRM."
          />
        </div>
      </div>
    );
  }

  if (!person) return null;

  const displayedActivity = isDemoPerson ? person.activity : activity;

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className={memoryDetailShellClass}>
        <Link
          href="/people"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition mb-2"
        >
          <ArrowLeft className="size-3.5" strokeWidth={2} />
          Back to People
        </Link>

        <PersonHero
          person={person}
          recordStatus={recordStatus}
          relationship={relationship}
          organization={organization}
          connections={connections}
          onLink={handleLink}
        />

        <div className={memoryDetailGridClass}>
          <div className="min-w-0 space-y-6">
            <Tabs value={tab} onValueChange={setTab} className="space-y-5">
              <TabsList className={memoryTabsListClass}>
                <TabsTrigger value="overview" className={memoryTabTriggerClass}>
                  Overview
                </TabsTrigger>
                <TabsTrigger value="connections" className={memoryTabTriggerClass}>
                  Connections
                </TabsTrigger>
                <TabsTrigger value="payments" className={memoryTabTriggerClass}>
                  Payments
                </TabsTrigger>
                <TabsTrigger value="files" className={memoryTabTriggerClass}>
                  Files
                </TabsTrigger>
                <TabsTrigger value="notes" className={memoryTabTriggerClass}>
                  Notes
                </TabsTrigger>
                <TabsTrigger value="activity" className={memoryTabTriggerClass}>
                  Activity
                </TabsTrigger>
              </TabsList>

              <div className={memoryTabPanelClass}>
                <TabsContent value="overview" className="m-0">
                  <PersonOverviewTab
                    person={person}
                    personId={personId}
                    address={
                      personSummary
                        ? {
                            addressLine1: personSummary.addressLine1 ?? "",
                            addressLine2: personSummary.addressLine2 ?? "",
                            city: personSummary.city ?? "",
                            state: personSummary.state ?? "",
                            postalCode: personSummary.postalCode ?? "",
                            country: personSummary.country ?? "",
                          }
                        : null
                    }
                    billingEmail={personSummary?.billingEmail ?? null}
                    timezone={personSummary?.timezone ?? null}
                    billingMetrics={billingMetrics}
                    account={{
                      recordStatus,
                      onRecordStatusChange: setRecordStatus,
                      relationship,
                      onRelationshipChange: setRelationship,
                    }}
                    organization={organization}
                    onOrganizationChange={setOrganization}
                    onProfileFieldSaved={handleSavedProfileField}
                    isDemoPerson={isDemoPerson}
                    recordUpdatedAt={personSummary?.updatedAt ?? null}
                  />
                </TabsContent>
                <TabsContent value="connections" className="m-0">
                  <PersonConnectionsTab person={person} connections={connections} />
                </TabsContent>
                <TabsContent value="payments" className="m-0">
                  <PersonPaymentsTab person={person} />
                </TabsContent>
                <TabsContent value="files" className="m-0">
                  <PersonFilesTab person={person} />
                </TabsContent>
                <TabsContent value="notes" className="m-0">
                  <PersonNotesTab person={person} />
                </TabsContent>
                <TabsContent value="activity" className="m-0">
                  <PersonActivityTab
                    activity={displayedActivity}
                    personName={person.name}
                    narrative={isDemoPerson ? null : aiNarrative}
                    lifecycleEvents={isDemoPerson ? [] : lifecycleEvents}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <div className="space-y-6">
            <PersonHealthCard person={person} health={health} useDemoHealth={isDemoPerson} />
            <PersonPlaysCard person={person} useDemoPlays={isDemoPerson} />
          </div>
        </div>
      </div>
    </div>
  );
}
