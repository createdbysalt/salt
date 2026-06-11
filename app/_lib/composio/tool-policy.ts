import "server-only";

import { z } from "zod";
import { COMPOSIO_TOOL_SLUGS } from "./tool-slugs";

/**
 * `destructive` tools are policy-known but can never be executed by Salt —
 * not even with human approval. Deletions happen in the source app, not here.
 */
export type ToolRiskClass = "read" | "mutating" | "destructive";

export interface ComposioToolPolicy {
  slug: string;
  risk: ToolRiskClass;
  requiresHumanConfirmation: boolean;
}

const TOOL_POLICIES: Record<string, ComposioToolPolicy> = {
  [COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL]: {
    slug: COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]: {
    slug: COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.GMAIL_GET_MESSAGE]: {
    slug: COMPOSIO_TOOL_SLUGS.GMAIL_GET_MESSAGE,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.GMAIL_LIST_LABELS]: {
    slug: COMPOSIO_TOOL_SLUGS.GMAIL_LIST_LABELS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_CREATE_EVENT]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_CREATE_EVENT,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_LIST_EVENTS]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_LIST_EVENTS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_UPDATE_EVENT]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_UPDATE_EVENT,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_DELETE_EVENT]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_DELETE_EVENT,
    risk: "destructive",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.CAL_CREATE_BOOKING]: {
    slug: COMPOSIO_TOOL_SLUGS.CAL_CREATE_BOOKING,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.CAL_LIST_BOOKINGS]: {
    slug: COMPOSIO_TOOL_SLUGS.CAL_LIST_BOOKINGS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.CAL_LIST_EVENT_TYPES]: {
    slug: COMPOSIO_TOOL_SLUGS.CAL_LIST_EVENT_TYPES,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.CAL_CANCEL_BOOKING]: {
    slug: COMPOSIO_TOOL_SLUGS.CAL_CANCEL_BOOKING,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_LIST_MEETINGS]: {
    slug: COMPOSIO_TOOL_SLUGS.FIREFLIES_LIST_MEETINGS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_TRANSCRIPT]: {
    slug: COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_TRANSCRIPT,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_SEARCH_MEETINGS]: {
    slug: COMPOSIO_TOOL_SLUGS.FIREFLIES_SEARCH_MEETINGS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
};

export function getComposioToolPolicy(toolSlug: string): ComposioToolPolicy | null {
  return TOOL_POLICIES[toolSlug] ?? null;
}

/** Tool slugs Salt's agent may ever see (everything policy-known except destructive). */
export function listAgentExposableToolSlugs(): string[] {
  return Object.values(TOOL_POLICIES)
    .filter((policy) => policy.risk !== "destructive")
    .map((policy) => policy.slug);
}

export interface ComposioToolAllowOptions {
  disabledTools?: readonly string[];
  /** Unattended contexts (background scans, scheduled jobs) may only run read tools. */
  unattended?: boolean;
}

export function assertComposioToolAllowed(
  toolSlug: string,
  options?: ComposioToolAllowOptions,
): ComposioToolPolicy {
  const policy = getComposioToolPolicy(toolSlug);
  if (!policy) {
    throw new Error(`Composio tool not allowlisted: ${toolSlug}`);
  }

  if (policy.risk === "destructive") {
    throw new Error(
      `Composio tool ${toolSlug} is destructive and can never be executed by Salt`,
    );
  }

  if (options?.unattended && policy.risk !== "read") {
    throw new Error(
      `Composio tool ${toolSlug} is ${policy.risk} and cannot run in an unattended context`,
    );
  }

  if (options?.disabledTools?.includes(toolSlug)) {
    throw new Error(`Composio tool disabled for this workspace: ${toolSlug}`);
  }

  return policy;
}

/** Per-tool runtime argument validation before execute(). */
export const composioToolInputSchemas: Record<string, z.ZodTypeAny> = {
  [COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL]: z.object({
    to: z.string().min(1),
    subject: z.string().min(1),
    body: z.string().min(1),
    cc: z.string().optional(),
    bcc: z.string().optional(),
  }),
  [COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]: z.object({
    query: z.string().optional(),
    maxResults: z.number().int().positive().max(100).optional(),
  }),
  [COMPOSIO_TOOL_SLUGS.GMAIL_GET_MESSAGE]: z.object({
    id: z.string().min(1),
  }),
  [COMPOSIO_TOOL_SLUGS.GMAIL_LIST_LABELS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_CREATE_EVENT]: z
    .object({
      summary: z.string().min(1),
      start: z.object({ dateTime: z.string().optional(), date: z.string().optional() }),
      end: z.object({ dateTime: z.string().optional(), date: z.string().optional() }),
    })
    .passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_LIST_EVENTS]: z
    .object({
      calendarId: z.string().optional(),
      timeMin: z.string().optional(),
      timeMax: z.string().optional(),
      maxResults: z.number().int().positive().max(250).optional(),
      orderBy: z.enum(["startTime", "updated"]).optional(),
    })
    .passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_UPDATE_EVENT]: z
    .object({
      eventId: z.string().min(1),
    })
    .passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_DELETE_EVENT]: z.object({
    eventId: z.string().min(1),
    calendarId: z.string().optional(),
  }),
  [COMPOSIO_TOOL_SLUGS.CAL_CANCEL_BOOKING]: z.object({
    id: z.number().int().positive(),
    reason: z.string().optional(),
  }),
  [COMPOSIO_TOOL_SLUGS.CAL_CREATE_BOOKING]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.CAL_LIST_BOOKINGS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.CAL_LIST_EVENT_TYPES]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_LIST_MEETINGS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_TRANSCRIPT]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_SEARCH_MEETINGS]: z.object({}).passthrough(),
};

export function parseComposioToolInput<T>(
  toolSlug: string,
  input: T,
): Record<string, unknown> {
  const schema = composioToolInputSchemas[toolSlug];
  if (!schema) {
    throw new Error(`No input schema registered for Composio tool: ${toolSlug}`);
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid Composio tool input for ${toolSlug}: ${parsed.error.message}`);
  }
  return parsed.data as Record<string, unknown>;
}
