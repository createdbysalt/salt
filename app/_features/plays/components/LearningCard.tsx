"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Eye,
  Loader2,
  Pencil,
  Sparkles,
  X,
} from "lucide-react";
import { Input } from "@repo/ui";
import { cn } from "@repo/utils";
import type {
  GroupedLearningEvidence,
  LearningFieldEvidenceItem,
} from "../queries/learning-evidence";
import type { LearningEntityType } from "@/app/_lib/learning";
import {
  getSectionColorStyles,
  getSectionMeta,
  type PlaybookSection,
} from "./PlaybookSectionNav";

interface LearningCardProps {
  evidence: GroupedLearningEvidence;
  onAccept?: (fieldPath: string, proposedValue: string, evidenceIds: string[]) => void;
  onDismiss?: (fieldPath: string, evidenceIds: string[]) => void;
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

const FIELD_LABELS: Record<string, string> = {
  relationship_type: "Relationship",
  company: "Company",
  role: "Role",
  title: "Title",
  location: "Location",
  industry: "Industry",
  size: "Size",
  revenue_at_risk: "Revenue at Risk",
  department: "Department",
  linkedin: "LinkedIn",
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

function formatFieldLabel(fieldPath: string): string {
  return FIELD_LABELS[fieldPath] ?? fieldPath.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    email: "Email",
    calendar: "Calendar",
    stripe: "Stripe",
    slack: "Slack",
    manual: "Manual",
    llm_inference: "AI",
    linkedin: "LinkedIn",
  };
  return labels[source] ?? source.replace(/_/g, " ");
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
            <span>{formatPlaybookSlugLabel(item.playbookSlug)}</span>
          </>
        ) : null}
        {item.captureId ? (
          <>
            <span className="text-muted-foreground/40">·</span>
            <Link
              href="/plays?tab=activity&view=captures"
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

function ConfidenceChip({ value }: { value: number }) {
  return (
    <span className="inline-flex h-5 shrink-0 items-center rounded-full border border-border/50 bg-muted/50 px-2 text-[10px] font-medium tabular-nums text-muted-foreground">
      {Math.round(value)}%
    </span>
  );
}

function WatchingCardMeta({
  confidence,
  fieldCount,
}: {
  confidence: number;
  fieldCount: number;
}) {
  const fieldLabel = fieldCount === 1 ? "1 field" : `${fieldCount} fields`;

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2">
      <span className="inline-flex h-5 items-center gap-1 rounded-full border border-border/50 bg-muted/30 px-2 text-[10px] font-medium text-muted-foreground">
        <Eye className="size-3 text-muted-foreground/70" strokeWidth={2} />
        Watching
      </span>

      <span className="hidden h-3 w-px bg-border/50 sm:block" aria-hidden />

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-medium tabular-nums text-foreground/85">
          {Math.round(confidence)}%
        </span>
        <span className="text-muted-foreground/70"> confidence</span>
        <span className="text-muted-foreground/35"> · </span>
        <span>{fieldLabel}</span>
      </p>
    </div>
  );
}

function QueueIconActionButton({
  label,
  shortcut,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={shortcut ? `${label} (${shortcut})` : label}
      onClick={onClick}
      className="group relative inline-flex size-9 items-center justify-center rounded-xl text-foreground/70 transition-all hover:bg-muted hover:text-foreground active:scale-95"
    >
      {children}
      {shortcut ? (
        <span className="pointer-events-none absolute -bottom-0.5 right-0.5 grid size-3.5 place-items-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          {shortcut}
        </span>
      ) : null}
    </button>
  );
}

export function LearningCard({ evidence, onAccept, onDismiss }: LearningCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const section = entitySection(evidence.entityType);
  const meta = getSectionMeta(section);
  const styles = getSectionColorStyles(section);
  const SectionIcon = meta.icon;
  const playbookLabel = ENTITY_PLAYBOOK_LABELS[evidence.entityType] ?? "Records";

  return (
    <motion.article
      layout
      className="group glass-card relative overflow-hidden rounded-3xl border border-border/50 transition-colors hover:border-border/80"
      role="listitem"
      aria-label={`${playbookLabel} play: ${evidence.entityLabel}`}
      aria-expanded={isExpanded}
    >
      <div className="p-4 lg:px-5">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-2xl",
              styles.bg,
              styles.text,
            )}
          >
            <SectionIcon className="size-4" strokeWidth={2} />
          </span>

          <button
            type="button"
            onClick={() => setIsExpanded((open) => !open)}
            className="min-w-0 flex-1 text-left"
            aria-expanded={isExpanded}
          >
            <p className="truncate text-[11px] font-medium text-muted-foreground">
              <span className="text-foreground/80">{playbookLabel} Play</span>
            </p>
            <h3 className="mt-0.5 line-clamp-1 text-[15px] font-semibold leading-snug tracking-tight text-foreground">
              {evidence.entityLabel}
            </h3>
            <WatchingCardMeta
              confidence={evidence.totalConfidence}
              fieldCount={evidence.fields.length}
            />
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((open) => !open)}
            aria-label={isExpanded ? "Collapse fields" : "Expand fields"}
            aria-expanded={isExpanded}
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground/60 transition hover:bg-muted/60 hover:text-foreground",
              isExpanded && "bg-muted/50 text-foreground",
            )}
          >
            <ChevronDown
              className={cn(
                "size-[18px] transition-transform duration-200",
                isExpanded && "rotate-180",
              )}
              strokeWidth={1.75}
            />
          </button>
        </div>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="ml-[52px] space-y-2 border-t border-border/40 pt-3">
                {evidence.fields.map((field) => (
                  <FieldRow
                    key={`${field.fieldPath}:${field.proposedValue}`}
                    field={field}
                    onAccept={
                      onAccept
                        ? (proposedValue) =>
                            onAccept(field.fieldPath, proposedValue, field.evidenceIds)
                        : undefined
                    }
                    onDismiss={
                      onDismiss ? () => onDismiss(field.fieldPath, field.evidenceIds) : undefined
                    }
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}

function FieldRow({
  field,
  onAccept,
  onDismiss,
}: {
  field: GroupedLearningEvidence["fields"][0];
  onAccept?: (proposedValue: string) => void;
  onDismiss?: () => void;
}) {
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState(field.proposedValue);
  const [isPending, setIsPending] = useState(false);

  const hasEvidence = field.items.length > 0;
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

  const toggleEdit = () => {
    setIsEditing((open) => {
      if (open) {
        setEditedValue(field.proposedValue);
      }
      return !open;
    });
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card/80 p-3 lg:p-4">
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
              <span className="text-[14px] font-semibold text-foreground">{field.proposedValue}</span>
            </div>
          )}

          {!isEditing && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <ConfidenceChip value={field.confidence} />
              <span className="text-[11px] leading-relaxed text-muted-foreground">
                {field.sourceCount} {field.sourceCount === 1 ? "source" : "sources"}
                <span className="text-muted-foreground/45"> · </span>
                {field.sources.map(formatSourceLabel).join(", ")}
                <span className="text-muted-foreground/45"> · </span>
                {formatTimeAgo(field.latestAt)}
              </span>
            </div>
          )}
        </div>

        {(onAccept || onDismiss || hasEvidence) && (
          <div className="flex shrink-0 items-center gap-1.5">
            {(onAccept || onDismiss) && (
              <div className="inline-flex items-center gap-1 rounded-2xl border border-border/50 bg-muted/60 p-1">
                {onDismiss && (
                  <QueueIconActionButton
                    label="Dismiss"
                    shortcut="D"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismiss();
                    }}
                  >
                    <X className="size-[18px]" strokeWidth={1.75} />
                  </QueueIconActionButton>
                )}
                {onAccept && (
                  <QueueIconActionButton
                    label="Edit"
                    shortcut="E"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleEdit();
                    }}
                  >
                    <Pencil className="size-[17px]" strokeWidth={1.75} />
                  </QueueIconActionButton>
                )}
                {onAccept && (
                  <motion.button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAccept();
                    }}
                    disabled={isPending}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    transition={SPRING}
                    className="surface-aurora relative ml-1 inline-flex h-9 items-center gap-1.5 overflow-hidden rounded-xl px-3 text-[12px] font-semibold text-white shadow-[var(--shadow-lift)] transition disabled:opacity-60"
                  >
                    {isPending ? (
                      <Loader2 className="relative z-10 size-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="relative z-10 size-3.5" strokeWidth={2.25} />
                    )}
                    <span className="relative z-10">Save</span>
                  </motion.button>
                )}
              </div>
            )}
            {hasEvidence && (
              <button
                type="button"
                onClick={() => setIsDetailsExpanded((open) => !open)}
                aria-label={isDetailsExpanded ? "Hide evidence" : "Show evidence"}
                aria-expanded={isDetailsExpanded}
                className={cn(
                  "inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground/60 transition hover:bg-muted/60 hover:text-foreground",
                  isDetailsExpanded && "bg-muted/50 text-foreground",
                )}
              >
                <ChevronDown
                  className={cn(
                    "size-[18px] transition-transform duration-200",
                    isDetailsExpanded && "rotate-180",
                  )}
                  strokeWidth={1.75}
                />
              </button>
            )}
          </div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {isDetailsExpanded && hasEvidence && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2 border-t border-border/40 pt-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
                Evidence ({field.items.length})
              </p>
              {field.items.map((item) => (
                <EvidenceItemRow key={item.id} item={item} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
