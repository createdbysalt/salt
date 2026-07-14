import {
  Briefcase,
  Building2,
  Calendar,
  FileText,
  Files,
  Inbox,
  Play,
  User,
  WalletCards,
} from "lucide-react";
import type {
  EntityContext,
  EntityTypeConfig,
  LegacyAskSaltContext,
  LegacyBillingContext,
  LegacyCaptureContext,
  LegacyFileContext,
  LegacyFilesContext,
  LegacyMeetingContext,
  LegacyOrgContext,
  LegacyPersonContext,
  LegacyPlayContext,
  LegacyWorkContext,
} from "../types/entity-context";

/**
 * Icon, label, and color configuration per entity type.
 */
export const ENTITY_TYPE_CONFIG: Record<EntityContext["type"], EntityTypeConfig> = {
  person: {
    icon: User,
    actionLabel: "Discussing Person",
    color: "bg-muted",
  },
  org: {
    icon: Building2,
    actionLabel: "Discussing Organization",
    color: "bg-muted",
  },
  work: {
    icon: Briefcase,
    actionLabel: "Discussing Work",
    color: "bg-muted",
  },
  play: {
    icon: Play,
    actionLabel: "Editing Play",
    color: "surface-aurora",
  },
  capture: {
    icon: Inbox,
    actionLabel: "Reviewing Capture",
    color: "bg-muted",
  },
  billing: {
    icon: WalletCards,
    actionLabel: "Reviewing",
    color: "bg-muted",
  },
  meeting: {
    icon: Calendar,
    actionLabel: "Discussing Meeting",
    color: "bg-muted",
  },
  file: {
    icon: FileText,
    actionLabel: "Reviewing File",
    color: "bg-muted",
  },
  files: {
    icon: Files,
    actionLabel: "Reviewing Files",
    color: "bg-muted",
  },
};

/**
 * Get the icon component for an entity type.
 */
export function getEntityIcon(type: EntityContext["type"]) {
  return ENTITY_TYPE_CONFIG[type].icon;
}

/**
 * Get the action label for an entity type.
 */
export function getEntityActionLabel(type: EntityContext["type"]) {
  return ENTITY_TYPE_CONFIG[type].actionLabel;
}

/**
 * Join non-empty strings with a separator.
 */
function joinDetails(parts: (string | null | undefined)[], separator = " · "): string | undefined {
  const filtered = parts.filter(Boolean) as string[];
  return filtered.length > 0 ? filtered.join(separator) : undefined;
}

/**
 * Convert a Person to EntityContext.
 */
export function personToEntityContext(ctx: LegacyPersonContext): EntityContext {
  return {
    type: "person",
    id: ctx.id,
    title: ctx.name,
    actionLabel: ENTITY_TYPE_CONFIG.person.actionLabel,
    subtitle: joinDetails([
      ctx.relationship,
      ctx.orgName && `at ${ctx.orgName}`,
      ctx.lifecycle,
    ]),
    href: ctx.href,
  };
}

/**
 * Convert an Org to EntityContext.
 */
export function orgToEntityContext(ctx: LegacyOrgContext): EntityContext {
  return {
    type: "org",
    id: ctx.id,
    title: ctx.name,
    actionLabel: ENTITY_TYPE_CONFIG.org.actionLabel,
    subtitle: joinDetails([ctx.relationship, ctx.industry, ctx.lifecycle]),
    href: ctx.href,
  };
}

/**
 * Convert Work to EntityContext.
 */
export function workToEntityContext(ctx: LegacyWorkContext): EntityContext {
  return {
    type: "work",
    id: ctx.id,
    title: ctx.title,
    actionLabel: ENTITY_TYPE_CONFIG.work.actionLabel,
    subtitle: joinDetails([
      ctx.orgName && `for ${ctx.orgName}`,
      ctx.stage && `${ctx.stage} stage`,
      ctx.healthBand && `${ctx.healthBand} health`,
    ]),
    href: ctx.href,
  };
}

/**
 * Convert Play to EntityContext.
 */
export function playToEntityContext(ctx: LegacyPlayContext): EntityContext {
  return {
    type: "play",
    id: ctx.id,
    title: ctx.title,
    actionLabel: `${ENTITY_TYPE_CONFIG.play.actionLabel} · to ${ctx.recipientLabel}`,
    subtitle: ctx.sourceLabel ? `Source: ${ctx.sourceLabel}` : undefined,
    href: ctx.href,
  };
}

/**
 * Convert Capture to EntityContext.
 */
export function captureToEntityContext(ctx: LegacyCaptureContext): EntityContext {
  return {
    type: "capture",
    id: ctx.captureId,
    title: ctx.title,
    actionLabel: ENTITY_TYPE_CONFIG.capture.actionLabel,
    subtitle: joinDetails([
      ctx.sourceLabel,
      ctx.suggestedSurface && `Suggested: ${ctx.suggestedSurface}`,
    ]),
    href: ctx.href,
  };
}

/**
 * Convert Billing to EntityContext.
 */
export function billingToEntityContext(ctx: LegacyBillingContext): EntityContext {
  const directionLabel = ctx.direction === "receivable" ? "Invoice" : "Bill";
  return {
    type: "billing",
    id: ctx.id,
    title: `${directionLabel} · ${ctx.amount}`,
    actionLabel: `Reviewing ${directionLabel}`,
    subtitle: joinDetails([ctx.partyName, ctx.status]),
    href: ctx.href,
  };
}

/**
 * Convert Meeting to EntityContext.
 */
export function meetingToEntityContext(ctx: LegacyMeetingContext): EntityContext {
  return {
    type: "meeting",
    id: ctx.id,
    title: ctx.title,
    actionLabel: ENTITY_TYPE_CONFIG.meeting.actionLabel,
    subtitle: joinDetails([ctx.date, ctx.clientName, ctx.projectName]),
    href: ctx.href,
  };
}

/**
 * Convert File to EntityContext.
 */
export function fileToEntityContext(ctx: LegacyFileContext): EntityContext {
  return {
    type: "file",
    id: ctx.id,
    title: ctx.title,
    actionLabel: ENTITY_TYPE_CONFIG.file.actionLabel,
    subtitle: joinDetails([`Connected to ${ctx.connectedLabel}`, ctx.sourceLabel]),
    href: ctx.href,
  };
}

/**
 * Convert Files to EntityContext.
 */
export function filesToEntityContext(ctx: LegacyFilesContext): EntityContext {
  const fileNames = ctx.files.map((f) => f.title).join(", ");
  return {
    type: "files",
    id: ctx.files.map((f) => f.id).join(","),
    title: `${ctx.files.length} files selected`,
    actionLabel: ENTITY_TYPE_CONFIG.files.actionLabel,
    subtitle: fileNames,
    href: ctx.href,
  };
}

/**
 * Convert any legacy AskSaltContext to unified EntityContext.
 */
export function toEntityContext(ctx: LegacyAskSaltContext): EntityContext {
  switch (ctx.type) {
    case "person":
      return personToEntityContext(ctx);
    case "org":
      return orgToEntityContext(ctx);
    case "work":
      return workToEntityContext(ctx);
    case "play":
      return playToEntityContext(ctx);
    case "capture":
      return captureToEntityContext(ctx);
    case "billing":
      return billingToEntityContext(ctx);
    case "meeting":
      return meetingToEntityContext(ctx);
    case "file":
      return fileToEntityContext(ctx);
    case "files":
      return filesToEntityContext(ctx);
  }
}

/**
 * Build a contextual prompt prefix from an EntityContext.
 * Used to include context in the message sent to the AI.
 */
export function buildContextualPromptFromEntity(
  prompt: string,
  context: EntityContext | null
): string {
  if (!context) return prompt;

  const parts = [`[${context.actionLabel}: ${context.title}`];
  if (context.subtitle) {
    parts.push(context.subtitle);
  }
  const prefix = `${parts.join(", ")}]`;
  return prompt ? `${prefix}\n\n${prompt}` : prefix;
}
