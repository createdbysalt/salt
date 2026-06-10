"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui";
import { MemorySpacesCard } from "@/app/_features/memory/components/MemorySpacesCard";
import {
  findPerson,
  type Connection,
  type RecordStatus,
  type RelationshipType,
} from "@/app/_lib/demo/people-demo-data";
import { spacesForPerson } from "@/app/_lib/demo/spaces-demo-data";
import { useMockContent } from "@/app/_features/shell/contexts/DashboardUserContext";
import { MockContentEmptyState } from "@/app/_features/shell/components/MockContentEmptyState";
import { PersonHero } from "./PersonHero";
import { PersonHealthCard } from "./PersonHealthCard";
import { PersonPlaysCard } from "./PersonPlaysCard";
import { PersonOverviewTab } from "./PersonOverviewTab";
import { PersonConnectionsTab } from "./PersonConnectionsTab";
import { PersonPaymentsTab } from "./PersonPaymentsTab";
import { PersonNotesTab } from "./PersonNotesTab";
import { PersonFilesTab } from "./PersonFilesTab";
import { PersonActivityTab } from "./PersonActivityTab";

type PersonDetailPageProps = {
  personId: string;
};

export function PersonDetailPage({ personId }: PersonDetailPageProps) {
  const mockContent = useMockContent();
  const person = mockContent ? findPerson(personId) : undefined;
  const [tab, setTab] = useState("overview");
  const [recordStatus, setRecordStatus] = useState<RecordStatus>(
    person?.recordStatus ?? "active"
  );
  const [relationship, setRelationship] = useState<RelationshipType>(
    person?.relationship ?? "Client"
  );
  const [organization, setOrganization] = useState(person?.org?.name ?? "");
  const [connections, setConnections] = useState<Connection[]>(
    person?.connections ?? []
  );

  if (!person) {
    return (
      <MockContentEmptyState
        title="Person not found"
        description="This contact is not in your workspace yet. Add people from Capture or connect your CRM."
      />
    );
  }

  const handleLink = (connection: Connection) => {
    setConnections((prev) => {
      if (prev.some((c) => c.id === connection.id && c.type === connection.type)) return prev;
      return [...prev, connection];
    });
    toast.success(`Connected ${connection.name}`);
  };

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
                    account={{
                      recordStatus,
                      onRecordStatusChange: setRecordStatus,
                      relationship,
                      onRelationshipChange: setRelationship,
                    }}
                    organization={organization}
                    onOrganizationChange={setOrganization}
                  />
                </TabsContent>
                <TabsContent value="connections" className="m-0">
                  <PersonConnectionsTab person={person} connections={connections} />
                </TabsContent>
                <TabsContent value="payments" className="m-0">
                  <PersonPaymentsTab person={person} />
                </TabsContent>
                <TabsContent value="notes" className="m-0">
                  <PersonNotesTab person={person} />
                </TabsContent>
                <TabsContent value="files" className="m-0">
                  <PersonFilesTab person={person} />
                </TabsContent>
                <TabsContent value="activity" className="m-0">
                  <PersonActivityTab person={person} />
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <div className="space-y-6">
            <PersonHealthCard person={person} />
            <PersonPlaysCard person={person} />
            <MemorySpacesCard
              recordKind="person"
              recordId={person.id}
              recordName={person.name}
              shortName={person.name.split(" ")[0] ?? person.name}
              spaces={spacesForPerson(person)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
