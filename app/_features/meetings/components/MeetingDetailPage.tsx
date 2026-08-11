"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ArrowLeft, ExternalLink, Play } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui";
import { cn } from "@repo/utils";
import { safeHttpUrl } from "@/app/_lib/security/safe-url";
import { MockContentEmptyState } from "@/app/_features/shell/components/MockContentEmptyState";
import { RadixAfterHydration } from "@/app/_features/memory/components/RadixAfterHydration";
import { UnifiedConnectionsTab } from "@/app/_features/connections/components/UnifiedConnectionsTab";
import { EntityNotesTab } from "@/app/_features/memory/components/EntityNotesTab";
import type { Connection } from "@/app/_lib/demo/people-demo-data";
import type { ConnectionNode } from "@/app/_features/connections/types";
import {
  memoryDetailGridClass,
  memoryDetailShellClass,
  memoryTabPanelClass,
  memoryTabsListClass,
  memoryTabTriggerClass,
} from "@/app/_features/memory/utils/memory-layout";
import type { MeetingDetailData } from "../queries";
import { MeetingHero, type MeetingQuickAction } from "./MeetingHero";
import { MeetingOverviewTab } from "./MeetingOverviewTab";
import { MeetingActivityTab } from "./MeetingActivityTab";
import { MeetingDocumentViewer, type MeetingDocumentType } from "./MeetingDocumentViewer";
import { MeetingQuickLinksCard } from "./MeetingQuickLinksCard";
import { MeetingPlaysCard } from "./MeetingPlaysCard";

type MeetingDetailPageProps = {
  meetingId: string;
  detailData: MeetingDetailData;
  linkableEntities?: import("@/app/_lib/notes").ResolvedEntity[];
};

const MEETING_DETAIL_TABS = ["overview", "connections", "notes", "activity"] as const;

export function MeetingDetailPage({
  meetingId,
  detailData,
  linkableEntities = [],
}: MeetingDetailPageProps) {
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const [viewingDocument, setViewingDocument] = useState<MeetingDocumentType | null>(null);
  const meeting = detailData.meeting;
  const [connections, setConnections] = useState<Connection[]>(() => {
    return detailData.connections.map((c) => ({
      id: c.id.split(":")[1] ?? c.id,
      type: c.nodeType as Connection["type"],
      name: c.label,
      subtitle: c.sublabel,
    }));
  });
  const [unifiedConnections, setUnifiedConnections] = useState<ConnectionNode[]>(
    detailData.connections,
  );

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
        resource: "resources",
      };
      const pathSegment = hrefMap[nodeType] ?? nodeType;
      return [
        ...current,
        {
          id: nodeId,
          nodeType,
          label: connection.name,
          sublabel: connection.subtitle,
          href:
            nodeType === "resource"
              ? `/resources?preview=${connection.id}`
              : `/${pathSegment}/${connection.id}`,
        },
      ];
    });
    router.refresh();
  };

  const handleUnlink = (node: ConnectionNode) => {
    setUnifiedConnections((current) => current.filter((n) => n.id !== node.id));
    const entityId = node.id.split(":")[1] ?? node.id;
    setConnections((prev) => prev.filter((c) => c.id !== entityId || c.type !== node.nodeType));
    router.refresh();
  };

  const handleQuickAction = useCallback((action: MeetingQuickAction) => {
    if (action === "note") {
      setTab("notes");
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("entity:add-note"));
      }, 100);
      return;
    }
    if (action === "decision") {
      setTab("overview");
      requestAnimationFrame(() => {
        document.getElementById("meeting-decisions")?.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("meeting:add-decision"));
        }, 400);
      });
      return;
    }
    if (action === "action") {
      setTab("overview");
      requestAnimationFrame(() => {
        document.getElementById("meeting-actions")?.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("meeting:add-action"));
        }, 400);
      });
      return;
    }
    if (action === "connection") {
      setTab("connections");
      return;
    }
    if (action === "doc") {
      setTab("overview");
      requestAnimationFrame(() => {
        document.getElementById("meeting-notes")?.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("meeting:link-resource"));
        }, 400);
      });
      return;
    }
  }, []);

  if (!meeting) {
    return (
      <div className="relative min-h-full">
        <div className={memoryDetailShellClass}>
          <BackToMeetingsLink />
          <MockContentEmptyState
            title="Meeting not found"
            description="This meeting is not in your Meeting Memory yet."
          />
        </div>
      </div>
    );
  }

  const currentSummary = detailData.summaries.find((s) => s.isCurrent) ?? detailData.summaries[0];
  const linkedFileSources = detailData.sources.filter((s) => s.kind === "linked_file");
  const resourceConnections = unifiedConnections.filter((n) => n.nodeType === "resource");

  return (
    <div className="relative min-h-full">
      <div className={memoryDetailShellClass}>
        <BackToMeetingsLink />

        <MeetingHero
          meeting={meeting}
          decisionsCount={detailData.decisions.length}
          openActionsCount={detailData.actionItems.filter((item) => !item.completed).length}
          notesCount={detailData.notes.length}
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
                    {MEETING_DETAIL_TABS.map((value) => (
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
                    <MeetingOverviewTab
                      meeting={meeting}
                      meetingId={meetingId}
                      summary={currentSummary ?? null}
                      decisions={detailData.decisions}
                      actionItems={detailData.actionItems}
                      entities={linkableEntities}
                      linkedFileSources={linkedFileSources}
                      resourceConnections={resourceConnections}
                      existingConnections={connections}
                      onLinkResource={handleLink}
                      onUnlinkResource={handleUnlink}
                    />
                  </div>
                </div>
              }
            >
              <Tabs value={tab} onValueChange={setTab} className="space-y-5">
                <TabsList className={memoryTabsListClass}>
                  {MEETING_DETAIL_TABS.map((value) => (
                    <TabsTrigger key={value} value={value} className={memoryTabTriggerClass}>
                      {value}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <div className={memoryTabPanelClass}>
                  <TabsContent value="overview" className="m-0">
                    <MeetingOverviewTab
                      meeting={meeting}
                      meetingId={meetingId}
                      summary={currentSummary ?? null}
                      decisions={detailData.decisions}
                      actionItems={detailData.actionItems}
                      entities={linkableEntities}
                      linkedFileSources={linkedFileSources}
                      resourceConnections={resourceConnections}
                      existingConnections={connections}
                      onLinkResource={handleLink}
                      onUnlinkResource={handleUnlink}
                    />
                  </TabsContent>
                  <TabsContent value="connections" className="m-0">
                    <UnifiedConnectionsTab
                      recordKind="meeting"
                      recordId={meetingId}
                      recordName={meeting.title}
                      connections={unifiedConnections}
                      onLink={handleLink}
                      onUnlink={handleUnlink}
                    />
                  </TabsContent>
                  <TabsContent value="notes" className="m-0">
                    <EntityNotesTab
                      entityType="meeting"
                      entityId={meetingId}
                      entityName={meeting.title}
                      notes={detailData.notes}
                      linkableEntities={linkableEntities}
                    />
                  </TabsContent>
                  <TabsContent value="activity" className="m-0">
                    <MeetingActivityTab
                      activity={detailData.activity}
                      supplementalActivity={detailData.supplementalActivity}
                      meetingTitle={meeting.title}
                      lifecycleEvents={detailData.lifecycleEvents}
                      sourceHistory={detailData.sourceHistory}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </RadixAfterHydration>
          </div>

          <MeetingDetailSidebar
            meeting={meeting}
            detailData={detailData}
            onPrepClick={() => setViewingDocument("prep")}
            onSummaryClick={() => setViewingDocument("summary")}
            onTranscriptClick={() => setViewingDocument("transcript")}
            onNotesClick={() => setTab("notes")}
          />
        </div>
      </div>

      {viewingDocument && (
        <MeetingDocumentViewer
          open
          onOpenChange={(open) => !open && setViewingDocument(null)}
          documentType={viewingDocument}
          detailData={detailData}
        />
      )}
    </div>
  );
}

function BackToMeetingsLink() {
  return (
    <Link
      href="/meetings"
      className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" strokeWidth={2} />
      Back to Meetings
    </Link>
  );
}

type MeetingDetailSidebarProps = {
  meeting: NonNullable<MeetingDetailData["meeting"]>;
  detailData: MeetingDetailData;
  onPrepClick?: () => void;
  onSummaryClick?: () => void;
  onTranscriptClick?: () => void;
  onNotesClick?: () => void;
};

function MeetingDetailSidebar({
  meeting,
  detailData,
  onPrepClick,
  onSummaryClick,
  onTranscriptClick,
  onNotesClick,
}: MeetingDetailSidebarProps) {
  const ingestionSources = detailData.sources.filter((s) => s.kind !== "linked_file");

  return (
    <div className="space-y-4">
      <MeetingQuickLinksCard
        meeting={meeting}
        detailData={detailData}
        onPrepClick={onPrepClick}
        onSummaryClick={onSummaryClick}
        onTranscriptClick={onTranscriptClick}
      />

      <MeetingPlaysCard meetingTitle={meeting.title} />

      {ingestionSources.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
            <Play className="size-4" strokeWidth={2} />
            Sources
          </h3>
          <ul className="space-y-2">
            {ingestionSources.map((source) => (
              <li key={source.id} className="text-sm">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-xs capitalize">
                    {source.provider.replace(/-/g, " ")}
                  </span>
                  <span className="text-xs text-muted-foreground">{source.kind.replace(/_/g, " ")}</span>
                </div>
                {(() => {
                  const safeUrl = safeHttpUrl(source.sourceUrl);
                  return safeUrl ? (
                    <a
                      href={safeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="size-3" />
                      View source
                    </a>
                  ) : null;
                })()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
