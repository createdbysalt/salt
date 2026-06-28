"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui";

import { OrgHero } from "./OrgHero";
import { OrgHealthCard } from "./OrgHealthCard";
import { OrgPlaysCard } from "./OrgPlaysCard";
import { OrgOverviewTab } from "./OrgOverviewTab";
import { OrgConnectionsTab } from "./OrgConnectionsTab";
import { OrgPaymentsTab } from "./OrgPaymentsTab";
import { OrgNotesTab } from "./OrgNotesTab";
import { OrgFilesTab } from "./OrgFilesTab";
import { OrgActivityTab } from "./OrgActivityTab";
import { linkedPeopleForOrg } from "@/app/_features/memory/components/linkableMemory";
import { persistOrgConnection } from "@/app/_features/orgs/actions/connections";

import { findOrg } from "@/app/_lib/demo/orgs-demo-data";
import type { Connection, RecordStatus, RelationshipType } from "@/app/_lib/demo/people-demo-data";
import { MockContentEmptyState } from "@/app/_features/shell/components/MockContentEmptyState";
import type { OrgDetailData } from "@/app/_features/orgs/types";
import { toOrgDetailViewModel } from "@/app/_features/orgs/utils/detail-mapper";
import { orgStatusToDisplay } from "@/app/_features/orgs/utils/relationship-display";
import {
  memoryDetailGridClass,
  memoryDetailShellClass,
  memoryTabPanelClass,
  memoryTabsListClass,
  memoryTabTriggerClass,
} from "@/app/_features/memory/utils/memory-layout";

type OrgDetailPageProps = {
  orgId: string;
  detailData?: OrgDetailData | null;
};

export function OrgDetailPage({ orgId, detailData = null }: OrgDetailPageProps) {
  const router = useRouter();
  const demoOrg = findOrg(orgId);
  const isDemoOrg = Boolean(demoOrg);
  const org =
    demoOrg ??
    (detailData?.summary
      ? toOrgDetailViewModel({
          summary: detailData.summary,
          connections: detailData.connections,
          work: detailData.work,
          invoices: detailData.invoices,
          files: detailData.files,
          notes: detailData.notes,
        })
      : undefined);

  const [tab, setTab] = useState("overview");
  const [recordStatus, setRecordStatus] = useState<RecordStatus>(org?.recordStatus ?? "active");
  const [relationship, setRelationship] = useState<RelationshipType>(
    org?.relationship ?? (detailData?.summary ? orgStatusToDisplay(detailData.summary.relationshipStatus) : "Client"),
  );
  const [connections, setConnections] = useState<Connection[]>(org?.connections ?? []);

  const linkedPeople = org ? linkedPeopleForOrg(org.id, connections) : [];
  const [keyContactId, setKeyContactId] = useState(
    org?.keyContact?.id && linkedPeople.some((p) => p.id === org.keyContact!.id)
      ? org.keyContact.id
      : linkedPeople[0]?.id ?? "",
  );

  const keyContact = linkedPeople.find((p) => p.id === keyContactId);

  const handleLink = async (connection: Connection) => {
    if (connections.some((c) => c.id === connection.id && c.type === connection.type)) return;

    if (!isDemoOrg) {
      const result = await persistOrgConnection({ orgId, connection });
      if (!result.success) {
        toast.error(result.error ?? "Could not create connection");
        return;
      }
    }

    setConnections((prev) => [...prev, connection]);
    if (connection.type === "person" && !keyContactId) {
      setKeyContactId(connection.id);
    }
    toast.success(`Connected ${connection.name}`);
    if (!isDemoOrg) router.refresh();
  };

  const handleSavedProfileField = () => {
    router.refresh();
  };

  if (!org && !detailData?.summary) {
    return (
      <div className="relative min-h-full">
        <div aria-hidden className="salt-ambient-wash" />
        <div className={memoryDetailShellClass}>
          <Link
            href="/orgs"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition mb-2"
          >
            <ArrowLeft className="size-3.5" strokeWidth={2} />
            Back to Organizations
          </Link>
          <MockContentEmptyState
            title="Organization not found"
            description="This organization is not in your workspace yet."
          />
        </div>
      </div>
    );
  }

  if (!org) return null;

  const displayedActivity = isDemoOrg ? org.activity : (detailData?.activity ?? []);
  const displayedNotes = isDemoOrg ? org.notes : (detailData?.notes ?? []);

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className={memoryDetailShellClass}>
        <Link
          href="/orgs"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition mb-2"
        >
          <ArrowLeft className="size-3.5" strokeWidth={2} />
          Back to Organizations
        </Link>

        <OrgHero
          org={org}
          recordStatus={recordStatus}
          relationship={relationship}
          keyContactName={keyContact?.name}
          connections={connections}
          onLink={handleLink}
        />

        <div className={memoryDetailGridClass}>
          <div className="min-w-0 space-y-6">
            <Tabs value={tab} onValueChange={setTab} className="space-y-5">
              <TabsList className={memoryTabsListClass}>
                {["overview", "connections", "payments", "files", "notes", "activity"].map((value) => (
                  <TabsTrigger key={value} value={value} className={memoryTabTriggerClass}>
                    {value}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className={memoryTabPanelClass}>
                <TabsContent value="overview" className="m-0">
                  <OrgOverviewTab
                    org={org}
                    orgId={orgId}
                    address={
                      detailData?.summary
                        ? {
                            addressLine1: detailData.summary.addressLine1 ?? "",
                            addressLine2: detailData.summary.addressLine2 ?? "",
                            city: detailData.summary.city ?? "",
                            state: detailData.summary.state ?? "",
                            postalCode: detailData.summary.postalCode ?? "",
                            country: detailData.summary.country ?? "",
                          }
                        : null
                    }
                    taxId={detailData?.summary?.taxId ?? null}
                    billingEmail={detailData?.summary?.billingEmail ?? null}
                    billingMetrics={detailData?.billingMetrics ?? null}
                    isDemoOrg={isDemoOrg}
                    account={{
                      recordStatus,
                      onRecordStatusChange: setRecordStatus,
                      relationship,
                      onRelationshipChange: setRelationship,
                    }}
                    connections={connections}
                    keyContactId={keyContactId}
                    onKeyContactChange={setKeyContactId}
                    onProfileFieldSaved={handleSavedProfileField}
                    recordUpdatedAt={detailData?.summary?.updatedAt ?? null}
                  />
                </TabsContent>
                <TabsContent value="connections" className="m-0">
                  <OrgConnectionsTab org={org} connections={connections} />
                </TabsContent>
                <TabsContent value="payments" className="m-0">
                  <OrgPaymentsTab org={org} hasBillingLink={Boolean(detailData?.summary?.migratedFromClientId)} />
                </TabsContent>
                <TabsContent value="files" className="m-0">
                  <OrgFilesTab org={org} hasFileSource={Boolean(detailData?.summary?.migratedFromClientId)} />
                </TabsContent>
                <TabsContent value="notes" className="m-0">
                  <OrgNotesTab
                    org={org}
                    notes={displayedNotes}
                    isDemoOrg={isDemoOrg}
                    onNotesChanged={handleSavedProfileField}
                  />
                </TabsContent>
                <TabsContent value="activity" className="m-0">
                  <OrgActivityTab
                    activity={displayedActivity}
                    orgName={org.name}
                    narrative={isDemoOrg ? null : detailData?.summary?.aiNarrative ?? null}
                    lifecycleEvents={isDemoOrg ? [] : detailData?.lifecycleEvents ?? []}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <div className="space-y-6">
            <OrgHealthCard org={org} health={detailData?.health ?? null} useDemoHealth={isDemoOrg} />
            <OrgPlaysCard org={org} useDemoPlays={isDemoOrg} />
          </div>
        </div>
      </div>
    </div>
  );
}
