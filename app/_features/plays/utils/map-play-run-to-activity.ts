import type {
  ActivityEntryRow,
  PlayActivityActor,
  PlayActivityCategory,
  PlayActivityDayGroup,
  PlayActivityItem,
  PlayActivityRunRow,
  PlayRunState,
  PlayValueKind,
} from "../types";
import {
  activityFriendlyError,
  curatedActivityAction,
  pastTenseAction,
} from "@/app/_features/connectors/utils/activity-format";

const CATEGORY_BY_STATE: Record<PlayRunState, PlayActivityCategory | null> = {
  ran: "completed",
  executing: "in-progress",
  scheduled: "in-progress",
  approved: "in-progress",
  failed: "needs-attention",
  blocked: "needs-attention",
  dismissed: "decided",
  // draft + queued live in the Queue tab, not the audit trail.
  draft: null,
  queued: null,
};

/** State → Activity category. Single source of truth for the tab's filters. */
export function activityCategoryForState(
  state: PlayRunState,
): PlayActivityCategory | null {
  return CATEGORY_BY_STATE[state] ?? null;
}

const VALUE_KIND_LABELS: Record<PlayValueKind, string> = {
  invoice_collected: "collected",
  invoice_sent: "invoiced",
  booking_created: "booked",
  time_saved: "saved",
  gap_closed: "closed",
};

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Monday-first start of the week containing `day`. */
function startOfWeek(day: Date): Date {
  const start = new Date(day);
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

/**
 * Recent runs bucket into "Today" / "Yesterday" / "Earlier this week" /
 * "Last week"; anything older gets an explicit date label so pages deep in
 * the history don't collapse into one meaningless group.
 */
export function dayGroupFromIso(
  iso: string,
  now: Date = new Date(),
): PlayActivityDayGroup {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const entryDay = new Date(iso);
  entryDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (today.getTime() - entryDay.getTime()) / 86_400_000,
  );
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";

  const weekStart = startOfWeek(today);
  if (entryDay.getTime() >= weekStart.getTime()) return "Earlier this week";
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  if (entryDay.getTime() >= lastWeekStart.getTime()) return "Last week";

  const sameYear = entryDay.getFullYear() === today.getFullYear();
  return new Intl.DateTimeFormat(
    "en-US",
    sameYear
      ? { month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" },
  ).format(entryDay);
}

function humanizeSlug(slug: string): string {
  return slug.replace(/_/g, " ").trim();
}

/**
 * Legacy rows carry de-slugged tool titles ("Stripe create customer",
 * "Salt ran Gmail send email"). Detect that exact shape — provider word +
 * all-lowercase remainder — and rewrite with the connectors' curated
 * past-tense copy. Natural-language titles ("Email Maya about the proposal")
 * never match the shape and pass through untouched.
 */
const PROVIDER_TITLE_WORDS = new Set([
  "stripe",
  "gmail",
  "googlecalendar",
  "googledrive",
  "slack",
  "notion",
  "quickbooks",
  "cal",
  "hubspot",
  "linear",
  "outlook",
  "asana",
  "docusign",
  "calendly",
]);

const PROVIDER_DISPLAY: Record<string, string> = {
  googlecalendar: "Google Calendar",
  googledrive: "Google Drive",
  quickbooks: "QuickBooks",
};

function friendlyActivityTitle(title: string): string {
  const stripped = title.replace(/^salt ran /i, "").trim();
  const match = /^([A-Za-z.]+)((?: [a-z0-9]+)+)$/.exec(stripped);
  if (!match) return title;
  const provider = match[1].toLowerCase();
  if (!PROVIDER_TITLE_WORDS.has(provider)) return title;
  const slugCandidate = stripped.toUpperCase().replace(/[\s.]+/g, "_");
  const curated = curatedActivityAction(slugCandidate);
  if (curated) return curated;
  const action = pastTenseAction(match[2].trim());
  return `${action} in ${PROVIDER_DISPLAY[provider] ?? match[1]}`;
}

/** Same transform as play-card's private formatToolSlug: "GMAIL_SEND_EMAIL" → "Send Email". */
function formatToolSlug(slug: string): string {
  return slug
    .replace(/_/g, " ")
    .replace(/^(GMAIL|GOOGLECALENDAR|STRIPE|SLACK|NOTION)\s*/i, "")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(
  kind: PlayValueKind,
  amount: number,
  currency: string | null,
): string {
  if (kind === "time_saved") {
    return `${amount} min ${VALUE_KIND_LABELS[kind]}`;
  }
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency ?? "USD",
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted} ${VALUE_KIND_LABELS[kind]}`;
}

function wasUserApproved(row: PlayActivityRunRow): boolean {
  return Boolean(row.source_context?.user_approved_at ?? row.approved_at);
}

function actorFor(row: PlayActivityRunRow): PlayActivityActor {
  if (row.state === "dismissed") return "you";
  if (row.state === "ran" || row.state === "approved" || row.state === "scheduled") {
    return wasUserApproved(row) ? "you" : "salt";
  }
  return "salt";
}

function badgeLabelFor(row: PlayActivityRunRow, actor: PlayActivityActor): string {
  switch (row.state) {
    case "ran":
      return actor === "you" ? "You approved" : "Salt acted";
    case "executing":
      return "Executing";
    case "scheduled":
      return "Scheduled";
    case "approved":
      return "Approved — queued";
    case "failed":
      return "Failed";
    case "blocked":
      return "Blocked";
    case "dismissed":
      return "Dismissed";
    default:
      return "In Progress";
  }
}

function nextStepLabelFor(row: PlayActivityRunRow): string | null {
  if (row.paused_for_approval && row.approval_context) {
    const tool = formatToolSlug(row.approval_context.tool_slug);
    return row.state === "blocked"
      ? `Reconnect, then approve to resume: ${tool}`
      : `Approve: ${tool}`;
  }
  if (row.state === "blocked") return "Reconnect, then approve to resume";
  if (row.state === "executing") return "Executing now";
  if (row.state === "approved") return "Queued to run";
  if (row.state === "scheduled") {
    return row.scheduled_for
      ? `Runs ${formatTime(row.scheduled_for)}`
      : (row.eta_label ?? "Scheduled");
  }
  return null;
}

function errorCopyFor(row: PlayActivityRunRow): {
  label: string | null;
  detail: string | null;
} {
  if (row.state !== "failed" && row.state !== "blocked") {
    return { label: null, detail: null };
  }
  const raw = row.last_error;
  if (!raw) {
    return {
      label: row.state === "blocked" ? "Connector needs attention" : "Run failed",
      detail: null,
    };
  }
  const friendly = activityFriendlyError({ status: "error", error: raw });
  return { label: friendly ?? raw, detail: raw };
}

function approvalLabelFor(row: PlayActivityRunRow): string | null {
  if (
    row.source_context?.source === "ask_salt" &&
    row.source_context.user_approved_at
  ) {
    return "You approved in Ask Salt";
  }
  if (wasUserApproved(row)) return "Approved in Queue";
  if (row.state === "ran") return "Auto-handled by Salt";
  return null;
}

function readDurationMs(
  row: PlayActivityRunRow,
  events: ActivityEntryRow[],
): number | null {
  for (const entry of events) {
    const value = entry.metadata?.duration_ms;
    if (typeof value === "number" && value > 0) return value;
  }
  const fromRun = row.metadata?.duration_ms;
  return typeof fromRun === "number" && fromRun > 0 ? fromRun : null;
}

/**
 * Undo only applies to runs Salt executed autonomously — user-approved runs
 * were already a deliberate decision. The undo action consumes an activity
 * entry id, so surface the run's auto-applied/auto-executed entry when present.
 */
function undoEntryIdFor(
  row: PlayActivityRunRow,
  events: ActivityEntryRow[],
): string | null {
  if (row.state !== "ran" || wasUserApproved(row)) return null;
  const undoable = events.find(
    (entry) =>
      entry.action === "auto_applied" || entry.metadata?.auto_executed === true,
  );
  return undoable?.id ?? null;
}

export function mapPlayRunToActivity(row: PlayActivityRunRow): PlayActivityItem {
  const events = row.events ?? [];
  const sortIso = row.ran_at ?? row.dismissed_at ?? row.updated_at;
  const actor = actorFor(row);
  const sources = (row.sources ?? []).map((s) => ({
    label: s.label ?? s.source_type ?? "Source",
    url: s.external_url,
  }));
  const playbookSlug = row.source_context?.playbook_slug ?? null;
  const category = CATEGORY_BY_STATE[row.state] ?? "in-progress";
  const errorCopy = errorCopyFor(row);

  return {
    id: row.id,
    time: formatTime(sortIso),
    dayGroup: dayGroupFromIso(sortIso),
    sortIso,
    title: friendlyActivityTitle(row.title),
    target: row.target_label ?? row.recipient_label ?? "",
    category,
    actor,
    badgeLabel: badgeLabelFor(row, actor),
    state: row.state,
    playbookName: row.playbookName ?? null,
    playbookHref: playbookSlug ? `/plays/playbooks/${playbookSlug}` : null,
    outcome: row.preview,
    valueLabel:
      row.value_kind != null && row.value_amount != null
        ? formatValue(row.value_kind, row.value_amount, row.value_currency)
        : null,
    valueEstimated: row.value_basis !== "actual",
    triggerLabel: row.source_context?.trigger_signal
      ? humanizeSlug(row.source_context.trigger_signal)
      : null,
    sources,
    durationMs: readDurationMs(row, events),
    errorLabel: errorCopy.label,
    errorDetail: errorCopy.detail,
    nextStepLabel: nextStepLabelFor(row),
    etaLabel: row.eta_label,
    pausedForApproval: row.paused_for_approval === true,
    decisionLabel:
      row.state === "dismissed"
        ? "Dismissed"
        : wasUserApproved(row)
          ? "Approved"
          : null,
    approvalLabel: approvalLabelFor(row),
    channelLabel: row.channel ?? null,
    playbookSection: row.playbookSection ?? null,
    timeline: events.map((entry) => ({
      id: entry.id,
      time: formatTime(entry.created_at),
      title: friendlyActivityTitle(entry.title),
      detail: entry.detail,
    })),
    undoEntryId: undoEntryIdFor(row, events),
    sourceUrl: sources.find((s) => s.url)?.url ?? null,
  };
}
