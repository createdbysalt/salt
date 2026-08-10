"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui";

import { PersonHero, type PersonQuickAction } from "./PersonHero";
import { PersonHealthCard } from "./PersonHealthCard";
import { PersonPlaysCard } from "./PersonPlaysCard";
import { PersonOverviewTab } from "./PersonOverviewTab";
import type { PersonProfileFieldsView } from "@/app/_features/plays/playbooks/records-engine/types";
import { UnifiedConnectionsTab } from "@/app/_features/connections/components/UnifiedConnectionsTab";
import type { ConnectionNode } from "@/app/_features/connections/types";
import { EntityNotesTab } from "@/app/_features/memory/components/EntityNotesTab";
import { PersonActivityTab } from "./PersonActivityTab";
import type { EntityNoteWithProvenance } from "@/app/_features/memory/types/taxonomies";
import {
  findPerson,
  type Connection,
  type Person,
  type RecordStatus,
  type RelationshipType as DemoRelationshipType,
} from "@/app/_lib/demo/people-demo-data";
import { MockContentEmptyState } from "@/app/_features/shell/components/MockContentEmptyState";
import { RELATIONSHIP_TYPES } from "@/app/_features/memory/taxonomy/registry";
import type { PersonDetailSummary, RelationshipHealthResult } from "@/app/_features/people/queries";
import type { PersonActivityEvent } from "@/app/_features/people/utils/activity";
import type { LifecycleEventDisplay } from "@/app/_features/memory/queries/lifecycle-events";
import type { SourceHistoryEntry } from "@/app/_features/memory/queries/source-history";
import type { BillingAccountMetrics } from "@/app/_features/billing/queries/billing-accounts";
import {
  buildPersonSummary,
  resolvePersonWorthAttention,
} from "@/app/_features/memory/utils/record-summary";
import type { FreshRecordNarrative } from "@/app/_features/memory/utils/record-narrative-cache";
import { updateRecordStatus } from "@/app/_features/memory/actions/record-status";
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
  sourceHistory?: SourceHistoryEntry[];
  billingMetrics?: BillingAccountMetrics | null;
  aiNarrative?: FreshRecordNarrative | null;
  notes?: EntityNoteWithProvenance[];
  unifiedConnections?: ConnectionNode[];
  linkableEntities?: import("@/app/_lib/notes").ResolvedEntity[];
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
  const value = relationshipType ?? relationshipStatus;
  if (value === "other") return "unknown";
  return value && (RELATIONSHIP_TYPES as readonly string[]).includes(value)
    ? (value as DemoRelationshipType)
    : "prospect";
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
    recordStatus: personSummary.recordStatus,
    email: personSummary.email ?? undefined,
    tags: [],
    lastContactAt: personSummary.lastContactAt ?? null,
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
  sourceHistory = [],
  billingMetrics = null,
  aiNarrative = null,
  notes = [],
  unifiedConnections: initialUnifiedConnections = [],
  linkableEntities = [],
}: PersonDetailPageProps) {
  const router = useRouter();
  const demoPerson = findPerson(personId);
  const isDemoPerson = Boolean(demoPerson);
  const person =
    demoPerson ?? personFromSummary(personId, personSummary, profileFields, health, aiNarrative);

  const [tab, setTab] = useState("overview");
  const [recordStatus, setRecordStatus] = useState<RecordStatus>(person?.recordStatus ?? "active");
  const [relationship, setRelationship] = useState<DemoRelationshipType>(person?.relationship ?? "prospect");
  const [organization, setOrganization] = useState(person?.org?.name ?? "");
  const [connections, setConnections] = useState<Connection[]>(person?.connections ?? []);
  const [unifiedConnections, setUnifiedConnections] = useState<ConnectionNode[]>(initialUnifiedConnections);

  const handleLink = (connection: Connection) => {
    setConnections((prev) => {
      if (prev.some((c) => c.id === connection.id && c.type === connection.type)) return prev;
      return [...prev, connection];
    });
    setUnifiedConnections((current) => {
      const nodeType = connection.type as ConnectionNode["nodeType"];
      const nodeId = `${nodeType}:${connection.id}`;
      if (current.some((n) => n.id === nodeId)) return current;
      const hrefMap: Record<string, string> = {
        person: "people",
        org: "orgs",
        work: "work",
        billing: "billing",
        meeting: "meetings",
        conversation: "conversations",
      };
      const pathSegment = hrefMap[nodeType] ?? nodeType;
      return [
        ...current,
        {
          id: nodeId,
          nodeType,
          label: connection.name,
          sublabel: connection.subtitle,
          href: `/${pathSegment}/${connection.id}`,
        },
      ];
    });
    toast.success(`Connected ${connection.name}`);
  };

  const handleUnlink = (node: ConnectionNode) => {
    setUnifiedConnections((current) => current.filter((n) => n.id !== node.id));
    const entityId = node.id.split(":")[1] ?? node.id;
    setConnections((prev) => prev.filter((c) => c.id !== entityId || c.type !== node.nodeType));
  };

  const handleSavedProfileField = () => {
    router.refresh();
  };

  const handleQuickAction = useCallback(
    (action: PersonQuickAction) => {
      if (action === "note") {
        setTab("notes");
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("entity:add-note"));
        }, 100);
        return;
      }
      setTab("overview");
      requestAnimationFrame(() => {
        if (action === "relationship") {
          document.getElementById("person-relationship")?.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent("person:change-relationship"));
          }, 400);
        }
      });
    },
    [],
  );

  if (!person && !personSummary && !profileFields) {
    return (
      <div className="relative min-h-full">
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
          onQuickAction={handleQuickAction}
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
                      onRecordStatusChange: (next) => {
                        setRecordStatus(next);
                        void updateRecordStatus({
                          entityType: "person",
                          entityId: personId,
                          status: next,
                        }).then((result) => {
                          if (!result.ok) toast.error(result.message);
                        });
                      },
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
                  <UnifiedConnectionsTab
                    recordKind="person"
                    recordId={personId}
                    recordName={person.name}
                    connections={unifiedConnections}
                    onLink={handleLink}
                    onUnlink={handleUnlink}
                  />
                </TabsContent>
                <TabsContent value="notes" className="m-0">
                  <EntityNotesTab
                    entityType="person"
                    entityId={personId}
                    entityName={person?.name ?? "Person"}
                    notes={isDemoPerson ? [] : notes}
                    linkableEntities={linkableEntities}
                  />
                </TabsContent>
                <TabsContent value="activity" className="m-0">
                  <PersonActivityTab
                    activity={displayedActivity}
                    personName={person.name}
                    narrative={isDemoPerson ? null : aiNarrative}
                    lifecycleEvents={isDemoPerson ? [] : lifecycleEvents}
                    sourceHistory={isDemoPerson ? [] : sourceHistory}
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
