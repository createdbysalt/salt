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

interface LearningCardProps {
  evidence: GroupedLearningEvidence;
  onAcceptAll?: () => void;
  onDismissAll?: () => void;
  onAcceptField?: (field: LearningField, proposedValue: string) => void;
  onDismissField?: (field: LearningField) => void;
}

const ENTITY_PLAYBOOK_LABELS: Record<LearningEntityType, string> = {
  person: "People Records",
  organization: "Org Records",
  work: "Work Records",
  meeting: "Meeting Records",
  file: "File Records",
  me: "Me Records",
  billing: "Billing Records",
};

const PLAYBOOK_SLUG_LABELS: Record<string, string> = {
  "people-records": "People Records",
  "org-records": "Org Records",
  "work-records": "Work Records",
  "meeting-records": "Meeting Records",
  "file-records": "File Records",
  "billing-records": "Billing Records",
  "keeper-people-records": "People Records",
  "keeper-work-records": "Work Records",
  "keeper-meetings-records": "Meeting Records",
};

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
    case "file":
      return "files";
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
        "grid size-10 shrink-0 place-items-center rounded-full text-[13px] font-semibold",
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
              aria-label={`Dismiss ${formatFieldLabel(field.fieldPath)}`}
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
              Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function LearningCard({
  evidence,
  onAcceptAll,
  onDismissAll,
  onAcceptField,
  onDismissField,
}: LearningCardProps) {
  const story = buildLearningStory(evidence);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const section = entitySection(evidence.entityType);
  const styles = getSectionColorStyles(section);
  const playbookLabel = ENTITY_PLAYBOOK_LABELS[evidence.entityType] ?? "Records";
  const isMerge = story.kind === "merge";

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
    <motion.article
      layout
      className="group glass-card relative overflow-hidden rounded-3xl border border-border/50 transition-colors hover:border-border/80"
      role="listitem"
      aria-label={`Salt's suggestion for ${evidence.entityLabel}`}
    >
      <div className="space-y-3 p-4 lg:p-5">
        <div className="flex items-center gap-3">
          {isMerge && story.mergeTargetName ? (
            <span className="relative flex shrink-0 items-center">
              <InitialsAvatar
                label={evidence.entityLabel}
                className={cn(styles.bg, styles.text)}
              />
              <InitialsAvatar
                label={story.mergeTargetName}
                className={cn(
                  "-ml-3 size-8 border-2 border-card text-[11px]",
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

          <div className="flex min-w-0 flex-1 items-baseline gap-2">
            {evidence.entityHref ? (
              <Link
                href={evidence.entityHref}
                className="truncate text-[13px] font-semibold text-foreground transition hover:underline"
              >
                {evidence.entityLabel}
              </Link>
            ) : (
              <span className="truncate text-[13px] font-semibold text-foreground">
                {evidence.entityLabel}
              </span>
            )}
            <span className="shrink-0 text-[11px] text-muted-foreground/70">
              noticed {formatTimeAgo(evidence.latestAt)}
            </span>
          </div>

          {evidence.entityHref && (
            <Link
              href={evidence.entityHref}
              aria-label={`Open ${evidence.entityLabel}`}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground/60 transition hover:bg-muted hover:text-foreground"
            >
              <ArrowUpRight className="size-4" strokeWidth={1.75} />
            </Link>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-[15px] font-medium leading-snug tracking-tight text-foreground">
            {story.primarySentence}
          </p>
          {story.secondarySentences.map((sentence) => (
            <p
              key={sentence}
              className="text-[13px] leading-relaxed text-muted-foreground"
            >
              {sentence}
            </p>
          ))}
          {story.hiddenCount > 0 && !isEditorOpen && (
            <button
              type="button"
              onClick={() => setIsEditorOpen(true)}
              className="text-[12px] font-medium text-muted-foreground/80 transition hover:text-foreground"
            >
              and {story.hiddenCount} more{" "}
              {story.hiddenCount === 1 ? "thing" : "things"}
            </button>
          )}
        </div>

        {story.reason && (
          <p className="border-l-2 border-border/60 pl-3 text-[13px] italic leading-relaxed text-muted-foreground">
            {story.reason}
          </p>
        )}

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

          <button
            type="button"
            onClick={() => setIsEditorOpen((open) => !open)}
            aria-expanded={isEditorOpen}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/50 bg-muted/40 px-3 text-[12px] font-medium text-foreground/80 transition hover:bg-muted hover:text-foreground",
              isEditorOpen && "bg-muted text-foreground",
            )}
          >
            <Pencil className="size-3.5" strokeWidth={1.75} />
            Edit
          </button>

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
          {isEditorOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="space-y-2 border-t border-border/40 pt-3">
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
            </motion.div>
          )}
        </AnimatePresence>

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
                      <ConfidenceChip value={field.confidence} />
                      <span className="text-[11px] text-muted-foreground">
                        {field.sourceCount}{" "}
                        {field.sourceCount === 1 ? "source" : "sources"}
                        <span className="text-muted-foreground/45"> · </span>
                        {field.sources.map(formatSourceLabel).join(", ")}
                        <span className="text-muted-foreground/45"> · </span>
                        {formatTimeAgo(field.latestAt)}
                      </span>
                    </div>
                    {field.items.map((item) => (
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
    </motion.article>
  );
}
