"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui";
import { updateRecordStatus } from "@/app/_features/memory/actions/record-status";

import { OrgHero, type OrgQuickAction } from "./OrgHero";
import { OrgHealthCard } from "./OrgHealthCard";
import { OrgPlaysCard } from "./OrgPlaysCard";
import { OrgOverviewTab } from "./OrgOverviewTab";
import { UnifiedConnectionsTab } from "@/app/_features/connections/components/UnifiedConnectionsTab";
import type { ConnectionNode } from "@/app/_features/connections/types";
import { EntityNotesTab } from "@/app/_features/memory/components/EntityNotesTab";
import { OrgActivityTab } from "./OrgActivityTab";
import { linkedPeopleForOrg } from "@/app/_features/memory/components/linkableMemory";

import { findOrg } from "@/app/_lib/demo/orgs-demo-data";
import type { Connection, RecordStatus, RelationshipType } from "@/app/_lib/demo/people-demo-data";
import { MockContentEmptyState } from "@/app/_features/shell/components/MockContentEmptyState";
import type { OrgDetailData } from "@/app/_features/orgs/types";
import { toOrgDetailViewModel } from "@/app/_features/orgs/utils/detail-mapper";
import { RELATIONSHIP_TYPES } from "@/app/_features/memory/taxonomy/registry";
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
  linkableEntities?: import("@/app/_lib/notes").ResolvedEntity[];
};

function normalizeRelationship(value: string | null | undefined): RelationshipType {
  if (value === "other") return "unknown";
  return value && (RELATIONSHIP_TYPES as readonly string[]).includes(value)
    ? (value as RelationshipType)
    : "unknown";
}

export function OrgDetailPage({ orgId, detailData = null, linkableEntities = [] }: OrgDetailPageProps) {
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
    org?.relationship ??
      (detailData?.summary ? normalizeRelationship(detailData.summary.relationshipStatus) : "client"),
  );
  const [connections, setConnections] = useState<Connection[]>(org?.connections ?? []);
  const [unifiedConnections, setUnifiedConnections] = useState<ConnectionNode[]>(
    detailData?.unifiedConnections ?? []
  );

  const linkedPeople = org ? linkedPeopleForOrg(org.id, connections) : [];
  const [keyContactId, setKeyContactId] = useState(
    org?.keyContact?.id && linkedPeople.some((p) => p.id === org.keyContact!.id)
      ? org.keyContact.id
      : linkedPeople[0]?.id ?? "",
  );

  const keyContact = linkedPeople.find((p) => p.id === keyContactId);

  const handleLink = (connection: Connection) => {
    if (connections.some((c) => c.id === connection.id && c.type === connection.type)) return;

    setConnections((prev) => [...prev, connection]);
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
    if (connection.type === "person" && !keyContactId) {
      setKeyContactId(connection.id);
    }
    toast.success(`Connected ${connection.name}`);
    if (!isDemoOrg) router.refresh();
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
    (action: OrgQuickAction) => {
      if (action === "note") {
        setTab("notes");
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("entity:add-note"));
        }, 100);
        return;
      }
      setTab("overview");
      requestAnimationFrame(() => {
        if (action === "contact") {
          document.getElementById("org-contacts")?.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent("org:add-contact"));
          }, 400);
        }
      });
    },
    [],
  );

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
          onQuickAction={handleQuickAction}
        />

        <div className={memoryDetailGridClass}>
          <div className="min-w-0 space-y-6">
            <Tabs value={tab} onValueChange={setTab} className="space-y-5">
              <TabsList className={memoryTabsListClass}>
                {["overview", "connections", "notes", "activity"].map((value) => (
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
                    industryParent={detailData?.summary?.industryParent ?? null}
                    industryChild={detailData?.summary?.industryChild ?? null}
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
                      onRecordStatusChange: (next) => {
                        setRecordStatus(next);
                        void updateRecordStatus({
                          entityType: "org",
                          entityId: orgId,
                          status: next,
                        }).then((result) => {
                          if (!result.ok) toast.error(result.message);
                        });
                      },
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
                  <UnifiedConnectionsTab
                    recordKind="org"
                    recordId={orgId}
                    recordName={org.name}
                    connections={unifiedConnections}
                    onLink={handleLink}
                    onUnlink={handleUnlink}
                  />
                </TabsContent>
                <TabsContent value="notes" className="m-0">
                  <EntityNotesTab
                    entityType="organization"
                    entityId={orgId}
                    entityName={org.name}
                    notes={isDemoOrg ? [] : (detailData?.notes ?? [])}
                    linkableEntities={linkableEntities}
                    onRefresh={handleSavedProfileField}
                  />
                </TabsContent>
                <TabsContent value="activity" className="m-0">
                  <OrgActivityTab
                    activity={displayedActivity}
                    orgName={org.name}
                    narrative={isDemoOrg ? null : detailData?.summary?.aiNarrative ?? null}
                    lifecycleEvents={isDemoOrg ? [] : detailData?.lifecycleEvents ?? []}
                    sourceHistory={isDemoOrg ? [] : detailData?.sourceHistory ?? []}
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
