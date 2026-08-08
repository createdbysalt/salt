"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  History,
  Loader2,
  Sparkles,
  Undo2,
  Zap,
} from "lucide-react";
import { cn } from "@repo/utils";
import { PlaysTabEmptyState } from "@/app/_features/plays/components/PlaysTabEmptyState";
import type { HandledWrite } from "../queries/handled-items";
import type { AdmissionItem } from "../queries/admission-decisions";
import { markHandledWriteWrong } from "../actions/handled-items";

/**
 * Memory → Activity → Handled.
 *
 * The audit trail: what Salt already applied to your records, why, and what
 * it let in. Correction-over-approval — anything wrong gets rolled back and
 * taught from with one click. Rows mirror Plays → Activity: timestamp,
 * plain-English headline, expand for evidence.
 */

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

interface HandledSectionProps {
  writes: HandledWrite[];
  letIn: AdmissionItem[];
  onUpdate?: () => void;
}

const CAPABILITY_LABELS: Record<string, string> = {
  "memory-records": "Memory Care · Records",
  "memory-hygiene": "Memory Care · Hygiene",
  "memory-connections": "Memory Care · Connections",
  "memory-notes": "Memory Care · Notes",
  "memory-care": "Memory Care",
  "people-records": "Memory Care · Records",
  "org-records": "Memory Care · Records",
  "work-records": "Memory Care · Records",
  "meeting-records": "Memory Care · Records",
  "file-records": "Memory Care · Records",
  "billing-records": "Memory Care · Records",
};

function capabilityLabel(slug: string | null): string {
  if (!slug) return "Memory Care";
  return (
    CAPABILITY_LABELS[slug] ??
    slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatFullTimestamp(dateString: string): string {
  return new Date(dateString).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function possessive(label: string): string {
  return label.endsWith("s") ? `${label}'` : `${label}'s`;
}

/** "Set Taylor Example's relationship type to client" — the row headline. */
function writeHeadline(write: HandledWrite): string {
  const field = write.fieldLabel.toLowerCase();
  if (!write.newValue) {
    return `Cleared ${possessive(write.entityLabel)} ${field}`;
  }
  return `Set ${possessive(write.entityLabel)} ${field} to ${write.newValue}`;
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[20px_120px_1fr] items-start gap-3">
      <Icon
        className="mt-0.5 size-3.5 text-muted-foreground"
        strokeWidth={2}
      />
      <p className="pt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <div className="text-[12.5px] leading-relaxed text-foreground/85">
        {value}
      </div>
    </div>
  );
}

function HandledWriteRow({
  write,
  onUpdate,
}: {
  write: HandledWrite;
  onUpdate?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [corrected, setCorrected] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleWrong = () => {
    startTransition(async () => {
      const result = await markHandledWriteWrong(write.learningId);
      if (result.success) {
        setCorrected(true);
        toast.success("Rolled back — Salt will learn from this");
        onUpdate?.();
      } else {
        toast.error(result.error ?? "Couldn't roll this back");
      }
    });
  };

  return (
    <li className="group">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="grid w-full grid-cols-[56px_36px_1fr_auto_20px] items-center gap-3 px-4 py-3.5 text-left transition hover:bg-muted/40"
      >
        <span className="whitespace-nowrap text-[11px] font-medium tabular-nums text-muted-foreground">
          {formatTimeAgo(write.createdAt)}
        </span>
        <span className="surface-aurora grid size-8 shrink-0 place-items-center rounded-xl">
          <Sparkles
            className="relative z-10 size-3.5 text-white"
            strokeWidth={2.5}
          />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium leading-tight text-foreground">
            {writeHeadline(write)}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {capabilityLabel(write.capabilitySlug)}
          </p>
        </div>
        {corrected ? (
          <span className="inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-muted-foreground">
            <Undo2 className="size-3.5" strokeWidth={1.75} />
            Rolled back
          </span>
        ) : (
          <span
            role="button"
            tabIndex={0}
            onClick={(ev) => {
              ev.stopPropagation();
              if (!isPending) handleWrong();
            }}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" || ev.key === " ") {
                ev.stopPropagation();
                if (!isPending) handleWrong();
              }
            }}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-border/60 px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground",
              isPending && "cursor-wait opacity-60",
            )}
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : null}
            That's wrong
          </span>
        )}
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform duration-300",
            isOpen && "rotate-180 text-foreground",
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: APPLE_EASE }}
            className="overflow-hidden"
          >
            <div className="space-y-3.5 px-4 pb-5 pt-1 pl-[84px] pr-6">
              <DetailRow
                icon={FileText}
                label="Evidence"
                value={write.evidenceSummary}
              />
              {write.oldValue ? (
                <DetailRow
                  icon={History}
                  label="Was"
                  value={
                    <span className="text-muted-foreground">
                      {write.oldValue}
                    </span>
                  }
                />
              ) : null}
              <DetailRow
                icon={Zap}
                label="Confidence"
                value={`${Math.round(write.confidence)}%`}
              />
              <DetailRow icon={Sparkles} label="Applied by" value="Salt" />
              <DetailRow
                icon={Clock}
                label="When"
                value={formatFullTimestamp(write.createdAt)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export function HandledSection({
  writes,
  letIn,
  onUpdate,
}: HandledSectionProps) {
  if (writes.length === 0 && letIn.length === 0) {
    return (
      <PlaysTabEmptyState
        icon={CheckCircle2}
        title="Nothing handled yet"
        description="When Salt applies a change to your records, it shows up here — what changed, why, and a one-click way to correct it."
      />
    );
  }

  return (
    <div className="space-y-6">
      {writes.length > 0 && (
        <section className="space-y-3">
          <ul className="glass-card divide-y divide-border/40 overflow-hidden rounded-3xl">
            {writes.map((write) => (
              <HandledWriteRow
                key={write.learningId}
                write={write}
                onUpdate={onUpdate}
              />
            ))}
          </ul>
        </section>
      )}

      {letIn.length > 0 && (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Let in</h3>
            <p className="text-[13px] text-muted-foreground">
              Captures Salt admitted into your world this week.
            </p>
          </div>
          <ul className="glass-card divide-y divide-border/40 overflow-hidden rounded-3xl">
            {letIn.map((item) => (
              <li key={item.captureId} className="group">
                <div className="grid grid-cols-[56px_36px_1fr] items-center gap-3 px-4 py-3.5 transition hover:bg-muted/40">
                  <span className="whitespace-nowrap text-[11px] font-medium tabular-nums text-muted-foreground">
                    {formatTimeAgo(item.createdAt)}
                  </span>
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
                    <CheckCircle2 className="size-3.5" strokeWidth={2.25} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium leading-tight text-foreground">
                      {item.title ?? "Untitled capture"}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {item.fromLabel ?? item.sourceType.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
