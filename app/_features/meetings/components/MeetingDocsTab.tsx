"use client";

import { useState, useMemo } from "react";
import { parseISO } from "date-fns";
import { FileText, Link2 } from "lucide-react";
import { cn } from "@repo/utils";
import { MemoryCreateLinkButton } from "@/app/_features/memory/components/MemoryCreateLinkButton";
import type { Connection } from "@/app/_lib/demo/people-demo-data";
import type { MeetingDetailData, MeetingSource } from "../queries";
import {
  MeetingDocumentCard,
  type MeetingDocumentType,
  type MeetingDocumentStatus,
} from "./MeetingDocumentCard";
import { MeetingDocumentViewer } from "./MeetingDocumentViewer";

type MeetingDocsTabProps = {
  meetingId: string;
  meetingTitle: string;
  detailData: MeetingDetailData;
  existingConnections: Connection[];
  onLink: (connection: Connection) => void;
};

type LinkedDocument = {
  type: MeetingDocumentType;
  source?: MeetingSource;
  status: MeetingDocumentStatus;
  previewStats?: string[];
};

function getDocumentStatus(
  type: MeetingDocumentType,
  sources: MeetingSource[],
  detailData: MeetingDetailData,
  isPastMeeting: boolean,
): LinkedDocument {
  // Check if there's a linked document for this type
  const linkedSource = sources.find((s) => {
    if (type === "prep") return s.kind === "prep_notes" || s.kind === "prep_document";
    if (type === "summary") return s.kind === "summary" || s.kind === "summary_document";
    if (type === "transcript") return s.kind === "transcript" || s.kind === "transcript_document";
    return false;
  });

  if (linkedSource) {
    const isExternal = linkedSource.provider !== "salt";
    return {
      type,
      source: linkedSource,
      status: isExternal ? "connected" : "ready",
      previewStats: getPreviewStats(type, detailData),
    };
  }

  // Check if we have the data to show a "ready" state (Salt-generated)
  if (type === "prep") {
    // Prep notes are ready if we have attendees or agenda
    const meeting = detailData.meeting;
    if (meeting && (meeting.attendees.length > 0 || (meeting.agenda && meeting.agenda.length > 0))) {
      return {
        type,
        status: "ready",
        previewStats: getPreviewStats(type, detailData),
      };
    }
  }

  if (type === "summary") {
    // Summary is ready if we have a summary, decisions, or action items
    if (
      detailData.summaries.length > 0 ||
      detailData.decisions.length > 0 ||
      detailData.actionItems.length > 0
    ) {
      return {
        type,
        status: "ready",
        previewStats: getPreviewStats(type, detailData),
      };
    }
  }

  if (type === "transcript") {
    // Transcript is ready if we have transcript data
    if (detailData.transcript?.content || detailData.transcript?.segments?.length) {
      return {
        type,
        status: "ready",
        previewStats: getPreviewStats(type, detailData),
      };
    }
    // Check if processing
    if (detailData.transcript?.status === "processing") {
      return {
        type,
        status: "generating",
      };
    }
  }

  return { type, status: "empty" };
}

function getPreviewStats(
  type: MeetingDocumentType,
  detailData: MeetingDetailData,
): string[] {
  const stats: string[] = [];
  const meeting = detailData.meeting;

  if (type === "prep") {
    if (meeting?.attendees.length) {
      stats.push(`${meeting.attendees.length} attendee${meeting.attendees.length !== 1 ? "s" : ""}`);
    }
    if (meeting?.agenda?.length) {
      stats.push(`${meeting.agenda.length} agenda item${meeting.agenda.length !== 1 ? "s" : ""}`);
    }
    const openActions = detailData.actionItems.filter((i) => !i.completed).length;
    if (openActions > 0) {
      stats.push(`${openActions} follow-up${openActions !== 1 ? "s" : ""}`);
    }
  }

  if (type === "summary") {
    if (detailData.decisions.length > 0) {
      stats.push(`${detailData.decisions.length} decision${detailData.decisions.length !== 1 ? "s" : ""}`);
    }
    if (detailData.actionItems.length > 0) {
      const open = detailData.actionItems.filter((i) => !i.completed).length;
      stats.push(`${detailData.actionItems.length} action item${detailData.actionItems.length !== 1 ? "s" : ""} (${open} open)`);
    }
  }

  if (type === "transcript") {
    if (detailData.transcript?.durationSeconds) {
      const mins = Math.floor(detailData.transcript.durationSeconds / 60);
      stats.push(`${mins} min`);
    }
    if (detailData.transcript?.segments?.length) {
      const speakers = new Set(detailData.transcript.segments.map((s) => s.speaker.name)).size;
      stats.push(`${speakers} speaker${speakers !== 1 ? "s" : ""}`);
    }
  }

  return stats;
}

export function MeetingDocsTab({
  meetingId,
  meetingTitle,
  detailData,
  existingConnections,
  onLink,
}: MeetingDocsTabProps) {
  const [viewingDocument, setViewingDocument] = useState<MeetingDocumentType | null>(null);

  const meeting = detailData.meeting;
  const isPastMeeting = meeting ? parseISO(meeting.startTime) < new Date() : false;

  const documents = useMemo(() => {
    return (["prep", "summary", "transcript"] as const).map((type) =>
      getDocumentStatus(type, detailData.sources, detailData, isPastMeeting),
    );
  }, [detailData, isPastMeeting]);

  const handleConnect = (type: MeetingDocumentType) => {
    // This will open the link file sheet
    // For now, we can trigger the existing MemoryCreateLinkButton behavior
    // TODO: Implement type-specific linking
  };

  const handleOpenExternal = (doc: LinkedDocument) => {
    if (doc.source?.sourceUrl) {
      window.open(doc.source.sourceUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl tracking-tight text-foreground">Documents</h2>
        <MemoryCreateLinkButton
          variant="panel"
          recordKind="meeting"
          recordId={meetingId}
          recordName={meetingTitle}
          existingConnections={existingConnections}
          onLink={onLink}
        />
      </header>

      {/* Document cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {documents.map((doc) => (
          <MeetingDocumentCard
            key={doc.type}
            type={doc.type}
            status={doc.status}
            document={
              doc.source
                ? {
                    id: doc.source.id,
                    provider: doc.source.provider,
                    url: doc.source.sourceUrl,
                    previewStats: doc.previewStats,
                  }
                : doc.previewStats
                  ? { previewStats: doc.previewStats }
                  : undefined
            }
            isPastMeeting={isPastMeeting}
            onView={() => setViewingDocument(doc.type)}
            onConnect={() => handleConnect(doc.type)}
            onDownload={(format) => {
              // Open viewer and trigger download from there
              setViewingDocument(doc.type);
            }}
            onOpenExternal={() => handleOpenExternal(doc)}
          />
        ))}
      </div>

      {/* Linked files section (for other files not in the 3 document types) */}
      {(() => {
        const otherLinkedFiles = detailData.sources.filter(
          (s) =>
            s.kind === "linked_file" &&
            !["prep_notes", "prep_document", "summary", "summary_document", "transcript", "transcript_document"].includes(s.kind),
        );

        if (otherLinkedFiles.length === 0) return null;

        return (
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Other Linked Files
            </p>
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
              {otherLinkedFiles.map((file, index) => (
                <div
                  key={file.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3",
                    index > 0 && "border-t border-border/50",
                  )}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <FileText className="size-4 text-muted-foreground" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {file.displayName || "Linked file"}
                    </p>
                    <p className="text-xs text-muted-foreground">{file.provider}</p>
                  </div>
                  {file.sourceUrl && (
                    <a
                      href={file.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      Open
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Document viewer modal */}
      {viewingDocument && (
        <MeetingDocumentViewer
          open={!!viewingDocument}
          onOpenChange={(open) => !open && setViewingDocument(null)}
          documentType={viewingDocument}
          detailData={detailData}
        />
      )}
    </div>
  );
}
