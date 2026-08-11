"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Loader2,
  Pencil,
  X,
} from "lucide-react";
import { Input } from "@repo/ui";
import { cn } from "@repo/utils";
import type {
  GroupedLearningEvidence,
  LearningField,
  LearningFieldEvidenceItem,
} from "../queries/learning-evidence";
import type { LearningEntityType } from "@/app/_lib/learning";
import {
  getSectionColorStyles,
  type PlaybookSection,
} from "@/app/_features/plays/components/PlaybookSectionNav";
import {
  buildLearningStory,
  formatFieldLabel,
  formatSourceLabel,
} from "../utils/learning-story";

/**
 * Memory → Activity → Watching row.
 *
 * Same anatomy as Plays → Activity and the Handled list: timestamp, record
 * avatar, Salt-voiced plain-English headline, progress chip, chevron. The
 * dropdown carries the substance — reason, progress toward the bar, per-field
 * nudges, raw evidence, and the accept / dismiss-all actions.
 */

interface LearningRowProps {
  evidence: GroupedLearningEvidence;
  onAcceptAll?: () => void;
  onDismissAll?: () => void;
  onAcceptField?: (field: LearningField, proposedValue: string) => void;
  onDismissField?: (field: LearningField) => void;
}

const ENTITY_PLAYBOOK_LABELS: Record<LearningEntityType, string> = {
  person: "Memory Care · Records",
  organization: "Memory Care · Records",
  work: "Memory Care · Records",
  meeting: "Memory Care · Records",
  resource: "Memory Care · Records",
  me: "Memory Care · Records",
  billing: "Memory Care · Records",
};

/**
 * Display labels for the slug recorded on a learning/evidence row. Historical
 * rows carry retired slugs; all of them read as Memory Care capabilities.
 */
const PLAYBOOK_SLUG_LABELS: Record<string, string> = {
  "memory-records": "Memory Care · Records",
  "memory-hygiene": "Memory Care · Hygiene",
  "memory-connections": "Memory Care · Connections",
  "memory-notes": "Memory Care · Notes",
  "memory-care": "Memory Care",
  // The care decision pipeline records the bare capability as the slug.
  records: "Memory Care · Records",
  hygiene: "Memory Care · Hygiene",
  connections: "Memory Care · Connections",
  notes: "Memory Care · Notes",
  "people-records": "Memory Care · Records",
  "org-records": "Memory Care · Records",
  "work-records": "Memory Care · Records",
  "meeting-records": "Memory Care · Records",
  "file-records": "Memory Care · Records",
  "billing-records": "Memory Care · Records",
};

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;
const SPRING = { type: "spring" as const, stiffness: 320, damping: 30, mass: 0.85 };

function entitySection(entityType: LearningEntityType): Exclude<PlaybookSection, "all"> {
  switch (entityType) {
    case "person":
    case "organization":
      return "relationships";
    case "work":
      return "work";
    case "meeting":
      return "meetings";
    case "resource":
      return "resources";
    case "me":
      return "me";
    case "billing":
      return "billing";
    default:
      return "relationships";
  }
}

function formatPlaybookSlugLabel(slug: string): string {
  if (PLAYBOOK_SLUG_LABELS[slug]) {
    return PLAYBOOK_SLUG_LABELS[slug];
  }

  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatEvidenceType(type: string): string {
  const labels: Record<string, string> = {
    email_match: "Email match",
    name_match: "Name match",
    context_match: "Context match",
    recency: "Recency",
    frequency: "Frequency",
    llm_inference: "AI inference",
    explicit_mention: "Explicit mention",
    behavioral_signal: "Behavioral signal",
    cross_reference: "Cross-reference",
  };
  return labels[type] ?? type.replace(/_/g, " ");
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Deduplicate evidence items that look visually identical.
 * Groups by (sourceType, evidenceType, excerpt) and keeps only the most recent.
 */
function deduplicateEvidenceItems(
  items: LearningFieldEvidenceItem[]
): LearningFieldEvidenceItem[] {
  const seen = new Map<string, LearningFieldEvidenceItem>();
  for (const item of items) {
    const key = `${item.sourceType}:${item.evidenceType}:${item.excerpt ?? ""}`;
    const existing = seen.get(key);
    if (!existing || item.createdAt > existing.createdAt) {
      seen.set(key, item);
    }
  }
  return Array.from(seen.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function initialsOf(label: string): string {
  if (label.startsWith("Unknown")) return "?";
  const parts = label.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "?";
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return `${first}${second}`.toUpperCase();
}

function InitialsAvatar({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full text-[12px] font-semibold",
        className,
      )}
    >
      {initialsOf(label)}
    </span>
  );
}

function ConfidenceChip({ value }: { value: number }) {
  return (
    <span className="inline-flex h-5 shrink-0 items-center rounded-full border border-border/50 bg-muted/50 px-2 text-[10px] font-medium tabular-nums text-muted-foreground">
      {Math.round(value)}%
    </span>
  );
}

/**
 * Per-field progress toward the auto-apply bar: "72 of 85 · 2 signals" with
 * an aurora fill. When confidence reaches the bar, Salt applies the change
 * itself — the track shows how close it is.
 */
function EvidenceProgress({
  confidence,
  bar,
  sourceCount,
}: {
  confidence: number;
  bar: number;
  sourceCount?: number;
}) {
  const rounded = Math.round(confidence);
  const pct = Math.max(0, Math.min(100, (confidence / bar) * 100));

  return (
    <div className="space-y-1">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={bar}
        aria-valuenow={rounded}
        aria-label={`${rounded} of ${bar} toward auto-apply`}
        className="h-1 overflow-hidden rounded-full bg-muted"
      >
        <motion.div
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
          className="h-full rounded-full"
          style={{ backgroundImage: "var(--gradient-aurora)" }}
        />
      </div>
      <p className="text-[11px] tabular-nums text-muted-foreground/80">
        {rounded} of {bar}
        {sourceCount != null && (
          <>
            <span className="text-muted-foreground/45"> · </span>
            {sourceCount} {sourceCount === 1 ? "signal" : "signals"}
          </>
        )}
      </p>
    </div>
  );
}

function EvidenceItemRow({ item }: { item: LearningFieldEvidenceItem }) {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[12px] font-medium text-foreground">
          {formatSourceLabel(item.sourceType)}
        </span>
        <ConfidenceChip value={item.confidence} />
        <span className="text-[10px] text-muted-foreground/70">
          {formatEvidenceType(item.evidenceType)}
        </span>
      </div>
      {item.excerpt ? (
        <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
          {item.excerpt}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground/70">
        <span>{formatTimeAgo(item.createdAt)}</span>
        {item.playbookSlug ? (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span>Noticed by {formatPlaybookSlugLabel(item.playbookSlug)}</span>
          </>
        ) : null}
        {item.captureId ? (
          <>
            <span className="text-muted-foreground/40">·</span>
            <Link
              href="/sources?tab=activity"
              className="font-medium text-foreground/80 transition hover:text-foreground"
            >
              View capture
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}

function FieldEditorRow({
  field,
  onAccept,
  onDismiss,
}: {
  field: LearningField;
  onAccept?: (proposedValue: string) => void;
  onDismiss?: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState(field.proposedValue);
  const [isPending, setIsPending] = useState(false);

  const valueToSave = editedValue.trim() || field.proposedValue;

  const handleAccept = () => {
    if (!onAccept) return;
    setIsPending(true);
    onAccept(valueToSave);
  };

  const handleDismiss = () => {
    if (!onDismiss) return;
    setIsPending(true);
    onDismiss();
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card/80 p-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="space-y-2">
              <p className="text-[12px] font-medium text-muted-foreground">
                Edit {formatFieldLabel(field.fieldPath)}
              </p>
              <Input
                value={editedValue}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setEditedValue(event.target.value)
                }
                className="h-9 rounded-xl border-border/60 bg-background text-[14px]"
                aria-label={`Edit ${formatFieldLabel(field.fieldPath)}`}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-[13px] text-muted-foreground">
                  {formatFieldLabel(field.fieldPath)}
                </span>
                <span className="text-muted-foreground/40">→</span>
                <span className="text-[14px] font-semibold text-foreground">
                  {field.metaCandidate
                    ? (field.metaCandidate.targetName ?? "Suggested change")
                    : field.proposedValue}
                </span>
              </div>
              {field.bar != null && (
                <EvidenceProgress
                  confidence={field.confidence}
                  bar={field.bar}
                  sourceCount={field.sourceCount}
                />
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {!field.metaCandidate && (
            <button
              type="button"
              aria-label={`Edit ${formatFieldLabel(field.fieldPath)}`}
              onClick={() => {
                setEditedValue(field.proposedValue);
                setIsEditing((open) => !open);
              }}
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground/70 transition hover:bg-muted hover:text-foreground"
            >
              <Pencil className="size-4" strokeWidth={1.75} />
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              aria-label={`Not this — ${formatFieldLabel(field.fieldPath)}`}
              onClick={handleDismiss}
              disabled={isPending}
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground/70 transition hover:bg-muted hover:text-foreground disabled:opacity-60"
            >
              <X className="size-4" strokeWidth={1.75} />
            </button>
          )}
          {onAccept && (
            <button
              type="button"
              onClick={handleAccept}
              disabled={isPending}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-muted px-2.5 text-[12px] font-medium text-foreground transition hover:bg-muted/70 disabled:opacity-60"
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" strokeWidth={2.25} />
              )}
              That&apos;s right
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function LearningRow({
  evidence,
  onAcceptAll,
  onDismissAll,
  onAcceptField,
  onDismissField,
}: LearningRowProps) {
  const story = buildLearningStory(evidence);
  const [isOpen, setIsOpen] = useState(false);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const section = entitySection(evidence.entityType);
  const styles = getSectionColorStyles(section);
  const playbookLabel = ENTITY_PLAYBOOK_LABELS[evidence.entityType] ?? "Records";
  const isMerge = story.kind === "merge";
  // Progress toward the bar: the highest-confidence field that still has a
  // tier bar to clear.
  const progressField =
    evidence.fields
      .filter((field) => field.bar != null)
      .sort((a, b) => b.confidence - a.confidence)[0] ?? null;
  const topConfidence =
    evidence.fields.length > 0
      ? Math.max(...evidence.fields.map((field) => field.confidence))
      : null;

  const handleAcceptAll = () => {
    if (!onAcceptAll) return;
    setIsPending(true);
    onAcceptAll();
  };

  const handleDismissAll = () => {
    if (!onDismissAll) return;
    setIsPending(true);
    onDismissAll();
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="group"
      role="listitem"
      aria-label={`Salt's suggestion for ${evidence.entityLabel}`}
    >
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="grid w-full grid-cols-[56px_40px_1fr_auto_20px] items-center gap-3 px-4 py-3.5 text-left transition hover:bg-muted/40"
      >
        <span className="whitespace-nowrap text-[11px] font-medium tabular-nums text-muted-foreground">
          {formatTimeAgo(evidence.latestAt)}
        </span>

        {isMerge && story.mergeTargetName ? (
          <span className="relative flex shrink-0 items-center">
            <InitialsAvatar
              label={evidence.entityLabel}
              className={cn(styles.bg, styles.text)}
            />
            <InitialsAvatar
              label={story.mergeTargetName}
              className={cn(
                "-ml-3 size-7 border-2 border-card text-[10px]",
                styles.bg,
                styles.text,
              )}
            />
          </span>
        ) : (
          <InitialsAvatar
            label={evidence.entityLabel}
            className={cn(styles.bg, styles.text)}
          />
        )}

        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium leading-tight text-foreground">
            {story.primarySentence}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {evidence.entityLabel}
            <span className="text-muted-foreground/50"> · </span>
            {playbookLabel}
          </p>
        </div>

        {progressField && progressField.bar != null ? (
          <span className="inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded-full border border-border/50 bg-muted/50 px-2 text-[10px] font-medium tabular-nums text-muted-foreground">
            {Math.round(progressField.confidence)} of {progressField.bar}
          </span>
        ) : topConfidence != null ? (
          <ConfidenceChip value={topConfidence} />
        ) : (
          <span />
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
              {story.secondarySentences.map((sentence) => (
                <p
                  key={sentence}
                  className="text-[13px] leading-relaxed text-muted-foreground"
                >
                  {sentence}
                </p>
              ))}
              {story.hiddenCount > 0 && (
                <p className="text-[12px] text-muted-foreground/80">
                  and {story.hiddenCount} more{" "}
                  {story.hiddenCount === 1 ? "thing" : "things"} below
                </p>
              )}

              {story.reason && (
                <p className="border-l-2 border-border/60 pl-3 text-[13px] italic leading-relaxed text-muted-foreground">
                  {story.reason}
                </p>
              )}

              {progressField && progressField.bar != null && (
                <EvidenceProgress
                  confidence={progressField.confidence}
                  bar={progressField.bar}
                  sourceCount={progressField.sourceCount}
                />
              )}

              {evidence.entityHref && (
                <Link
                  href={evidence.entityHref}
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-foreground/80 transition hover:text-foreground"
                >
                  Open {evidence.entityLabel}
                  <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
                </Link>
              )}

              <div className="space-y-2">
                {evidence.fields.map((field) => (
                  <FieldEditorRow
                    key={`${field.fieldPath}:${field.proposedValue}`}
                    field={field}
                    onAccept={
                      onAcceptField
                        ? (proposedValue) => onAcceptField(field, proposedValue)
                        : undefined
                    }
                    onDismiss={
                      onDismissField ? () => onDismissField(field) : undefined
                    }
                  />
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {onAcceptAll && (
                  <motion.button
                    type="button"
                    onClick={handleAcceptAll}
                    disabled={isPending}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    transition={SPRING}
                    className="surface-aurora relative inline-flex h-9 items-center gap-1.5 overflow-hidden rounded-xl px-3.5 text-[12px] font-semibold text-white shadow-[var(--shadow-lift)] transition disabled:opacity-60"
                  >
                    {isPending ? (
                      <Loader2 className="relative z-10 size-3.5 animate-spin" />
                    ) : (
                      <Check className="relative z-10 size-3.5" strokeWidth={2.5} />
                    )}
                    <span className="relative z-10">{story.acceptLabel}</span>
                  </motion.button>
                )}

                {onDismissAll && (
                  <button
                    type="button"
                    onClick={handleDismissAll}
                    disabled={isPending}
                    className="inline-flex h-9 items-center rounded-xl px-3 text-[12px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-60"
                  >
                    {story.dismissLabel}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsEvidenceOpen((open) => !open)}
                  aria-expanded={isEvidenceOpen}
                  className="ml-auto inline-flex h-9 items-center gap-1 rounded-xl px-2 text-[12px] font-medium text-muted-foreground/80 transition hover:text-foreground"
                >
                  Why I think this
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform duration-200",
                      isEvidenceOpen && "rotate-180",
                    )}
                    strokeWidth={1.75}
                  />
                </button>
              </div>

              <AnimatePresence initial={false}>
                {isEvidenceOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 border-t border-border/40 pt-3">
                      {story.sourceSummary && (
                        <p className="text-[12px] text-muted-foreground">
                          {story.sourceSummary}
                        </p>
                      )}
                      {evidence.fields.map((field) => (
                        <div
                          key={`${field.fieldPath}:${field.proposedValue}:evidence`}
                          className="space-y-2"
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
                              {formatFieldLabel(field.fieldPath)}
                            </span>
                            {field.bar == null && (
                              <ConfidenceChip value={field.confidence} />
                            )}
                            <span className="text-[11px] text-muted-foreground">
                              {field.sources.map(formatSourceLabel).join(", ")}
                              <span className="text-muted-foreground/45"> · </span>
                              {formatTimeAgo(field.latestAt)}
                            </span>
                          </div>
                          {field.bar != null && (
                            <EvidenceProgress
                              confidence={field.confidence}
                              bar={field.bar}
                              sourceCount={field.sourceCount}
                            />
                          )}
                          {deduplicateEvidenceItems(field.items).map((item) => (
                            <EvidenceItemRow key={item.id} item={item} />
                          ))}
                        </div>
                      ))}
                      <p className="text-[10px] text-muted-foreground/60">
                        Noticed by {playbookLabel}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}
