import type { CaptureTriggerSpec } from "./trigger-subscriptions";

/**
 * Per-connection capture scoping (Sources plan 4.5).
 *
 * The 3.2 filter audit seeded GLOBAL upstream filters in
 * connector_trigger_types.capture_trigger_config. This module is the
 * per-workspace layer on top: a user's own scoping choice (one Slack
 * channel, one calendar, one Drive folder, Gmail category toggles) stored
 * on workspace_integrations.config.captureScope and merged into the
 * trigger spec at subscribe time — enable, reconciliation re-create, and
 * the 4.2 upsert wrapper all go through applyScopeToSpecs, so a scoped
 * subscription survives re-subscribes.
 *
 * Every scoped event is an upstream event that never fires a (billed)
 * webhook delivery — scoping is the user-facing cost control.
 *
 * Pure module: no server-only imports, safe for client components (scope
 * display) and Vitest.
 */

export const GMAIL_CATEGORIES = ["promotions", "social", "updates", "forums"] as const;
export type GmailCategory = (typeof GMAIL_CATEGORIES)[number];

/** The category-free base of the seeded GMAIL_NEW_GMAIL_MESSAGE query. */
export const GMAIL_CATEGORY_QUERY_BASE = "{label:inbox label:sent}";

export type CaptureScope =
  | { kind: "slack_channel"; channelId: string; label: string }
  | { kind: "calendar"; calendarId: string; label: string }
  | { kind: "drive_folder"; folderId: string; label: string }
  | { kind: "gmail_categories"; excluded: GmailCategory[] };

/** One pickable scope target (channel, calendar, folder) for the UI. */
export interface CaptureScopeOption {
  id: string;
  label: string;
}

/**
 * Provider → (scope kind, capture trigger the scope applies to). Providers
 * not listed here have no single-value upstream filter worth surfacing
 * (Slack DMs, for instance, take no config at all).
 */
const SCOPE_TARGETS: Record<string, { kind: CaptureScope["kind"]; slug: string }> = {
  slack: { kind: "slack_channel", slug: "SLACK_CHANNEL_MESSAGE_RECEIVED" },
  googlecalendar: {
    kind: "calendar",
    slug: "GOOGLECALENDAR_GOOGLE_CALENDAR_EVENT_CREATED_TRIGGER",
  },
  googledrive: { kind: "drive_folder", slug: "GOOGLEDRIVE_FILE_CREATED_TRIGGER" },
  gmail: { kind: "gmail_categories", slug: "GMAIL_NEW_GMAIL_MESSAGE" },
};

export function scopableProvider(provider: string): boolean {
  return provider in SCOPE_TARGETS;
}

/** The scope kind a provider accepts, or null when it isn't scopable. */
export function scopeKindForProvider(
  provider: string,
): CaptureScope["kind"] | null {
  return SCOPE_TARGETS[provider]?.kind ?? null;
}

/** The capture trigger a provider's scope applies to. */
export function scopeTargetSlug(provider: string): string | null {
  return SCOPE_TARGETS[provider]?.slug ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isGmailCategory(value: unknown): value is GmailCategory {
  return (
    typeof value === "string" &&
    (GMAIL_CATEGORIES as readonly string[]).includes(value)
  );
}

/**
 * Read and validate config.captureScope. Anything malformed reads as
 * unscoped — a corrupt scope must never block capture, it just falls back
 * to the global filters.
 */
export function readCaptureScope(config: unknown): CaptureScope | null {
  if (!isRecord(config) || !isRecord(config.captureScope)) return null;
  const scope = config.captureScope;

  switch (scope.kind) {
    case "slack_channel":
      if (typeof scope.channelId !== "string" || !scope.channelId) return null;
      return {
        kind: "slack_channel",
        channelId: scope.channelId,
        label: typeof scope.label === "string" ? scope.label : scope.channelId,
      };
    case "calendar":
      if (typeof scope.calendarId !== "string" || !scope.calendarId) return null;
      return {
        kind: "calendar",
        calendarId: scope.calendarId,
        label: typeof scope.label === "string" ? scope.label : scope.calendarId,
      };
    case "drive_folder":
      if (typeof scope.folderId !== "string" || !scope.folderId) return null;
      return {
        kind: "drive_folder",
        folderId: scope.folderId,
        label: typeof scope.label === "string" ? scope.label : scope.folderId,
      };
    case "gmail_categories": {
      const excluded = Array.isArray(scope.excluded)
        ? scope.excluded.filter(isGmailCategory)
        : [];
      return { kind: "gmail_categories", excluded };
    }
    default:
      return null;
  }
}

/**
 * Return a new config with captureScope set (or removed when null). Never
 * mutates the input; other keys (captureTriggerIds, emailMode, …) pass
 * through untouched.
 */
export function withCaptureScope(
  config: Record<string, unknown>,
  scope: CaptureScope | null,
): Record<string, unknown> {
  const next = { ...config };
  if (scope === null) {
    delete next.captureScope;
  } else {
    next.captureScope = scope;
  }
  return next;
}

/**
 * Rebuild the Gmail trigger query with a different category exclusion set.
 * Category tokens (positive or negative) are stripped from the base, then
 * the excluded set is appended in canonical order — the user's choice owns
 * the category clause; every other token of the curated base is preserved.
 * A missing base falls back to the canonical inbox+sent shape.
 */
export function buildGmailCategoryQuery(
  baseQuery: string | null,
  excluded: readonly GmailCategory[],
): string {
  const baseTokens = (baseQuery ?? GMAIL_CATEGORY_QUERY_BASE)
    .split(/\s+/)
    .filter((token) => token.length > 0 && !/^-?category:\S+$/.test(token));
  const base = baseTokens.length > 0 ? baseTokens.join(" ") : GMAIL_CATEGORY_QUERY_BASE;

  const exclusions = GMAIL_CATEGORIES.filter((category) =>
    excluded.includes(category),
  ).map((category) => `-category:${category}`);

  return [base, ...exclusions].join(" ");
}

/**
 * Merge a workspace's scope into the global capture specs. Only the
 * provider's scoping trigger changes; every other spec passes through by
 * identity. A null or provider-mismatched scope returns the specs
 * unchanged.
 */
export function applyScopeToSpecs(
  provider: string,
  specs: readonly CaptureTriggerSpec[],
  scope: CaptureScope | null,
): CaptureTriggerSpec[] {
  const target = SCOPE_TARGETS[provider];
  if (!target || !scope || scope.kind !== target.kind) {
    return [...specs];
  }

  return specs.map((spec) => {
    if (spec.slug !== target.slug) return spec;
    const base = spec.config ?? {};

    switch (scope.kind) {
      case "slack_channel":
        return { ...spec, config: { ...base, channel_id: scope.channelId } };
      case "calendar":
        return { ...spec, config: { ...base, calendarId: scope.calendarId } };
      case "drive_folder":
        return { ...spec, config: { ...base, folder_id: scope.folderId } };
      case "gmail_categories":
        return {
          ...spec,
          config: {
            ...base,
            query: buildGmailCategoryQuery(
              typeof base.query === "string" ? base.query : null,
              scope.excluded,
            ),
          },
        };
    }
  });
}
