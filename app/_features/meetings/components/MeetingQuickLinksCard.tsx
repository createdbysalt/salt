"use client";

import { parseISO } from "date-fns";
import {
  ArrowRight,
  ExternalLink,
  FileText,
  Link2,
  ScrollText,
  Mic,
  Video,
} from "lucide-react";
import { safeHttpUrl } from "@/app/_lib/security/safe-url";
import type { MeetingDetailRecord, MeetingDetailData } from "../queries";

type MeetingQuickLinksCardProps = {
  meeting: MeetingDetailRecord;
  detailData?: MeetingDetailData;
  onPrepClick?: () => void;
  onSummaryClick?: () => void;
  onTranscriptClick?: () => void;
  onNotesClick?: () => void;
};

export function MeetingQuickLinksCard({
  meeting,
  detailData,
  onPrepClick,
  onSummaryClick,
  onTranscriptClick,
  onNotesClick,
}: MeetingQuickLinksCardProps) {
  const startDate = parseISO(meeting.startTime);
  const isPast = startDate < new Date();
  const safeMeetingUrl = safeHttpUrl(meeting.meetingUrl);

  // Check what documents are available
  const hasPrepNotes =
    meeting.attendees.length > 0 ||
    (meeting.agenda && meeting.agenda.length > 0);

  const hasSummary =
    detailData &&
    (detailData.summaries.length > 0 ||
      detailData.decisions.length > 0 ||
      detailData.actionItems.length > 0);

  const hasTranscript =
    detailData &&
    (detailData.transcript?.content ||
      (detailData.transcript?.segments && detailData.transcript.segments.length > 0));

  // Show nothing if no docs and no meeting link
  const hasAnyContent = hasPrepNotes || hasSummary || hasTranscript || safeMeetingUrl;
  if (!hasAnyContent) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
      <div className="mb-4 flex items-start gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-foreground/8">
          <Link2 className="size-4 text-foreground" strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-xl leading-tight tracking-tight">Quick Links</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {isPast ? "Review meeting documents" : "Prep and join from here"}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {/* Prep Notes - show before meeting */}
        {!isPast && hasPrepNotes && (
          <QuickLinkButton
            icon={FileText}
            title="Prep Notes"
            subtitle={`${meeting.attendees.length} attendees · ${meeting.agenda?.length ?? 0} agenda items`}
            onClick={onPrepClick}
          />
        )}

        {/* Summary - show after meeting */}
        {isPast && hasSummary && (
          <QuickLinkButton
            icon={ScrollText}
            title="Meeting Summary"
            subtitle={`${detailData?.decisions.length ?? 0} decisions · ${detailData?.actionItems.length ?? 0} action items`}
            onClick={onSummaryClick}
          />
        )}

        {/* Transcript - show if available */}
        {hasTranscript && (
          <QuickLinkButton
            icon={Mic}
            title="Transcript"
            subtitle={
              detailData?.transcript?.durationSeconds
                ? `${Math.floor(detailData.transcript.durationSeconds / 60)} min`
                : "Available"
            }
            onClick={onTranscriptClick}
          />
        )}

        {/* Join meeting link - show before meeting */}
        {!isPast && safeMeetingUrl && (
          <a
            href={safeMeetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center gap-3 rounded-xl border border-border/60 px-3 py-2.5 transition hover:bg-muted/50"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky/10">
              <Video className="size-4 text-sky" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">Join meeting</p>
              <p className="text-xs text-muted-foreground">Open meeting link</p>
            </div>
            <ExternalLink className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} />
          </a>
        )}
      </div>
    </div>
  );
}

function QuickLinkButton({
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  icon: typeof FileText;
  title: string;
  subtitle: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-border/60 px-3 py-2.5 text-left transition hover:bg-muted/50"
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-4 text-muted-foreground" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} />
    </button>
  );
}
