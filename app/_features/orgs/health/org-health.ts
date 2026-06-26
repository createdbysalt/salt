import {
  booleanSubScore,
  breadthSubScore,
  compositeScore,
  countSubScore,
  daysSince,
  factorDirection,
  recencySubScore,
  scoreToBand,
  stalenessSubScore,
  trendSubScore,
} from "@/app/_lib/health/core";
import {
  ORG_ARCHETYPE_CONFIG,
  ORG_ARCHETYPE_DISPLAY_LABEL,
  orgStatusToArchetype,
} from "./archetypes";
import type { HealthFactor, OrgArchetype, OrgHealthContext, OrgHealthResult, OrgHealthSignals } from "./types";
import { ORG_HEALTH_VERSION } from "./types";

function buildFactor(
  key: string,
  label: string,
  subScore: number,
  weight: number,
  detail?: string,
): HealthFactor {
  return {
    key,
    label,
    subScore,
    weight,
    direction: factorDirection(subScore),
    detail,
  };
}

function hasUsableSignals(signals: OrgHealthSignals): boolean {
  return signals.hasCaptureActivity || signals.hasRevenueSignals;
}

function insufficientResult(archetype: OrgArchetype): OrgHealthResult {
  return {
    score: null,
    band: "insufficient",
    archetype,
    factors: [],
    version: ORG_HEALTH_VERSION,
    label: ORG_ARCHETYPE_DISPLAY_LABEL[archetype],
  };
}

function scoreRevenue(signals: OrgHealthSignals, now: number): { score: number; factors: HealthFactor[] } {
  const config = ORG_ARCHETYPE_CONFIG.revenue;
  const contactDays = daysSince(signals.lastActivityAt, now);
  const factors: HealthFactor[] = [
    buildFactor(
      "contact_recency",
      "Recent contact",
      recencySubScore(contactDays, config.halfLifeDays),
      0.25,
      contactDays == null ? "No contact recorded" : `${Math.round(contactDays)} days since last touch`,
    ),
    buildFactor(
      "overdue_invoices",
      "Invoice status",
      booleanSubScore(signals.overdueInvoiceCount === 0),
      0.15,
      signals.overdueInvoiceCount > 0
        ? `${signals.overdueInvoiceCount} overdue invoice(s)`
        : "No overdue invoices",
    ),
    buildFactor(
      "active_retainer",
      "Active retainer",
      booleanSubScore(signals.hasActiveRetainer),
      0.15,
      signals.hasActiveRetainer ? "Active subscription" : "No active retainer",
    ),
    buildFactor(
      "upcoming_meeting",
      "Upcoming meeting",
      booleanSubScore(signals.hasUpcomingMeeting),
      0.15,
      signals.hasUpcomingMeeting ? "Meeting scheduled within 30 days" : "No upcoming meeting",
    ),
    buildFactor(
      "overdue_milestones",
      "Project delivery",
      countSubScore(signals.overdueMilestoneCount),
      0.1,
      signals.overdueMilestoneCount > 0
        ? `${signals.overdueMilestoneCount} overdue milestone(s)`
        : "Projects on track",
    ),
    buildFactor(
      "meeting_reliability",
      "Meeting reliability",
      countSubScore(signals.cancelledMeetingsLast30d),
      0.1,
      signals.cancelledMeetingsLast30d >= 2
        ? `${signals.cancelledMeetingsLast30d} cancelled/no-show meetings (30d)`
        : "Reliable meeting attendance",
    ),
    buildFactor(
      "stakeholder_breadth",
      "Stakeholder coverage",
      breadthSubScore(signals.orgContactCount, signals.keyContactQuiet),
      0.1,
      signals.keyContactQuiet
        ? "Key contact has gone quiet"
        : `${signals.orgContactCount} contact(s) linked`,
    ),
  ];

  return { score: compositeScore(factors), factors };
}

function scorePipeline(signals: OrgHealthSignals, now: number): { score: number; factors: HealthFactor[] } {
  const config = ORG_ARCHETYPE_CONFIG.pipeline;
  const contactDays = daysSince(signals.lastActivityAt, now);
  const factors: HealthFactor[] = [
    buildFactor(
      "contact_recency",
      "Recent contact",
      recencySubScore(contactDays, config.halfLifeDays),
      0.3,
      contactDays == null ? "No contact recorded" : `${Math.round(contactDays)} days since last touch`,
    ),
    buildFactor(
      "scheduled_meeting",
      "Scheduled meeting",
      booleanSubScore(signals.hasUpcomingMeeting),
      0.2,
      signals.hasUpcomingMeeting ? "Meeting on the calendar" : "No meeting scheduled",
    ),
    buildFactor(
      "reply_staleness",
      "Reply momentum",
      stalenessSubScore(signals.youInitiatedWithoutReplyDays, 7, 14),
      0.2,
      signals.youInitiatedWithoutReplyDays != null
        ? `No reply in ${Math.round(signals.youInitiatedWithoutReplyDays)} days`
        : "Two-way conversation active",
    ),
    buildFactor(
      "email_volume_trend",
      "Email momentum",
      trendSubScore(signals.captureCountLast30d, signals.captureCountPrior30d),
      0.15,
      `${signals.captureCountLast30d} touches last 30d vs ${signals.captureCountPrior30d} prior`,
    ),
    buildFactor(
      "stakeholder_breadth",
      "Buying committee",
      breadthSubScore(signals.orgContactCount, signals.keyContactQuiet),
      0.15,
      `${signals.orgContactCount} stakeholder(s) engaged`,
    ),
  ];

  return { score: compositeScore(factors), factors };
}

function scoreNetwork(signals: OrgHealthSignals, now: number): { score: number; factors: HealthFactor[] } {
  const config = ORG_ARCHETYPE_CONFIG.network;
  const contactDays = daysSince(signals.lastActivityAt, now);
  const factors: HealthFactor[] = [
    buildFactor(
      "contact_recency",
      "Contact cadence",
      recencySubScore(contactDays, config.halfLifeDays),
      0.5,
      contactDays == null ? "No contact recorded" : `${Math.round(contactDays)} days since last touch`,
    ),
    buildFactor(
      "bidirectional_ratio",
      "Two-way engagement",
      booleanSubScore(signals.hasBidirectionalContact),
      0.5,
      signals.hasBidirectionalContact ? "Two-way conversations" : "Mostly one-way outreach",
    ),
  ];

  return { score: compositeScore(factors), factors };
}

function scoreNeutral(signals: OrgHealthSignals, now: number): { score: number; factors: HealthFactor[] } {
  const config = ORG_ARCHETYPE_CONFIG.neutral;
  const contactDays = daysSince(signals.lastActivityAt, now);
  const factors: HealthFactor[] = [
    buildFactor(
      "contact_recency",
      "Engagement",
      recencySubScore(contactDays, config.halfLifeDays),
      1,
      contactDays == null ? "No activity yet" : `${Math.round(contactDays)} days since last touch`,
    ),
  ];

  return { score: compositeScore(factors), factors };
}

export function scoreOrgHealth(input: {
  context: OrgHealthContext;
  signals: OrgHealthSignals;
  now?: number;
}): OrgHealthResult {
  const now = input.now ?? Date.now();
  const archetype = orgStatusToArchetype(input.context.relationshipStatus);

  if (!hasUsableSignals(input.signals)) {
    return insufficientResult(archetype);
  }

  let scored: { score: number; factors: HealthFactor[] };
  switch (archetype) {
    case "revenue":
      scored = scoreRevenue(input.signals, now);
      break;
    case "pipeline":
      scored = scorePipeline(input.signals, now);
      break;
    case "network":
      scored = scoreNetwork(input.signals, now);
      break;
    case "neutral":
      scored = scoreNeutral(input.signals, now);
      break;
  }

  const band = scoreToBand(scored.score);
  return {
    score: scored.score,
    band,
    archetype,
    factors: scored.factors,
    version: ORG_HEALTH_VERSION,
    label: ORG_ARCHETYPE_DISPLAY_LABEL[archetype],
  };
}
