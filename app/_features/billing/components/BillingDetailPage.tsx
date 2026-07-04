"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui";
import { cn } from "@repo/utils";
import { MockContentEmptyState } from "@/app/_features/shell/components/MockContentEmptyState";
import { UnifiedConnectionsTab } from "@/app/_features/connections/components/UnifiedConnectionsTab";
import { EntityNotesTab } from "@/app/_features/memory/components/EntityNotesTab";
import { RadixAfterHydration } from "@/app/_features/memory/components/RadixAfterHydration";
import type { ConnectionNode } from "@/app/_features/connections/types";
import type { Connection } from "@/app/_lib/demo/people-demo-data";
import {
  memoryDetailGridClass,
  memoryDetailShellClass,
  memoryTabPanelClass,
  memoryTabsListClass,
  memoryTabTriggerClass,
} from "@/app/_features/memory/utils/memory-layout";
import type { BillingDetailData } from "../detail-types";
import { toBillingDetailViewModel } from "../utils/detail-mapper";
import { BillingActivityTab } from "./BillingActivityTab";
import { BillingDetailHero, type BillingQuickAction } from "./BillingDetailHero";
import { BillingOverviewTab } from "./BillingOverviewTab";
import { BillingPaymentSidebar } from "./BillingPaymentSidebar";

type BillingDetailPageProps = {
  billingRecordId: string;
  detailData?: BillingDetailData | null;
};

const BILLING_DETAIL_TABS = ["overview", "connections", "notes", "activity"] as const;

type BillingDetailTab = (typeof BILLING_DETAIL_TABS)[number];

export function BillingDetailPage({ billingRecordId, detailData = null }: BillingDetailPageProps) {
  const [tab, setTab] = useState<BillingDetailTab>("overview");
  const billing = detailData?.record
    ? toBillingDetailViewModel(detailData.record, {
        captureSourceUrl: detailData.captureSourceUrl,
        documentUrl: detailData.documentUrl,
        updatedAt: detailData.updatedAt,
      })
    : undefined;
  const [unifiedConnections, setUnifiedConnections] = useState<ConnectionNode[]>(
    detailData?.unifiedConnections ?? []
  );

  const [connections, setConnections] = useState<Connection[]>([]);

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

  const handleQuickAction = useCallback(
    (action: BillingQuickAction) => {
      if (action === "note") {
        setTab("notes");
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("entity:add-note"));
        }, 100);
      }
    },
    [],
  );

  if (!billing) {
    return (
      <div className="relative min-h-full">
        <div aria-hidden className="salt-ambient-wash" />
        <div className={memoryDetailShellClass}>
          <BackToBillingLink />
          <MockContentEmptyState
            title="Billing record not found"
            description="This invoice or payable is not in your Billing Memory yet."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className={memoryDetailShellClass}>
        <BackToBillingLink />
        <BillingDetailHero
          billing={billing}
          connections={connections}
          onLink={handleLink}
          onQuickAction={handleQuickAction}
        />

        <div className={memoryDetailGridClass}>
          <div className="min-w-0 space-y-6">
            <RadixAfterHydration
              fallback={
                <div className="space-y-5">
                  <div className={memoryTabsListClass} aria-hidden>
                    {BILLING_DETAIL_TABS.map((value) => (
                      <span
                        key={value}
                        className={cn(
                          memoryTabTriggerClass,
                          value === "overview" && "bg-background text-foreground shadow-sm",
                        )}
                      >
                        {value}
                      </span>
                    ))}
                  </div>
                  <div className={memoryTabPanelClass}>
                    <BillingOverviewTab billing={billing} />
                  </div>
                </div>
              }
            >
              <Tabs value={tab} onValueChange={(value) => setTab(value as BillingDetailTab)} className="space-y-5">
                <TabsList className={memoryTabsListClass}>
                  {BILLING_DETAIL_TABS.map((value) => (
                    <TabsTrigger key={value} value={value} className={memoryTabTriggerClass}>
                      {value}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <div className={memoryTabPanelClass}>
                  <TabsContent value="overview" className="m-0">
                    <BillingOverviewTab billing={billing} />
                  </TabsContent>
                  <TabsContent value="connections" className="m-0">
                    <UnifiedConnectionsTab
                      recordKind="billing"
                      recordId={billingRecordId}
                      recordName={billing.title}
                      connections={unifiedConnections}
                      onLink={handleLink}
                      onUnlink={handleUnlink}
                    />
                  </TabsContent>
                  <TabsContent value="notes" className="m-0">
                    <EntityNotesTab
                      entityType="billing"
                      entityId={billingRecordId}
                      entityName={billing.title}
                      notes={detailData?.notes ?? []}
                      linkableEntities={[]}
                    />
                  </TabsContent>
                  <TabsContent value="activity" className="m-0">
                    <BillingActivityTab
                      activity={billing.activity}
                      partyLabel={billing.partyLabel}
                      lifecycleEvents={detailData?.lifecycleEvents ?? []}
                      supplementalActivity={detailData?.supplementalActivity ?? []}
                      sourceHistory={detailData?.sourceHistory ?? []}
                      notes={detailData?.notes ?? []}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </RadixAfterHydration>
          </div>

          <BillingPaymentSidebar billing={billing} plays={detailData?.billingPlays ?? []} />
        </div>
      </div>
    </div>
  );
}

function BackToBillingLink() {
  return (
    <Link
      href="/billing"
      className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" strokeWidth={2} />
      Back to Billing
    </Link>
  );
}

