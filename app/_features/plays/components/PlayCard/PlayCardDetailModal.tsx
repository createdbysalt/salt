"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, ChevronDown, Edit3, ExternalLink, HelpCircle, Loader2, Sparkles, ThumbsDown, ThumbsUp, Undo2, X } from "lucide-react";
import { cn } from "@repo/utils";
import type { PlayCardViewModel } from "../../play-card/types";
import { ConnectorIcon } from "@/app/_features/connectors/components/connector-icons";
import type { ConnectorCatalogId } from "@/app/_features/connectors/types";
import {
  resolveCta,
  resolveSectionVisual,
  SECTION_GRADIENT_LEFT,
  PlayCardIconTile,
  QueueIconActionButton,
} from "./PlayCard";
import { PlaybookConnectorLogos } from "../PlaybookConnectorLogos";
import { PlaybookStepDots } from "../PlaybookCardShared";
import { getSectionConnectorIds } from "../../lib/playbook-connectors";
import { buildPlayGlance, reversibilityNote } from "../../lib/play-headline";
import {
  collapseInboxArtifacts,
  isInboxAppId,
  resolveDraftInboxLink,
} from "../../lib/artifact-links";
import {
  formatDraftToLabel,
  isEmailDraftChannel,
  splitDraftSubject,
} from "../../lib/draft-preview";
import {
  openPreparedInboxDraft,
  refreshPreparedPlayDraft,
} from "../../actions/open-prepared-inbox-draft";
import { toast } from "sonner";
import Link from "next/link";
import type { RunPreconditionVerdict } from "../../services/check-run-preconditions";

/** Map a play's channel/source URL to the connector catalog id for its app. */
function appIdForSource(
  channel: string | null,
  sourceUrl: string | null,
): ConnectorCatalogId | null {
  const host = (() => {
    if (!sourceUrl) return "";
    try {
      return new URL(sourceUrl).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();
  if (host.includes("mail.google") || host.includes("gmail")) return "google";
  if (host.includes("calendar.google")) return "google-calendar";
  if (host.includes("docs.google")) return "google-docs";
  if (host.includes("drive.google")) return "google-drive";
  if (host.includes("stripe")) return "stripe";
  if (host.includes("outlook")) return "outlook";
  if (host.includes("slack")) return "slack";
  if (host.includes("linkedin")) return "linkedin";
  if (host.includes("tiktok")) return "tiktok";
  if (host.includes("instagram")) return "instagram";
  if (host.includes("quickbooks") || host.includes("qbo.intuit")) return "quickbooks";
  if (channel === "Gmail" || channel === "Email") return "google";
  if (channel === "Outlook") return "outlook";
  if (channel === "Calendar") return "google-calendar";
  if (channel === "Stripe") return "stripe";
  if (channel === "Slack") return "slack";
  if (channel === "LinkedIn") return "linkedin";
  if (channel === "TikTok") return "tiktok";
  if (channel === "Instagram") return "instagram";
  if (channel === "Google Docs" || channel === "Docs") return "google-docs";
  if (channel === "Google Drive" || channel === "Drive") return "google-drive";
  if (channel === "QuickBooks") return "quickbooks";
  return null;
}

function appLabelForId(id: ConnectorCatalogId): string {
  switch (id) {
    case "google":
      return "Gmail";
    case "outlook":
      return "Outlook";
    case "google-calendar":
      return "Google Calendar";
    case "google-docs":
      return "Google Docs";
    case "google-drive":
      return "Google Drive";
    case "slack":
      return "Slack";
    case "linkedin":
      return "LinkedIn";
    case "tiktok":
      return "TikTok";
    case "instagram":
      return "Instagram";
    case "quickbooks":
      return "QuickBooks";
    default:
      return id.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

/**
 * Inline-editable preview for an artifact draft. Local state only for now —
 * the persistent acting-draft edit flow (PlayQueueList) owns save-on-approve
 * for top-level drafts; artifact diffs get wired to learning in Phase 5.
 */
function EvidenceSourceAnchor({
  href,
  external,
  children,
}: {
  href: string;
  external: boolean;
  children: ReactNode;
}) {
  const className =
    "inline-flex items-center gap-1 text-inherit underline decoration-border underline-offset-2 transition hover:text-foreground hover:decoration-foreground";
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function ArtifactDraftPreview({ paragraphs }: { paragraphs: string[] }) {
  const [text, setText] = useState(paragraphs.join("\n\n"));
  const [editing, setEditing] = useState(false);
  return (
    <div className="group/draft relative">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setEditing(true)}
        onBlur={() => setEditing(false)}
        rows={Math.min(14, Math.max(4, text.split("\n").length + 1))}
        aria-label="Edit draft"
        className={cn(
          "w-full resize-y rounded-2xl border border-dashed bg-background/80 px-4 py-3 pr-14 text-[13px] leading-relaxed text-foreground transition focus:border-solid focus:outline-none",
          editing
            ? "border-foreground/30"
            : "border-foreground/25 hover:border-foreground/40",
        )}
      />
      <span
        className={cn(
          "pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] transition",
          editing
            ? "bg-foreground/10 text-foreground"
            : "bg-muted text-muted-foreground group-hover/draft:bg-foreground/10 group-hover/draft:text-foreground",
        )}
      >
        <Edit3 className="size-3" strokeWidth={2.25} />
        {editing ? "Editing" : "Edit"}
      </span>
    </div>
  );
}

const inboxLinkClass =
  "ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground underline decoration-border underline-offset-2 transition hover:text-foreground hover:decoration-foreground disabled:no-underline disabled:opacity-60";

function InboxOpenControl({
  label,
  href,
  playRunId,
  opening,
  onOpenPrepared,
}: {
  label: string;
  href: string;
  playRunId: string | null;
  opening: boolean;
  onOpenPrepared: (playRunId: string) => Promise<void>;
}) {
  if (!playRunId) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
        className={inboxLinkClass}
      >
        Open in {label}
        <ExternalLink className="size-3 opacity-50" strokeWidth={2.25} />
      </a>
    );
  }

  return (
    <button
      type="button"
      disabled={opening}
      onClick={(event) => {
        event.stopPropagation();
        void onOpenPrepared(playRunId);
      }}
      className={inboxLinkClass}
    >
      {opening ? "Opening in " : "Open in "}
      {label}
      {opening ? (
        <Loader2 className="size-3 animate-spin opacity-50" />
      ) : (
        <ExternalLink className="size-3 opacity-50" strokeWidth={2.25} />
      )}
    </button>
  );
}

/**
 * Play detail popup (center modal) — the card's second layer.
 *
 * Spec: .cursor/plans/2026-08-08-play-card-interaction-model.md
 * Holds the depth the face doesn't: step rail, the true (editable) preview,
 * the honest evidence list, and named external links.
 */

export interface PlayCardDetailModalProps {
  vm: PlayCardViewModel;
  open: boolean;
  onClose: () => void;
  /** Renders the kind-specific preview body (draft editor, profile diff, ...) */
  renderBody: () => React.ReactNode;
  /** Renders the step rail (chain of auto-run steps → pending action) */
  renderSteps?: () => React.ReactNode;
  isPending?: boolean;
  onPrimary?: (source: HTMLElement) => void;
  onDismiss?: () => void;
  onEditWithSalt?: () => void;
  /** Handled-mode footer actions */
  onUndo?: () => void;
  onFeedback?: (type: "positive" | "negative") => void;
  feedbackGiven?: "positive" | "negative" | null;
  onDraftPrepared?: (text: string, subject?: string | null) => void;
  /** Latest Salt letter, including unsaved edits, for Open in Gmail / Outlook. */
  draftText?: string | null;
  /**
   * Gate preview for the pending tool (fetched by PlayCard). Rendered above
   * the footer CTA; blocked kinds disable the primary action.
   */
  gateVerdict?: RunPreconditionVerdict | null;
}

function timeLabel(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatWhyAutoHandled(
  confidence: number | null,
  stakes: "low" | "medium" | "high" | null,
): string | null {
  if (confidence == null) return null;
  const stakesLabel = stakes === "low" ? "low-stakes" : stakes === "medium" ? "medium-stakes" : stakes === "high" ? "high-stakes" : "";
  if (confidence >= 90) {
    return `${confidence}% confidence${stakesLabel ? ` + ${stakesLabel} action` : ""} = auto-handled`;
  }
  if (confidence >= 70 && stakes !== "high") {
    return `${confidence}% confidence${stakesLabel ? ` + ${stakesLabel} action` : ""} = auto-handled`;
  }
  return `${confidence}% confidence${stakesLabel ? `, ${stakesLabel}` : ""}`;
}

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

export function PlayCardDetailModal({
  vm,
  open,
  onClose,
  renderBody,
  renderSteps,
  isPending = false,
  onPrimary,
  onDismiss,
  onEditWithSalt,
  onUndo,
  onFeedback,
  feedbackGiven,
  onDraftPrepared,
  draftText,
  gateVerdict,
}: PlayCardDetailModalProps) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [openingInbox, setOpeningInbox] = useState(false);
  const [preparedInboxUrl, setPreparedInboxUrl] = useState<string | null>(null);
  const playRunId =
    vm.provenance.source === "play_run" ? vm.provenance.playRunId : null;
  const onDraftPreparedRef = useRef(onDraftPrepared);
  onDraftPreparedRef.current = onDraftPrepared;

  useEffect(() => {
    if (!open || !playRunId) return;
    let cancelled = false;
    void refreshPreparedPlayDraft(playRunId).then((result) => {
      if (cancelled || !result.ok) return;
      onDraftPreparedRef.current?.(result.data.draftBody, result.data.subject);
    });
    return () => {
      cancelled = true;
    };
  }, [open, playRunId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const handleOpenPrepared = async (runId: string) => {
    setOpeningInbox(true);
    const tab = window.open("about:blank", "_blank");
    const result = await openPreparedInboxDraft(runId, draftText);
    setOpeningInbox(false);
    if (!result.ok) {
      tab?.close();
      toast.error(result.message);
      return;
    }
    setPreparedInboxUrl(result.data.url);
    if (result.data.draftBody) {
      onDraftPreparedRef.current?.(result.data.draftBody);
    }
    if (tab) {
      tab.location.href = result.data.url;
    } else {
      window.open(result.data.url, "_blank", "noopener,noreferrer");
    }
  };

  if (typeof document === "undefined") return null;

  const evidence = vm.evidence ?? null;
  const glance = buildPlayGlance({
    headline: vm.headline,
    subject: vm.subject,
    targetLabel: vm.targetLabel,
    recipientLabel: vm.acting?.recipientLabel ?? vm.targetLabel,
    draftText: vm.acting?.draftBody.join("\n\n") ?? null,
    playbookSlug: vm.playbookSlug,
    playbookName: vm.playbookName,
    outputType: vm.outputType,
    triggerLabel: vm.triggerLabel,
    preview: vm.preview,
    valueEstimate: vm.valueEstimate,
    evidenceLabels: vm.evidence?.items.map((item) => item.label) ?? null,
  });
  const visual = resolveSectionVisual(vm);
  // Per-run logos (apps actually used, from step provenance) beat the
  // section-default cluster.
  const logoIds = (vm.connectorIds?.length
    ? vm.connectorIds
    : getSectionConnectorIds(vm.section ?? null)) as ConnectorCatalogId[];
  const isHandled = vm.mode === "handled" && Boolean(vm.handled);
  const gateBlocked = gateVerdict?.kind.startsWith("blocked") ?? false;
  // Inside the popup you've already reviewed — a "Review" CTA resolves to
  // the completing verb (Send / Apply / Approve). In draft mode the gate
  // preview swaps the verb to match what approving will actually do.
  const modalCta = (() => {
    if (gateVerdict?.kind === "will_draft") return "Create draft";
    const cta = resolveCta(vm);
    return cta.opensDetail ? "Approve" : cta.label;
  })();

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[9990] flex items-center justify-center p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={isHandled ? vm.handled!.outcomeLabel : glance.headline}
          // The modal portals into the card's React tree — without this,
          // inner clicks bubble to the card's "click anywhere to open".
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            aria-label="Close details"
            onClick={onClose}
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.24, ease: APPLE_EASE }}
            className={cn(
              "relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-border/60 shadow-[0_40px_80px_-32px_color-mix(in_oklab,var(--foreground)_35%,transparent)]",
              (vm.section && SECTION_GRADIENT_LEFT[vm.section]) ?? "bg-card",
              visual.styles?.ring
            )}
          >
            {/* Header — same section identity as the card face */}
            <div className="relative flex items-start gap-4 px-6 py-5">
              <PlayCardIconTile visual={visual} />
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "flex min-w-0 items-center gap-2.5 text-[10px] font-bold uppercase tracking-[0.14em]",
                    visual.styles?.text ?? "text-muted-foreground"
                  )}
                >
                  <span className="min-w-0 truncate">
                    {vm.playbookName ?? visual.label}
                  </span>
                  {vm.stepPosition?.total ? (
                    <PlaybookStepDots
                      stepCount={vm.stepPosition.total}
                      activeIndex={Math.min(
                        vm.stepPosition.current - 1,
                        vm.stepPosition.total - 1
                      )}
                      dotClass={visual.styles?.dot}
                      label={`Step ${vm.stepPosition.current} of ${vm.stepPosition.total}`}
                      className="shrink-0 normal-case tracking-normal"
                    />
                  ) : null}
                </div>
                <div className="mt-1 flex items-center gap-3">
                  <h2 className="min-w-0 font-display text-[19px] leading-snug tracking-tight text-foreground">
                    {isHandled ? vm.handled!.outcomeLabel : glance.headline}
                  </h2>
                  {logoIds.length > 0 && (
                    <PlaybookConnectorLogos ids={logoIds} className="shrink-0" />
                  )}
                </div>
                {vm.preview && (
                  <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
                    {vm.preview}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <X className="size-[18px]" strokeWidth={1.75} />
              </button>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {renderSteps?.()}

              {/* Handled mode — what Salt already did, and why it was safe
                  to do it without asking. */}
              {isHandled && vm.handled && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 text-[11px] font-semibold text-emerald-600">
                      <CheckCircle2 className="size-3.5" strokeWidth={2.25} />
                      Handled · {timeLabel(vm.handled.handledAt)}
                    </span>
                    {typeof vm.confidence === "number" && (
                      <span className="inline-flex h-6 items-center rounded-full border border-border/50 bg-muted/50 px-2.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                        {vm.confidence}% confidence
                      </span>
                    )}
                  </div>
                  {formatWhyAutoHandled(vm.confidence, vm.stakes) && (
                    <p className="flex items-start gap-2 text-[12px] leading-relaxed text-muted-foreground">
                      <HelpCircle className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.5} />
                      <span>{formatWhyAutoHandled(vm.confidence, vm.stakes)}</span>
                    </p>
                  )}
                  {vm.handled.changeLine && (
                    <div className="rounded-2xl border border-border/50 bg-card/80 p-4 lg:p-5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Applied change
                      </p>
                      <p className="mt-2 text-[14px] font-medium text-foreground">
                        {vm.handled.changeLine}
                      </p>
                    </div>
                  )}
                  {(vm.triggerLabel || vm.valueEstimate) && (
                    <p className="text-[12px] leading-relaxed text-muted-foreground">
                      {vm.triggerLabel && (
                        <span className="font-medium text-foreground/80">{vm.triggerLabel}</span>
                      )}
                      {vm.triggerLabel && vm.valueEstimate && (
                        <span className="text-muted-foreground/45"> · </span>
                      )}
                      {vm.valueEstimate && (
                        <span className="font-medium text-emerald-600">{vm.valueEstimate}</span>
                      )}
                    </p>
                  )}
                </div>
              )}

              {/* Prepared by app — one row per app Salt actually produced or
                  used something in. Drafts are editable inline; external
                  artifacts get a named link. Never lists decorative apps. */}
              {(() => {
                const sourceAppId = appIdForSource(vm.channel, vm.sourceUrl ?? null);
                const allArtifacts = collapseInboxArtifacts(vm.artifacts ?? []);
                const hasDraft = Boolean(
                  vm.kind === "acting" && vm.acting?.draftBody?.length
                );
                const draftText = vm.acting?.draftBody.join("\n\n") ?? "";
                const { subject: draftSubject, body: draftBody } =
                  splitDraftSubject(draftText);
                const emailDraft = isEmailDraftChannel(vm.channel);
                const inboxLink = emailDraft
                  ? resolveDraftInboxLink({
                      artifacts: allArtifacts,
                      channel: vm.channel,
                      sourceUrl: vm.sourceUrl,
                      connectorIds: vm.connectorIds,
                      compose: hasDraft
                        ? {
                            subject:
                              draftSubject ?? vm.acting?.emailSubject ?? undefined,
                            body: draftBody || draftText,
                          }
                        : null,
                    })
                  : null;
                // Non-inbox drafts (Slack message, LinkedIn post, TikTok
                // script) live in a doc, not an inbox. The draft row links
                // straight to that doc and the duplicate artifact row goes.
                const docArtifact =
                  !emailDraft && hasDraft
                    ? allArtifacts.find(
                        (artifact) =>
                          Boolean(artifact.url) && !isInboxAppId(artifact.appId)
                      )
                    : undefined;
                const artifacts = docArtifact
                  ? allArtifacts.filter((artifact) => artifact !== docArtifact)
                  : allArtifacts;
                const draftOpenUrl = docArtifact
                  ? (docArtifact.url ?? null)
                  : !emailDraft
                    ? (vm.sourceUrl ?? null)
                    : null;
                const draftAppId: ConnectorCatalogId | null = emailDraft
                  ? ((inboxLink?.appId ?? sourceAppId) as ConnectorCatalogId | null)
                  : ((docArtifact?.appId as ConnectorCatalogId | undefined) ??
                    sourceAppId);
                const inboxAlreadyListed = artifacts.some(
                  (artifact) =>
                    Boolean(artifact.url) && artifact.appId === inboxLink?.appId
                );
                if (artifacts.length === 0 && !hasDraft && !vm.sourceUrl) return null;
                return (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Prepared for you
                    </p>
                    <div className="mt-3 space-y-5">
                      {artifacts.map((artifact, index) => (
                        <div key={index}>
                          <div className="mb-2 flex items-center gap-2.5">
                            {artifact.appId === "salt" ? (
                              <Sparkles className="size-[18px] text-muted-foreground" strokeWidth={2} />
                            ) : (
                              <ConnectorIcon
                                id={artifact.appId as ConnectorCatalogId}
                                size={22}
                              />
                            )}
                            <span className="text-[13px] font-semibold text-foreground">
                              {artifact.label}
                            </span>
                            {artifact.url && isInboxAppId(artifact.appId) ? (
                              <InboxOpenControl
                                label={appLabelForId(artifact.appId as ConnectorCatalogId)}
                                href={preparedInboxUrl ?? artifact.url}
                                playRunId={playRunId}
                                opening={openingInbox}
                                onOpenPrepared={handleOpenPrepared}
                              />
                            ) : artifact.url ? (
                              <a
                                href={artifact.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground underline decoration-border underline-offset-2 transition hover:text-foreground hover:decoration-foreground"
                              >
                                Open in {artifact.appId === "salt" ? "Salt" : appLabelForId(artifact.appId as ConnectorCatalogId)}
                                <ExternalLink className="size-3 opacity-50" strokeWidth={2.25} />
                              </a>
                            ) : null}
                          </div>
                          {artifact.draftBody && (
                            <ArtifactDraftPreview paragraphs={artifact.draftBody} />
                          )}
                        </div>
                      ))}
                      {hasDraft && (
                        <div>
                          <div className="mb-2 flex items-center gap-2.5">
                            {draftAppId && (
                              <ConnectorIcon
                                id={draftAppId}
                                size={22}
                              />
                            )}
                            <span className="text-[13px] font-semibold text-foreground">
                              {formatDraftToLabel({
                                recipientLabel: vm.acting!.recipientLabel,
                                draftText: vm.acting!.draftBody.join("\n\n"),
                                channel: vm.channel,
                              })}
                            </span>
                            {emailDraft && inboxLink && !inboxAlreadyListed ? (
                              <InboxOpenControl
                                label={inboxLink.label}
                                href={preparedInboxUrl ?? inboxLink.url}
                                playRunId={playRunId}
                                opening={openingInbox}
                                onOpenPrepared={handleOpenPrepared}
                              />
                            ) : !emailDraft && draftOpenUrl ? (
                              <a
                                href={draftOpenUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground underline decoration-border underline-offset-2 transition hover:text-foreground hover:decoration-foreground"
                              >
                                Open in{" "}
                                {draftAppId
                                  ? appLabelForId(draftAppId)
                                  : "app"}
                                <ExternalLink className="size-3 opacity-50" strokeWidth={2.25} />
                              </a>
                            ) : null}
                          </div>
                          {renderBody()}
                        </div>
                      )}
                      {vm.sourceUrl && allArtifacts.length === 0 && (
                        <div className="flex items-center gap-2.5">
                          {sourceAppId && <ConnectorIcon id={sourceAppId} size={22} />}
                          <a
                            href={vm.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[13px] font-medium text-foreground underline decoration-border underline-offset-2 transition hover:decoration-foreground"
                          >
                            Open in{" "}
                            {sourceAppId ? appLabelForId(sourceAppId) : "source app"}
                            <ExternalLink className="size-3 opacity-50" strokeWidth={2.25} />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* How Salt knew — the reasoning walkthrough, tucked behind a
                  divider + dropdown so the modal stays glanceable. One
                  first-person step per input Salt considered. */}
              {evidence && (evidence.items.length > 0 || evidence.thin) && (
                <div className="border-t border-border/40 pt-4">
                  <button
                    type="button"
                    onClick={() => setEvidenceOpen((v) => !v)}
                    aria-expanded={evidenceOpen}
                    className="group/evidence flex w-full items-center gap-2 text-left"
                  >
                    <Sparkles
                      className="size-3.5 text-muted-foreground"
                      strokeWidth={2}
                    />
                    <span className="text-[12px] font-semibold text-muted-foreground transition group-hover/evidence:text-foreground">
                      How Salt knew
                      {evidence.items.length > 0 && (
                        <span className="text-muted-foreground/60">
                          {" "}
                          · {evidence.items.length}{" "}
                          {evidence.items.length === 1 ? "source" : "sources"}
                        </span>
                      )}
                    </span>
                    {evidence.thin && (
                      <AlertTriangle
                        className="size-3.5 text-amber-600"
                        strokeWidth={2}
                      />
                    )}
                    <ChevronDown
                      className={cn(
                        "ml-auto size-4 text-muted-foreground/60 transition-transform duration-200 group-hover/evidence:text-foreground",
                        evidenceOpen && "rotate-180",
                      )}
                      strokeWidth={2}
                    />
                  </button>
                  {evidenceOpen && (
                    <div className="mt-3 rounded-2xl border border-border/50 bg-muted/20 p-4">
                      {evidence.thin && evidence.thinNote && (
                        <p className="flex items-start gap-1.5 text-[12px] font-medium text-amber-600">
                          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
                          {evidence.thinNote}
                        </p>
                      )}
                      {evidence.items.length > 0 && (
                        <ol className={evidence.thin ? "mt-3" : undefined}>
                          {evidence.items.map((item, index) => {
                            // "salt" = Salt's own data (Memory, captures) —
                            // the stars glyph, not a connector logo.
                            const glyphId =
                              item.appId && item.appId !== "salt"
                                ? (item.appId as ConnectorCatalogId)
                                : undefined;
                            const linkApp =
                              item.appLabel ??
                              (glyphId ? appLabelForId(glyphId) : null);
                            return (
                              <li key={index} className="relative flex gap-3 pb-4 last:pb-0">
                                {index < evidence.items.length - 1 && (
                                  <span
                                    aria-hidden
                                    className="absolute left-[11px] top-6 h-[calc(100%-1.25rem)] w-px bg-border"
                                  />
                                )}
                                <span className="relative z-10 grid size-6 shrink-0 place-items-center rounded-full border border-border/60 bg-background">
                                  {glyphId ? (
                                    <ConnectorIcon id={glyphId} size={13} />
                                  ) : (
                                    <Sparkles
                                      className="size-3 text-muted-foreground"
                                      strokeWidth={2}
                                    />
                                  )}
                                </span>
                                <div className="min-w-0 pt-0.5">
                                  {(() => {
                                    const links =
                                      item.links && item.links.length > 0
                                        ? item.links
                                        : item.url
                                          ? [
                                              {
                                                href: item.url,
                                                label:
                                                  linkApp ?? "View source",
                                                external:
                                                  /^https?:\/\//i.test(item.url),
                                              },
                                            ]
                                          : [];
                                    const primary = links[0] ?? null;
                                    return (
                                      <>
                                        <p className="text-[13px] leading-snug text-foreground/85">
                                          {primary ? (
                                            <EvidenceSourceAnchor
                                              href={primary.href}
                                              external={primary.external}
                                            >
                                              {item.label}
                                            </EvidenceSourceAnchor>
                                          ) : (
                                            item.label
                                          )}
                                        </p>
                                        {links.length > 1 ? (
                                          <p className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[12px] font-medium">
                                            {links.slice(1).map((link) => (
                                              <EvidenceSourceAnchor
                                                key={link.href}
                                                href={link.href}
                                                external={link.external}
                                              >
                                                {link.label}
                                                {link.external ? (
                                                  <ExternalLink
                                                    className="size-3 opacity-50"
                                                    strokeWidth={2.25}
                                                  />
                                                ) : null}
                                              </EvidenceSourceAnchor>
                                            ))}
                                          </p>
                                        ) : primary?.external ? (
                                          <span className="sr-only">
                                            Opens {primary.label}
                                          </span>
                                        ) : null}
                                      </>
                                    );
                                  })()}
                                </div>
                              </li>
                            );
                          })}
                        </ol>
                      )}
                      {vm.confidenceExplanation && (
                        <p className="mt-3 border-t border-border/30 pt-3 text-[12px] leading-relaxed text-muted-foreground">
                          {vm.confidenceExplanation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer: reversibility honesty + same pill as the card face.
                Handled plays swap approve/dismiss for feedback + undo. */}
            {(() => {
              const note = isHandled
                ? vm.outputType === "email_draft"
                  ? "Sent — emails can't be unsent. Need a correction? Fix with Salt."
                  : null
                : reversibilityNote(vm.outputType, vm.kind);
              return (
                <div className="border-t border-border/40 px-6 py-4">
                  {note && (
                    <p className="mb-3 text-[11px] leading-snug text-muted-foreground/60">
                      {note}
                    </p>
                  )}
                  {!isHandled && gateVerdict && (
                    <div
                      className={cn(
                        "mb-3 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[12px] leading-snug",
                        gateBlocked
                          ? "border-amber-500/30 bg-amber-500/5 text-amber-700"
                          : gateVerdict.kind === "will_draft"
                            ? "border-border/50 bg-muted/40 text-muted-foreground"
                            : "border-border/40 bg-muted/30 text-muted-foreground/80",
                      )}
                      role={gateBlocked ? "alert" : undefined}
                    >
                      {gateBlocked ? (
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
                      ) : (
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium">{gateVerdict.summary}</p>
                        <p className="mt-0.5 opacity-80">{gateVerdict.detail}</p>
                        {gateVerdict.fixHref && gateVerdict.fixLabel && (
                          <Link
                            href={gateVerdict.fixHref}
                            className="mt-1 inline-flex items-center gap-1 font-medium underline underline-offset-2 hover:opacity-80"
                          >
                            {gateVerdict.fixLabel}
                            <ExternalLink className="size-3" strokeWidth={2.25} />
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-end">
              {isHandled ? (
              <div className="inline-flex items-center gap-1 rounded-2xl border border-border/50 bg-muted/60 p-1">
                {onFeedback && !feedbackGiven && (
                  <>
                    <QueueIconActionButton
                      label="Helpful"
                      onClick={() => onFeedback("positive")}
                    >
                      <ThumbsUp className="size-[18px]" strokeWidth={1.75} />
                    </QueueIconActionButton>
                    <QueueIconActionButton
                      label="Not helpful"
                      onClick={() => onFeedback("negative")}
                    >
                      <ThumbsDown className="size-[18px]" strokeWidth={1.75} />
                    </QueueIconActionButton>
                  </>
                )}
                {feedbackGiven && (
                  <span
                    className={cn(
                      "inline-flex h-9 items-center gap-1 px-2 text-[10px] font-medium",
                      feedbackGiven === "positive" ? "text-emerald-600" : "text-red-500",
                    )}
                  >
                    {feedbackGiven === "positive" ? (
                      <ThumbsUp className="size-3.5" strokeWidth={2} />
                    ) : (
                      <ThumbsDown className="size-3.5" strokeWidth={2} />
                    )}
                  </span>
                )}
                {onEditWithSalt && (
                  <QueueIconActionButton label="Fix with Salt" onClick={onEditWithSalt}>
                    <Edit3 className="size-[18px]" strokeWidth={1.75} />
                  </QueueIconActionButton>
                )}
                {onUndo && (
                  <button
                    type="button"
                    onClick={onUndo}
                    disabled={isPending}
                    className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/60 bg-card px-3 text-[13px] font-semibold text-foreground transition hover:bg-muted/50 disabled:opacity-60"
                  >
                    {isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Undo2 className="size-4" strokeWidth={2} />
                    )}
                    <span>Undo</span>
                  </button>
                )}
              </div>
              ) : (
              <div className="inline-flex items-center gap-1 rounded-2xl border border-border/50 bg-muted/60 p-1">
                {onDismiss && (
                  <QueueIconActionButton
                    label="Dismiss"
                    shortcut="D"
                    disabled={isPending}
                    onClick={onDismiss}
                  >
                    <X className="size-[18px]" strokeWidth={1.75} />
                  </QueueIconActionButton>
                )}
                {onEditWithSalt && (
                  <QueueIconActionButton label="Edit with Salt" shortcut="E" onClick={onEditWithSalt}>
                    <Edit3 className="size-[18px]" strokeWidth={1.75} />
                  </QueueIconActionButton>
                )}
                {vm.primaryAction && onPrimary && (
                  <motion.button
                    type="button"
                    onClick={(e) => onPrimary(e.currentTarget)}
                    disabled={isPending || vm.error?.draftIncomplete || gateBlocked}
                    whileHover={gateBlocked ? undefined : { scale: 1.02 }}
                    whileTap={gateBlocked ? undefined : { scale: 0.97 }}
                    className={cn(
                      "surface-aurora",
                      "relative ml-1 inline-flex h-9 items-center gap-1.5 overflow-hidden rounded-xl px-4 text-[13px] font-semibold text-white shadow-[var(--shadow-lift)] transition disabled:opacity-60",
                      gateBlocked && "cursor-not-allowed"
                    )}
                  >
                    {isPending ? (
                      <Loader2 className="relative z-10 size-4 animate-spin" />
                    ) : (
                      <Sparkles className="relative z-10 size-4" strokeWidth={2.25} />
                    )}
                    <span className="relative z-10">{modalCta}</span>
                  </motion.button>
                )}
              </div>
              )}
                  </div>
                </div>
              );
            })()}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
