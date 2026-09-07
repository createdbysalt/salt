import "server-only";

import { committedSpend, sendLlm } from "@/app/_lib/ai/gpt";
import { resolveModel } from "@/app/_lib/ai/models";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { Json } from "@/app/_lib/supabase/database.types";
import { cronMatchesHour } from "@/app/_features/plays/playbooks/schedule-matcher";
import {
  DAILY_BRIEFING_CRON,
  DAILY_BRIEFING_TIMEZONE,
  type BriefingDraft,
  type BriefingInputs,
  type BriefingOpportunityGap,
  type BlockedWorkItem,
  type DailyBriefing,
  type DailyBriefingSections,
  type GenerateDailyBriefingResult,
  type OverdueBillingItem,
  type SilentRelationshipItem,
  type TodayMeetingItem,
} from "./types";

const EMPTY_SECTIONS: DailyBriefingSections = {
  urgent: [],
  today: [],
  relationships: [],
};

const SYSTEM_PROMPT = `You are Salt, the proactive operating layer for a solo service professional. Write their weekday morning briefing.

Voice: concise, factual, scannable. Use bullet points. Lead with the most important info. No pleasantries or filler. No emojis. No exclamation marks. Second person.

Ground the briefing ONLY in the facts provided. Never invent names, amounts, dates, or meetings.

Produce JSON only (no markdown fences):
{"content":"1-2 sentence lede","sections":{"urgent":["..."],"today":["..."],"relationships":["..."]}}

Skip any section that has no facts. Keep each bullet specific (amounts, days, times).`;

export function briefingDateInTimezone(
  now: Date,
  timezone: string = DAILY_BRIEFING_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isDailyBriefingDue(now: Date): boolean {
  return cronMatchesHour(DAILY_BRIEFING_CRON, now, DAILY_BRIEFING_TIMEZONE);
}

export function isBriefingInputsEmpty(inputs: BriefingInputs): boolean {
  return (
    inputs.overdueBilling.length === 0 &&
    inputs.blockedWork.length === 0 &&
    inputs.todayMeetings.length === 0 &&
    inputs.silentRelationships.length === 0 &&
    inputs.opportunityGap === null
  );
}

export function decideBriefingAction(
  exists: boolean,
  inputs: BriefingInputs,
): "already_exists" | "skipped_empty" | "generate" {
  if (exists) return "already_exists";
  if (isBriefingInputsEmpty(inputs)) return "skipped_empty";
  return "generate";
}

function formatDollars(amountCents: number): string {
  return `$${Math.round(amountCents / 100).toLocaleString("en-US")}`;
}

function formatMeetingTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: DAILY_BRIEFING_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
  });
}

function overdueLine(item: OverdueBillingItem): string {
  const number = item.number ? `Invoice #${item.number}` : "Invoice";
  const days = item.daysOverdue === 1 ? "1 day" : `${item.daysOverdue} days`;
  return `${number} to ${item.label} (${formatDollars(item.amountCents)}) is ${days} overdue`;
}

export function buildBriefingPrompt(inputs: BriefingInputs): string {
  const lines: string[] = [
    "Create a morning briefing for the operator.",
    "",
    "Include sections for:",
    "- Urgent (overdue invoices, blocked work)",
    "- Today (meetings, deadlines)",
    "- Relationships (who to follow up with)",
    "",
    "Be concise. Use bullet points.",
    "Skip empty sections.",
    "",
    "Facts:",
  ];

  if (inputs.overdueBilling.length > 0) {
    lines.push("", "Overdue invoices:");
    for (const item of inputs.overdueBilling) {
      lines.push(`- ${overdueLine(item)}`);
    }
  }

  if (inputs.blockedWork.length > 0) {
    lines.push("", "Blocked work:");
    for (const item of inputs.blockedWork) {
      lines.push(`- ${item.name}: ${item.blockerReason}`);
    }
  }

  if (inputs.todayMeetings.length > 0) {
    lines.push("", "Today:");
    for (const item of inputs.todayMeetings) {
      const time = formatMeetingTime(item.startTime);
      const who = item.who ? ` with ${item.who}` : "";
      lines.push(`- ${time} — ${item.title}${who}`);
    }
  }

  if (inputs.silentRelationships.length > 0) {
    lines.push("", "Silent relationships:");
    for (const item of inputs.silentRelationships) {
      const days =
        item.daysSinceContact == null
          ? "unknown last contact"
          : `${item.daysSinceContact} days`;
      const type = item.relationshipType ? ` (${item.relationshipType})` : "";
      lines.push(`- ${item.name}${type} — quiet for ${days}`);
    }
  }

  if (inputs.opportunityGap) {
    const gap = inputs.opportunityGap;
    lines.push("", "Opportunity:");
    lines.push(`- ${gap.claim}`);
    if (gap.summary) lines.push(`  ${gap.summary}`);
    if (gap.amountLabel) lines.push(`  ${gap.amountLabel}`);
  }

  return lines.join("\n");
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function stripJsonFences(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  }
  return trimmed;
}

export function parseBriefingDraft(raw: string): BriefingDraft {
  try {
    const parsed = JSON.parse(stripJsonFences(raw)) as {
      content?: unknown;
      sections?: {
        urgent?: unknown;
        today?: unknown;
        relationships?: unknown;
      };
    };
    const content =
      typeof parsed.content === "string" ? parsed.content.trim() : "";
    if (!content && !parsed.sections) {
      return { content: raw.trim(), sections: { ...EMPTY_SECTIONS } };
    }
    return {
      content: content || raw.trim(),
      sections: {
        urgent: asStringArray(parsed.sections?.urgent),
        today: asStringArray(parsed.sections?.today),
        relationships: asStringArray(parsed.sections?.relationships),
      },
    };
  } catch {
    return { content: raw.trim(), sections: { ...EMPTY_SECTIONS } };
  }
}

function parseStoredSections(value: unknown): DailyBriefingSections {
  if (!value || typeof value !== "object") return { ...EMPTY_SECTIONS };
  const record = value as Record<string, unknown>;
  return {
    urgent: asStringArray(record.urgent),
    today: asStringArray(record.today),
    relationships: asStringArray(record.relationships),
  };
}

export function mapBriefingRow(row: {
  id: string;
  workspace_id: string;
  briefing_date: string;
  content: string;
  sections: unknown;
  model: string | null;
  created_at: string;
}): DailyBriefing {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    briefingDate: row.briefing_date,
    content: row.content,
    sections: parseStoredSections(row.sections),
    model: row.model,
    createdAt: row.created_at,
  };
}

function formatAmountLabel(
  min: number | null,
  max: number | null,
  currency: string | null,
): string | null {
  if (min == null && max == null) return null;
  const symbol = currency === "USD" || !currency ? "$" : `${currency} `;
  const low = min ?? max;
  const high = max ?? min;
  if (low == null || high == null) return null;
  if (low === high) return `${symbol}${Math.round(low).toLocaleString("en-US")}`;
  return `${symbol}${Math.round(low).toLocaleString("en-US")}–${Math.round(high).toLocaleString("en-US")}`;
}

function torontoDayQueryWindow(date: string): { gte: string; lt: string } {
  const start = new Date(`${date}T00:00:00.000Z`);
  start.setUTCHours(start.getUTCHours() - 14);
  const end = new Date(`${date}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  end.setUTCHours(end.getUTCHours() + 14);
  return { gte: start.toISOString(), lt: end.toISOString() };
}

export async function findExistingBriefing(
  workspaceId: string,
  briefingDate: string,
): Promise<DailyBriefing | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("hq_daily_briefings")
    .select("id, workspace_id, briefing_date, content, sections, model, created_at")
    .eq("workspace_id", workspaceId)
    .eq("briefing_date", briefingDate)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load briefing: ${error.message}`);
  }
  if (!data) return null;
  return mapBriefingRow(data);
}

async function gatherOverdueBilling(
  workspaceId: string,
): Promise<OverdueBillingItem[]> {
  const admin = createAdminClient();
  const now = new Date();
  const { data, error } = await admin
    .from("billing_records")
    .select(
      "id, amount_cents, amount_paid_cents, due_at, status, vendor_label, number, organizations(name, deleted_at, archived_at)",
    )
    .eq("workspace_id", workspaceId)
    .eq("direction", "receivable")
    .in("status", ["due", "overdue", "partial"])
    .is("deleted_at", null)
    .is("archived_at", null)
    .limit(25);

  if (error) {
    throw new Error(`Failed to load overdue billing: ${error.message}`);
  }

  const items: OverdueBillingItem[] = [];
  for (const row of data ?? []) {
    const org = row.organizations as unknown as {
      name: string;
      deleted_at: string | null;
      archived_at: string | null;
    } | null;
    if (org && (org.deleted_at !== null || org.archived_at !== null)) continue;

    const dueAt = row.due_at ? new Date(row.due_at as string) : null;
    const isOverdue =
      row.status === "overdue" || (dueAt !== null && dueAt < now);
    if (!isOverdue) continue;

    const amountCents = Math.max(
      0,
      ((row.amount_cents as number | null) ?? 0) -
        ((row.amount_paid_cents as number | null) ?? 0),
    );
    const daysOverdue = dueAt
      ? Math.max(0, Math.floor((now.getTime() - dueAt.getTime()) / 86_400_000))
      : 0;

    items.push({
      id: row.id as string,
      label: org?.name ?? (row.vendor_label as string | null) ?? "Client",
      amountCents,
      daysOverdue,
      number: (row.number as string | null) ?? null,
    });
  }

  return items.sort((a, b) => b.daysOverdue - a.daysOverdue).slice(0, 10);
}

async function gatherBlockedWork(workspaceId: string): Promise<BlockedWorkItem[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("work_blockers")
    .select("work_id, title, detail, work:work_id(name)")
    .eq("workspace_id", workspaceId)
    .is("resolved_at", null)
    .order("detected_at", { ascending: false })
    .limit(10);

  if (error) {
    throw new Error(`Failed to load blocked work: ${error.message}`);
  }

  return (data ?? []).map((row) => {
    const work = row.work as { name?: string } | null;
    return {
      id: row.work_id as string,
      name: work?.name ?? "Work item",
      blockerReason: (row.detail as string) ?? (row.title as string),
    };
  });
}

async function gatherTodayMeetings(
  workspaceId: string,
  briefingDate: string,
): Promise<TodayMeetingItem[]> {
  const admin = createAdminClient();
  const window = torontoDayQueryWindow(briefingDate);
  const { data, error } = await admin
    .from("meetings")
    .select(
      "id, title, start_time, people:person_id(name), organizations:organization_id(name)",
    )
    .eq("workspace_id", workspaceId)
    .eq("status", "scheduled")
    .is("deleted_at", null)
    .is("archived_at", null)
    .gte("start_time", window.gte)
    .lt("start_time", window.lt)
    .order("start_time", { ascending: true })
    .limit(20);

  if (error) {
    throw new Error(`Failed to load today's meetings: ${error.message}`);
  }

  return (data ?? [])
    .filter((row) => {
      const start = row.start_time as string | null;
      if (!start) return false;
      return briefingDateInTimezone(new Date(start)) === briefingDate;
    })
    .map((row) => {
      const person = row.people as unknown as { name: string } | null;
      const org = row.organizations as unknown as { name: string } | null;
      return {
        id: row.id as string,
        title: row.title as string,
        startTime: row.start_time as string,
        who: person?.name ?? org?.name ?? null,
      };
    });
}

async function gatherSilentRelationships(
  workspaceId: string,
): Promise<SilentRelationshipItem[]> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("people")
    .select("id, name, relationship_type, last_contact_at")
    .eq("workspace_id", workspaceId)
    .lt("last_contact_at", cutoff.toISOString())
    .is("archived_at", null)
    .is("deleted_at", null)
    .order("last_contact_at", { ascending: true })
    .limit(10);

  if (error) {
    throw new Error(`Failed to load silent relationships: ${error.message}`);
  }

  const now = Date.now();
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    relationshipType: (row.relationship_type as string | null) ?? null,
    daysSinceContact: row.last_contact_at
      ? Math.floor(
          (now - new Date(row.last_contact_at as string).getTime()) /
            (24 * 60 * 60 * 1000),
        )
      : null,
  }));
}

async function gatherOpportunityGap(
  workspaceId: string,
): Promise<BriefingOpportunityGap | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("opportunity_gaps")
    .select("claim, summary, amount_min, amount_max, currency")
    .eq("workspace_id", workspaceId)
    .is("dismissed_at", null)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load opportunity gap: ${error.message}`);
  }
  if (!data) return null;

  return {
    claim: data.claim as string,
    summary: (data.summary as string | null) ?? null,
    amountLabel: formatAmountLabel(
      (data.amount_min as number | null) ?? null,
      (data.amount_max as number | null) ?? null,
      (data.currency as string | null) ?? null,
    ),
  };
}

export async function gatherBriefingInputs(
  workspaceId: string,
  briefingDate: string,
): Promise<BriefingInputs> {
  const [
    overdueBilling,
    blockedWork,
    todayMeetings,
    silentRelationships,
    opportunityGap,
  ] = await Promise.all([
    gatherOverdueBilling(workspaceId),
    gatherBlockedWork(workspaceId),
    gatherTodayMeetings(workspaceId, briefingDate),
    gatherSilentRelationships(workspaceId),
    gatherOpportunityGap(workspaceId),
  ]);

  return {
    overdueBilling,
    blockedWork,
    todayMeetings,
    silentRelationships,
    opportunityGap,
  };
}

export async function persistDailyBriefing(input: {
  workspaceId: string;
  briefingDate: string;
  content: string;
  sections: DailyBriefingSections;
  model: string;
}): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("hq_daily_briefings")
    .upsert(
      {
        workspace_id: input.workspaceId,
        briefing_date: input.briefingDate,
        content: input.content,
        sections: {
          urgent: input.sections.urgent,
          today: input.sections.today,
          relationships: input.sections.relationships,
        } as Json,
        model: input.model,
      },
      { onConflict: "workspace_id,briefing_date" },
    )
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to persist briefing: ${error?.message ?? "no row returned"}`,
    );
  }
  return data.id as string;
}

export interface GenerateDailyBriefingDeps {
  findExisting?: (
    workspaceId: string,
    briefingDate: string,
  ) => Promise<DailyBriefing | null>;
  gather?: (
    workspaceId: string,
    briefingDate: string,
  ) => Promise<BriefingInputs>;
  persist?: typeof persistDailyBriefing;
}

export async function generateDailyBriefing(
  workspaceId: string,
  userId: string,
  now: Date = new Date(),
  deps: GenerateDailyBriefingDeps = {},
): Promise<GenerateDailyBriefingResult> {
  const briefingDate = briefingDateInTimezone(now);
  const findExisting = deps.findExisting ?? findExistingBriefing;
  const gather = deps.gather ?? gatherBriefingInputs;
  const persist = deps.persist ?? persistDailyBriefing;

  try {
    const existing = await findExisting(workspaceId, briefingDate);
    if (existing) {
      return { status: "already_exists" };
    }

    const inputs = await gather(workspaceId, briefingDate);
    const action = decideBriefingAction(false, inputs);
    if (action !== "generate") {
      return { status: action };
    }

    const model = resolveModel("playDraft");
    const raw = await sendLlm(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildBriefingPrompt(inputs) },
      ],
      committedSpend(workspaceId, userId),
      { routingKey: "playDraft", maxTokens: 500, temperature: 0.4 },
    );

    if (!raw?.trim()) {
      return { status: "skipped_no_draft" };
    }

    const draft = parseBriefingDraft(raw);
    const briefingId = await persist({
      workspaceId,
      briefingDate,
      content: draft.content,
      sections: draft.sections,
      model,
    });

    return { status: "created", briefingId };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Generation failed",
    };
  }
}
