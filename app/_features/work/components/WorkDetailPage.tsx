"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui";
import { WorkHero, type WorkQuickAction } from "./WorkHero";
import { WorkOverviewTab } from "./WorkOverviewTab";
import { UnifiedConnectionsTab } from "@/app/_features/connections/components/UnifiedConnectionsTab";
import type { ConnectionNode } from "@/app/_features/connections/types";
import { EntityNotesTab } from "@/app/_features/memory/components/EntityNotesTab";
import { WorkActivityTab } from "./WorkActivityTab";
import { WorkHealthCard } from "./WorkHealthCard";
import { WorkPlaysCard } from "./WorkPlaysCard";
import { MockContentEmptyState } from "@/app/_features/shell/components/MockContentEmptyState";
import type { WorkDetailData } from "@/app/_features/work/types";
import { toWorkDetailViewModel } from "@/app/_features/work/utils/detail-mapper";
import type { Connection } from "@/app/_lib/demo/people-demo-data";
import {
  memoryDetailGridClass,
  memoryDetailShellClass,
  memoryTabPanelClass,
  memoryTabsListClass,
  memoryTabTriggerClass,
} from "@/app/_features/memory/utils/memory-layout";
import { RadixAfterHydration } from "@/app/_features/memory/components/RadixAfterHydration";
import { cn } from "@repo/utils";

const WORK_DETAIL_TABS = ["overview", "connections", "notes", "activity"] as const;

type WorkDetailPageProps = {
  workId: string;
  detailData?: WorkDetailData | null;
  linkableEntities?: import("@/app/_lib/notes").ResolvedEntity[];
};

export function WorkDetailPage({ workId, detailData = null, linkableEntities = [] }: WorkDetailPageProps) {
  const [tab, setTab] = useState("overview");

  const initialWork =
    detailData?.summary != null
      ? toWorkDetailViewModel({
          summary: detailData.summary,
          connections: detailData.connections,
        })
      : undefined;
  const [connections, setConnections] = useState<Connection[]>(initialWork?.connections ?? []);
  const [unifiedConnections, setUnifiedConnections] = useState<ConnectionNode[]>(
    detailData?.unifiedConnections ?? []
  );
  const work = initialWork
    ? {
        ...initialWork,
        connections,
        contactCount: connections.filter((connection) => connection.type === "person").length,
      }
    : undefined;

  const handleLink = (connection: Connection) => {
    setConnections((current) => {
      if (current.some((item) => item.id === connection.id && item.type === connection.type)) {
        return current;
      }
      return [...current, connection];
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
    (action: WorkQuickAction) => {
      if (action === "note") {
        setTab("notes");
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("entity:add-note"));
        }, 100);
        return;
      }
      setTab("overview");
      requestAnimationFrame(() => {
        const sectionId =
          action === "blocker"
            ? "work-blockers"
            : action === "stage"
              ? "work-stage"
              : null;
        if (sectionId) {
          document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        setTimeout(() => {
          if (action === "blocker") {
            window.dispatchEvent(new CustomEvent("work:add-blocker"));
          } else if (action === "stage") {
            window.dispatchEvent(new CustomEvent("work:change-stage"));
          }
        }, 400);
      });
    },
    [],
  );

  if (!work) {
    return (
      <div className="relative min-h-full">
        <div aria-hidden className="salt-ambient-wash" />
        <div className={memoryDetailShellClass}>
          <Link
            href="/work"
            className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" strokeWidth={2} />
            Back to Work
          </Link>
          <MockContentEmptyState
            title="Work not found"
            description="This project is not in your workspace yet."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className={memoryDetailShellClass}>
        <Link
          href="/work"
          className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" strokeWidth={2} />
          Back to Work
        </Link>

        <WorkHero work={work} connections={connections} onLink={handleLink} onQuickAction={handleQuickAction} />

        <div className={memoryDetailGridClass}>
          <div className="min-w-0 space-y-6">
            <RadixAfterHydration
              fallback={
                <div className="space-y-5">
                  <div className={memoryTabsListClass} aria-hidden>
                    {WORK_DETAIL_TABS.map((value) => (
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
                    <WorkOverviewTab
                      work={work}
                      workId={workId}
                      worthAttention={work.worthAttention}
                      availableServices={detailData?.availableServices ?? []}
                      milestones={detailData?.milestones ?? []}
                      blockers={detailData?.blockers ?? []}
                    />
                  </div>
                </div>
              }
            >
              <Tabs value={tab} onValueChange={setTab} className="space-y-5">
                <TabsList className={memoryTabsListClass}>
                  {WORK_DETAIL_TABS.map((value) => (
                    <TabsTrigger key={value} value={value} className={memoryTabTriggerClass}>
                      {value}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <div className={memoryTabPanelClass}>
                  <TabsContent value="overview" className="m-0">
                    <WorkOverviewTab
                      work={work}
                      workId={workId}
                      worthAttention={work.worthAttention}
                      availableServices={detailData?.availableServices ?? []}
                      milestones={detailData?.milestones ?? []}
                      blockers={detailData?.blockers ?? []}
                    />
                  </TabsContent>
                  <TabsContent value="connections" className="m-0">
                    <UnifiedConnectionsTab
                      recordKind="work"
                      recordId={workId}
                      recordName={work.title}
                      connections={unifiedConnections}
                      onLink={handleLink}
                      onUnlink={handleUnlink}
                    />
                  </TabsContent>
                  <TabsContent value="notes" className="m-0">
                    <EntityNotesTab
                      entityType="work"
                      entityId={workId}
                      entityName={work.title}
                      notes={detailData?.notes ?? []}
                      linkableEntities={linkableEntities}
                    />
                  </TabsContent>
                  <TabsContent value="activity" className="m-0">
                    <WorkActivityTab
                      activity={detailData?.activity ?? []}
                      supplementalActivity={detailData?.supplementalActivity ?? []}
                      workTitle={work.title}
                      narrative={detailData?.summary?.aiNarrative ?? null}
                      lifecycleEvents={detailData?.lifecycleEvents ?? []}
                      sourceHistory={detailData?.sourceHistory ?? []}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </RadixAfterHydration>
          </div>

          <div className="space-y-6">
            <WorkHealthCard work={work} />
            <WorkPlaysCard work={work} />
          </div>
        </div>
      </div>
    </div>
  );
}
