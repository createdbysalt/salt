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
import { PersonConnectionsTab } from "./PersonConnectionsTab";
import { PersonPaymentsTab } from "./PersonPaymentsTab";
import { PersonNotesTab } from "./PersonNotesTab";
import { PersonFilesTab } from "./PersonFilesTab";
import { PersonActivityTab } from "./PersonActivityTab";
import { MemorySpacesCard } from "@/app/_features/memory/components/MemorySpacesCard";

import {
  findPerson,
  type Connection,
  type Person,
  type RecordStatus,
  type RelationshipType as DemoRelationshipType,
} from "@/app/_lib/demo/people-demo-data";
import { spacesForPerson } from "@/app/_lib/demo/spaces-demo-data";
import { MockContentEmptyState } from "@/app/_features/shell/components/MockContentEmptyState";
import type { PersonDetailSummary, RelationshipHealthResult } from "@/app/_features/people/queries";
import type { PersonActivityEvent } from "@/app/_features/people/utils/activity";
import type { PersonProfileFieldsView } from "@/app/_features/plays/playbooks/profile/types";

type PersonDetailPageProps = {
  personId: string;
  personSummary?: PersonDetailSummary | null;
  profileFields?: PersonProfileFieldsView | null;
  activity?: PersonActivityEvent[];
  health?: RelationshipHealthResult | null;
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

function personFromSummary(
  personId: string,
  personSummary: PersonDetailSummary | null,
  profileFields: PersonProfileFieldsView | null,
): Person | null {
  if (!personSummary) return null;

  const primaryOrg = personSummary.primaryOrg ?? profileFields?.primaryOrg ?? null;
  const title = personSummary.title ?? profileFields?.title ?? null;
  const relationshipType = personSummary.relationshipType ?? profileFields?.relationshipType ?? null;
  const summaryParts = [
    title ? `${personSummary.name} is ${title}` : `${personSummary.name} is a person in Memory`,
    primaryOrg?.name ? `connected to ${primaryOrg.name}` : null,
  ].filter(Boolean);

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
    lastContactAt: personSummary.updatedAt ?? new Date(0).toISOString(),
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
    summary: `${summaryParts.join(" ")}. Salt will fill this record as trusted context arrives.`,
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
}: PersonDetailPageProps) {
  const router = useRouter();
  const demoPerson = findPerson(personId);
  const isDemoPerson = Boolean(demoPerson);
  const person = demoPerson ?? personFromSummary(personId, personSummary, profileFields);

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
        <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-10">
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

  const spaces = spacesForPerson(person);
  const displayedActivity = isDemoPerson ? person.activity : activity;

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-10">
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

        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
          <div className="min-w-0 space-y-6">
            <Tabs value={tab} onValueChange={setTab} className="space-y-5">
              <TabsList className="bg-card border border-border/60 rounded-full p-1 h-auto flex-wrap">
                <TabsTrigger
                  value="overview"
                  className="rounded-full data-[state=active]:bg-foreground data-[state=active]:text-background px-4"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="connections"
                  className="rounded-full data-[state=active]:bg-foreground data-[state=active]:text-background px-4"
                >
                  Connections
                </TabsTrigger>
                <TabsTrigger
                  value="payments"
                  className="rounded-full data-[state=active]:bg-foreground data-[state=active]:text-background px-4"
                >
                  Payments
                </TabsTrigger>
                <TabsTrigger
                  value="files"
                  className="rounded-full data-[state=active]:bg-foreground data-[state=active]:text-background px-4"
                >
                  Files
                </TabsTrigger>
                <TabsTrigger
                  value="notes"
                  className="rounded-full data-[state=active]:bg-foreground data-[state=active]:text-background px-4"
                >
                  Notes
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="rounded-full data-[state=active]:bg-foreground data-[state=active]:text-background px-4"
                >
                  Activity
                </TabsTrigger>
              </TabsList>

              <div className="rounded-3xl border border-border/60 bg-card/60 p-6">
                <TabsContent value="overview" className="m-0">
                  <PersonOverviewTab
                    person={person}
                    personId={personId}
                    account={{
                      recordStatus,
                      onRecordStatusChange: setRecordStatus,
                      relationship,
                      onRelationshipChange: setRelationship,
                    }}
                    organization={organization}
                    onOrganizationChange={setOrganization}
                    onProfileFieldSaved={handleSavedProfileField}
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
                    personId={personId}
                    onActivityChanged={handleSavedProfileField}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <div className="space-y-6">
            <PersonHealthCard person={person} health={health} useDemoHealth={isDemoPerson} />
            <PersonPlaysCard person={person} useDemoPlays={isDemoPerson} />
            <MemorySpacesCard
              recordKind="person"
              recordId={person.id}
              recordName={person.name}
              shortName={person.name.split(" ")[0]}
              spaces={spaces}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
