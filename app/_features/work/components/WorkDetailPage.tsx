"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui";
import { WorkHero } from "./WorkHero";
import { WorkOverviewTab } from "./WorkOverviewTab";
import { WorkConnectionsTab } from "./WorkConnectionsTab";
import { WorkPaymentsTab } from "./WorkPaymentsTab";
import { WorkFilesTab } from "./WorkFilesTab";
import { WorkNotesTab } from "./WorkNotesTab";
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

type WorkDetailPageProps = {
  workId: string;
  detailData?: WorkDetailData | null;
};

export function WorkDetailPage({ workId, detailData = null }: WorkDetailPageProps) {
  const [tab, setTab] = useState("overview");

  const initialWork =
    detailData?.summary != null
      ? toWorkDetailViewModel({
          summary: detailData.summary,
          connections: detailData.connections,
        })
      : undefined;
  const [connections, setConnections] = useState<Connection[]>(initialWork?.connections ?? []);
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
    toast.success(`Connected ${connection.name}`);
  };

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

        <WorkHero work={work} connections={connections} onLink={handleLink} />

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
                  <WorkOverviewTab work={work} profileFields={detailData?.profileFields ?? null} />
                </TabsContent>
                <TabsContent value="connections" className="m-0">
                  <WorkConnectionsTab connections={connections} />
                </TabsContent>
                <TabsContent value="payments" className="m-0">
                  <WorkPaymentsTab work={work} />
                </TabsContent>
                <TabsContent value="files" className="m-0">
                  <WorkFilesTab work={work} />
                </TabsContent>
                <TabsContent value="notes" className="m-0">
                  <WorkNotesTab work={work} notes={detailData?.notes ?? []} />
                </TabsContent>
                <TabsContent value="activity" className="m-0">
                  <WorkActivityTab
                    activity={detailData?.activity ?? []}
                    workTitle={work.title}
                  />
                </TabsContent>
              </div>
            </Tabs>
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
