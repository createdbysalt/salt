"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui";
import { MemorySpacesCard } from "@/app/_features/memory/components/MemorySpacesCard";
import { linkedPeopleForOrg } from "@/app/_features/memory/components/linkableMemory";
import {
  findOrg,
  type Org,
} from "@/app/_lib/demo/orgs-demo-data";
import {
  type Connection,
  type RecordStatus,
  type RelationshipType,
} from "@/app/_lib/demo/people-demo-data";
import { spacesForOrg } from "@/app/_lib/demo/spaces-demo-data";
import { useMockContent } from "@/app/_features/shell/contexts/DashboardUserContext";
import { MockContentEmptyState } from "@/app/_features/shell/components/MockContentEmptyState";
import { OrgHero } from "./OrgHero";
import { OrgHealthCard } from "./OrgHealthCard";
import { OrgPlaysCard } from "./OrgPlaysCard";
import { OrgOverviewTab } from "./OrgOverviewTab";
import { OrgConnectionsTab } from "./OrgConnectionsTab";
import { OrgPaymentsTab } from "./OrgPaymentsTab";
import { OrgNotesTab } from "./OrgNotesTab";
import { OrgFilesTab } from "./OrgFilesTab";
import { OrgActivityTab } from "./OrgActivityTab";

type OrgDetailPageProps = {
  orgId: string;
};

export function OrgDetailPage({ orgId }: OrgDetailPageProps) {
  const mockContent = useMockContent();
  const org = mockContent ? findOrg(orgId) : undefined;

  if (!org) {
    return (
      <MockContentEmptyState
        title="Organization not found"
        description="This organization is not in your workspace yet."
      />
    );
  }

  return <OrgDetailContent org={org} />;
}

function OrgDetailContent({ org }: { org: Org }) {
  const [connections, setConnections] = useState<Connection[]>(org.connections);
  const linkedPeople = linkedPeopleForOrg(org.id, connections);
  const [tab, setTab] = useState("overview");
  const [recordStatus, setRecordStatus] = useState<RecordStatus>(org.recordStatus ?? "active");
  const [relationship, setRelationship] = useState<RelationshipType>(org.relationship);
  const [keyContactId, setKeyContactId] = useState(
    org.keyContact?.id && linkedPeople.some((p) => p.id === org.keyContact!.id)
      ? org.keyContact.id
      : (linkedPeople[0]?.id ?? ""),
  );

  const keyContact = linkedPeople.find((p) => p.id === keyContactId);

  const handleLink = (connection: Connection) => {
    setConnections((prev) => {
      if (prev.some((c) => c.id === connection.id && c.type === connection.type)) return prev;
      return [...prev, connection];
    });
    if (connection.type === "person" && !keyContactId) {
      setKeyContactId(connection.id);
    }
    toast.success(`Connected ${connection.name}`);
  };

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-10">
        <Link
          href="/orgs"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition mb-2"
        >
          <ArrowLeft className="size-3.5" strokeWidth={2} />
          Back to Orgs
        </Link>

        <OrgHero
          org={org}
          recordStatus={recordStatus}
          relationship={relationship}
          keyContactName={keyContact?.name}
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
                  <OrgOverviewTab
                    org={org}
                    account={{
                      recordStatus,
                      onRecordStatusChange: setRecordStatus,
                      relationship,
                      onRelationshipChange: setRelationship,
                    }}
                    connections={connections}
                    keyContactId={keyContactId}
                    onKeyContactChange={setKeyContactId}
                  />
                </TabsContent>
                <TabsContent value="connections" className="m-0">
                  <OrgConnectionsTab org={org} connections={connections} />
                </TabsContent>
                <TabsContent value="payments" className="m-0">
                  <OrgPaymentsTab org={org} />
                </TabsContent>
                <TabsContent value="notes" className="m-0">
                  <OrgNotesTab org={org} />
                </TabsContent>
                <TabsContent value="files" className="m-0">
                  <OrgFilesTab org={org} />
                </TabsContent>
                <TabsContent value="activity" className="m-0">
                  <OrgActivityTab org={org} />
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <div className="space-y-6">
            <OrgHealthCard org={org} />
            <OrgPlaysCard org={org} />
            <MemorySpacesCard
              recordKind="org"
              recordId={org.id}
              recordName={org.name}
              shortName={org.name.split(" ")[0]}
              spaces={spacesForOrg(org)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
