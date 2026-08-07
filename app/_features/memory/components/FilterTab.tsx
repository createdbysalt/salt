"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  FileText,
  Inbox,
  Loader2,
  Mail,
  ShieldOff,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { cn } from "@repo/utils";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { LearningTab } from "./LearningTab";
import type { GroupedLearningEvidence } from "../queries/learning-evidence";
import type { AdmissionItem, AdmissionDecisions } from "../queries/admission-decisions";
import {
  submitCaptureFeedback,
  neverCaptureSender,
} from "@/app/_features/capture/actions/capture-feedback";

/**
 * Memory → Filter — the rules, applied.
 *
 * Record-centric admission decisions in three states:
 * - Pending your call: learning evidence + capture candidates
 * - Let in: recent admissions with source + reason
 * - Kept out: summarized, with borderline items surfaced and a way back in
 */

const SOURCE_ICONS: Record<string, typeof Mail> = {
  gmail: Mail,
  outlook: Mail,
  yahoo_mail: Mail,
  googlecalendar: Calendar,
  outlook_calendar: Calendar,
  cal: Calendar,
  googledrive: FileText,
  dropbox: FileText,
  onedrive: FileText,
};

function sourceIcon(sourceType: string) {
  return SOURCE_ICONS[sourceType] ?? Inbox;
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function itemLabel(item: AdmissionItem): string {
  return item.fromLabel ?? item.title ?? "Unknown sender";
}

function AdmissionRow({
  item,
  actions,
}: {
  item: AdmissionItem;
  actions?: React.ReactNode;
}) {
  const Icon = sourceIcon(item.sourceType);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted/70 text-muted-foreground">
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {itemLabel(item)}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {item.reason ?? item.title ?? "No reason recorded"}
        </p>
      </div>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {formatWhen(item.createdAt)}
      </span>
      {actions}
    </div>
  );
}

function FeedbackControls({ captureId }: { captureId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState<string | null>(null);

  if (submitted) {
    return (
      <span className="shrink-0 text-xs font-medium text-success">
        {submitted}
      </span>
    );
  }

  const buttonClass =
    "inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[11px] font-medium text-foreground/70 transition hover:border-border hover:text-foreground disabled:opacity-50";

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        disabled={isPending}
        className={buttonClass}
        onClick={() =>
          startTransition(async () => {
            const result = await submitCaptureFeedback(captureId, "more_like_this");
            if (result.success) {
              setSubmitted("Noted — more like this");
              router.refresh();
            }
          })
        }
      >
        <ThumbsUp className="size-3" />
        Let in
      </button>
      <button
        type="button"
        disabled={isPending}
        className={buttonClass}
        onClick={() =>
          startTransition(async () => {
            const result = await submitCaptureFeedback(captureId, "less_like_this");
            if (result.success) setSubmitted("Noted — less like this");
          })
        }
      >
        <ThumbsDown className="size-3" />
      </button>
      <button
        type="button"
        disabled={isPending}
        className={buttonClass}
        onClick={() =>
          startTransition(async () => {
            const result = await neverCaptureSender(captureId);
            if (result.success) {
              setSubmitted("Sender blocked");
              router.refresh();
            }
          })
        }
      >
        <ShieldOff className="size-3" />
        Never
      </button>
    </div>
  );
}

interface FilterTabProps {
  evidence: GroupedLearningEvidence[];
  decisions: AdmissionDecisions;
  workspaceId: string;
}

export function FilterTab({ evidence, decisions, workspaceId }: FilterTabProps) {
  const router = useRouter();
  const pendingCount = evidence.length + decisions.candidates.length;

  return (
    <div className="space-y-10">
      <PlaysSectionHeader
        eyebrow="The rules, applied"
        title="Filter"
        description="What Salt let into your Memory, what it kept out, and what's waiting on your call. Your feedback here becomes tomorrow's Rules."
      />

      {/* PENDING YOUR CALL */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-flame" strokeWidth={2} />
          <h2 className="text-sm font-semibold text-foreground">
            Pending your call
          </h2>
          {pendingCount > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
              {pendingCount}
            </span>
          )}
        </div>

        {decisions.candidates.length > 0 && (
          <div className="space-y-2">
            {decisions.candidates.map((item) => (
              <AdmissionRow
                key={item.captureId}
                item={item}
                actions={<FeedbackControls captureId={item.captureId} />}
              />
            ))}
          </div>
        )}

        <LearningTab
          evidence={evidence}
          workspaceId={workspaceId}
          onUpdate={() => router.refresh()}
          emptyTitle="Nothing waiting on you"
          emptyDescription="When Salt isn't sure about something it learned, it'll show up here for you to confirm."
        />
      </section>

      {/* LET IN */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-success" strokeWidth={2} />
          <h2 className="text-sm font-semibold text-foreground">Let in</h2>
          {decisions.letIn.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
              {decisions.letIn.length} this week
            </span>
          )}
        </div>

        {decisions.letIn.length > 0 ? (
          <div className="space-y-2">
            {decisions.letIn.map((item) => (
              <AdmissionRow
                key={item.captureId}
                item={item}
                actions={
                  <Link
                    href="/sources?tab=activity"
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                  >
                    Stream
                    <ArrowRight className="size-3" />
                  </Link>
                }
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nothing admitted this week yet.
          </p>
        )}
      </section>

      {/* KEPT OUT */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldOff className="size-4 text-muted-foreground" strokeWidth={2} />
          <h2 className="text-sm font-semibold text-foreground">Kept out</h2>
        </div>

        {decisions.keptOutCount > 0 ? (
          <>
            <p className="text-sm text-muted-foreground">
              {decisions.keptOutCount} kept out this week
              {decisions.keptOutSample.length > 0 &&
                ` — ${decisions.keptOutSample.length} worth a look`}
              .
            </p>
            <div className="space-y-2">
              {decisions.keptOutSample.map((item) => (
                <AdmissionRow
                  key={item.captureId}
                  item={item}
                  actions={<FeedbackControls captureId={item.captureId} />}
                />
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nothing kept out this week. Salt will show borderline calls here so
            you can override them.
          </p>
        )}
      </section>
    </div>
  );
}
