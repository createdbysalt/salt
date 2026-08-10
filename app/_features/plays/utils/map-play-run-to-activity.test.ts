import { describe, expect, it } from "vitest";
import type { ActivityEntryRow, PlayActivityRunRow } from "../types";
import { dayGroupFromIso, mapPlayRunToActivity } from "./map-play-run-to-activity";

const NOW = Date.now();
const HOUR = 3_600_000;
const DAY = 86_400_000;

function run(overrides: Partial<PlayActivityRunRow> = {}): PlayActivityRunRow {
  return {
    id: "run-1",
    workspace_id: "workspace-1",
    player_id: null,
    prepared_by_player_id: null,
    template_id: null,
    opportunity_gap_id: null,
    owner_member_id: null,
    owner_team_id: null,
    space_id: null,
    target_type: "person",
    target_id: null,
    target_label: "Taylor Example",
    state: "ran",
    title: "Sent invoice reminder",
    preview: "Reminder email sent via Gmail",
    recipient_label: null,
    channel: "Gmail",
    channels: null,
    draft_body: null,
    confidence: 92,
    eta_label: null,
    scheduled_for: null,
    approved_at: null,
    ran_at: new Date(NOW - HOUR).toISOString(),
    dismissed_at: null,
    last_error: null,
    metadata: null,
    queue: "auto_handled",
    stakes: "low",
    source_context: { source: "playbook", playbook_slug: "invoice-reminder" },
    value_kind: null,
    value_amount: null,
    value_currency: null,
    value_basis: null,
    value_attributed_at: null,
    created_at: new Date(NOW - 2 * HOUR).toISOString(),
    updated_at: new Date(NOW - HOUR).toISOString(),
    playbookName: "Invoice Reminder",
    sources: [],
    events: [],
    ...overrides,
  };
}

function event(overrides: Partial<ActivityEntryRow> = {}): ActivityEntryRow {
  return {
    id: "entry-1",
    workspace_id: "workspace-1",
    play_run_id: "run-1",
    actor_user_id: null,
    action: "ran",
    title: "Ran playbook",
    detail: null,
    metadata: null,
    created_at: new Date(NOW - HOUR).toISOString(),
    ...overrides,
  };
}

describe("mapPlayRunToActivity", () => {
  describe("category mapping", () => {
    it("maps ran → completed", () => {
      expect(mapPlayRunToActivity(run({ state: "ran" })).category).toBe("completed");
    });

    it.each(["executing", "scheduled", "approved"] as const)(
      "maps %s → in-progress",
      (state) => {
        expect(mapPlayRunToActivity(run({ state })).category).toBe("in-progress");
      },
    );

    it.each(["failed", "blocked"] as const)(
      "maps %s → needs-attention",
      (state) => {
        expect(mapPlayRunToActivity(run({ state })).category).toBe("needs-attention");
      },
    );

    it("maps dismissed → decided", () => {
      expect(mapPlayRunToActivity(run({ state: "dismissed" })).category).toBe("decided");
    });
  });

  describe("actor + badge", () => {
    it("marks auto-executed runs as Salt acted", () => {
      const item = mapPlayRunToActivity(run({ state: "ran" }));
      expect(item.actor).toBe("salt");
      expect(item.badgeLabel).toBe("Salt acted");
    });

    it("marks user-approved runs as You approved", () => {
      const item = mapPlayRunToActivity(
        run({
          state: "ran",
          source_context: {
            source: "playbook",
            playbook_slug: "invoice-reminder",
            user_approved_at: new Date(NOW - 90 * 60_000).toISOString(),
          },
        }),
      );
      expect(item.actor).toBe("you");
      expect(item.badgeLabel).toBe("You approved");
    });

    it("falls back to approved_at when source_context has no approval timestamp", () => {
      const item = mapPlayRunToActivity(
        run({ state: "ran", approved_at: new Date(NOW - 90 * 60_000).toISOString() }),
      );
      expect(item.actor).toBe("you");
    });

    it("marks dismissals as decided by you", () => {
      const item = mapPlayRunToActivity(
        run({ state: "dismissed", dismissed_at: new Date(NOW - HOUR).toISOString() }),
      );
      expect(item.actor).toBe("you");
      expect(item.badgeLabel).toBe("Dismissed");
      expect(item.decisionLabel).toBe("Dismissed");
    });

    it("labels blocked runs", () => {
      const item = mapPlayRunToActivity(run({ state: "blocked" }));
      expect(item.badgeLabel).toBe("Blocked");
    });
  });

  describe("detail fields", () => {
    it("surfaces last_error for failed runs", () => {
      const item = mapPlayRunToActivity(
        run({ state: "failed", last_error: "TypeError: undefined is not a function" }),
      );
      expect(item.errorDetail).toBe("TypeError: undefined is not a function");
    });

    it("extracts the blocked cause and pending tool", () => {
      const item = mapPlayRunToActivity(
        run({
          state: "blocked",
          last_error: "Toolkit disconnected",
          paused_for_approval: true,
          approval_context: { tool_slug: "GMAIL_SEND_EMAIL", args: {}, step_index: 2 },
        }),
      );
      expect(item.errorDetail).toBe("Toolkit disconnected");
      expect(item.nextStepLabel).toContain("Send Email");
    });

    it("builds the playbook href from the slug", () => {
      const item = mapPlayRunToActivity(run());
      expect(item.playbookName).toBe("Invoice Reminder");
      expect(item.playbookHref).toBe("/plays/playbooks/invoice-reminder");
    });

    it("omits the href for runs without a playbook slug", () => {
      const item = mapPlayRunToActivity(
        run({ source_context: { source: "ask_salt" }, playbookName: null }),
      );
      expect(item.playbookHref).toBeNull();
    });

    it("formats currency value with the kind label", () => {
      const item = mapPlayRunToActivity(
        run({
          value_kind: "invoice_collected",
          value_amount: 1200,
          value_currency: "USD",
          value_basis: "actual",
        }),
      );
      expect(item.valueLabel).toBe("$1,200 collected");
      expect(item.valueEstimated).toBe(false);
    });

    it("marks estimated value so the UI never overclaims", () => {
      const item = mapPlayRunToActivity(
        run({
          value_kind: "invoice_collected",
          value_amount: 1200,
          value_currency: "USD",
          value_basis: "estimated",
        }),
      );
      expect(item.valueLabel).toBe("$1,200 collected");
      expect(item.valueEstimated).toBe(true);
    });

    it("formats time_saved value as minutes", () => {
      const item = mapPlayRunToActivity(
        run({ value_kind: "time_saved", value_amount: 45, value_basis: "estimated" }),
      );
      expect(item.valueLabel).toBe("45 min saved");
    });

    it("reads duration from run event metadata", () => {
      const item = mapPlayRunToActivity(
        run({ events: [event({ metadata: { duration_ms: 4200 } })] }),
      );
      expect(item.durationMs).toBe(4200);
    });

    it("picks the undoable entry for auto-applied runs", () => {
      const item = mapPlayRunToActivity(
        run({
          state: "ran",
          events: [
            event({ id: "e-auto", action: "auto_applied" }),
            event({ id: "e-ran", action: "ran" }),
          ],
        }),
      );
      expect(item.undoEntryId).toBe("e-auto");
    });

    it("also treats auto_executed metadata as undoable", () => {
      const item = mapPlayRunToActivity(
        run({
          state: "ran",
          events: [event({ id: "e-auto", action: "ran", metadata: { auto_executed: true } })],
        }),
      );
      expect(item.undoEntryId).toBe("e-auto");
    });

    it("is not undoable for user-approved runs", () => {
      const item = mapPlayRunToActivity(
        run({
          state: "ran",
          approved_at: new Date(NOW - 90 * 60_000).toISOString(),
          events: [event({ action: "ran" })],
        }),
      );
      expect(item.undoEntryId).toBeNull();
    });

    it("humanizes the trigger signal", () => {
      const item = mapPlayRunToActivity(
        run({
          source_context: {
            source: "playbook",
            playbook_slug: "invoice-reminder",
            trigger_signal: "billing_due_date_passed",
          },
        }),
      );
      expect(item.triggerLabel).toBe("billing due date passed");
    });

    it("maps sources with external urls and picks a source url", () => {
      const item = mapPlayRunToActivity(
        run({
          sources: [
            {
              label: "Gmail thread",
              excerpt: "…",
              external_url: "https://mail.google.com/mail/u/0/#inbox/abc",
              source_type: "gmail",
            },
            { label: "Stripe invoice", excerpt: null, external_url: null, source_type: "stripe" },
          ],
        }),
      );
      expect(item.sources).toHaveLength(2);
      expect(item.sourceUrl).toBe("https://mail.google.com/mail/u/0/#inbox/abc");
    });

    it("builds a timeline from run events", () => {
      const item = mapPlayRunToActivity(
        run({
          events: [
            event({ id: "e1", title: "Approved", action: "approved" }),
            event({ id: "e2", title: "Ran", action: "ran" }),
          ],
        }),
      );
      expect(item.timeline.map((t) => t.id)).toEqual(["e1", "e2"]);
      expect(item.timeline[0].title).toBe("Approved");
    });
  });

  describe("user-friendly copy", () => {
    it("rewrites tool-slug titles with curated action copy", () => {
      const item = mapPlayRunToActivity(run({ title: "Stripe create customer" }));
      expect(item.title).toBe("Added a Stripe customer");
    });

    it("strips the 'Salt ran' prefix from tool-log titles", () => {
      const item = mapPlayRunToActivity(run({ title: "Salt ran Gmail send email" }));
      expect(item.title).toBe("Sent an email");
    });

    it("leaves natural-language titles untouched", () => {
      const item = mapPlayRunToActivity(
        run({ title: "Email Maya about the proposal" }),
      );
      expect(item.title).toBe("Email Maya about the proposal");
    });

    it("past-tenses unknown provider tools instead of showing slugs", () => {
      const item = mapPlayRunToActivity(run({ title: "Notion create page" }));
      expect(item.title).toBe("Created page in Notion");
    });

    it("humanizes timeline event titles", () => {
      const item = mapPlayRunToActivity(
        run({ events: [event({ title: "Stripe create customer" })] }),
      );
      expect(item.timeline[0].title).toBe("Added a Stripe customer");
    });

    it("labels Ask Salt approvals", () => {
      const item = mapPlayRunToActivity(
        run({
          source_context: {
            source: "ask_salt",
            user_approved_at: new Date(NOW - 30 * 60_000).toISOString(),
          },
        }),
      );
      expect(item.approvalLabel).toBe("You approved in Ask Salt");
    });

    it("labels queue approvals", () => {
      const item = mapPlayRunToActivity(
        run({ approved_at: new Date(NOW - 30 * 60_000).toISOString() }),
      );
      expect(item.approvalLabel).toBe("Approved in Queue");
    });

    it("labels autonomous runs as auto-handled", () => {
      expect(mapPlayRunToActivity(run()).approvalLabel).toBe("Auto-handled by Salt");
    });

    it("carries the channel", () => {
      expect(mapPlayRunToActivity(run()).channelLabel).toBe("Gmail");
    });

    it("translates quota errors into plain language, keeping the raw detail", () => {
      const item = mapPlayRunToActivity(
        run({ state: "failed", last_error: "Gmail API quota exceeded" }),
      );
      expect(item.errorLabel).toBe(
        "The provider was busy and asked Salt to slow down. It'll retry later.",
      );
      expect(item.errorDetail).toBe("Gmail API quota exceeded");
    });

    it("translates expired-connection errors for blocked runs", () => {
      const item = mapPlayRunToActivity(
        run({ state: "blocked", last_error: "gmail connection expired" }),
      );
      expect(item.errorLabel).toBe(
        "The connection may have expired. Please reconnect to fix it.",
      );
      expect(item.errorDetail).toBe("gmail connection expired");
    });
  });

  describe("time + grouping", () => {
    it("prefers ran_at for the display time", () => {
      const item = mapPlayRunToActivity(run());
      expect(item.sortIso).toBe(new Date(NOW - HOUR).toISOString());
      // Day-group labels are covered deterministically in dayGroupFromIso.
      expect(item.dayGroup).toBe(dayGroupFromIso(item.sortIso));
    });

    it("uses dismissed_at for dismissed runs", () => {
      const dismissedAt = new Date(NOW - DAY).toISOString();
      const item = mapPlayRunToActivity(
        run({ state: "dismissed", ran_at: null, dismissed_at: dismissedAt }),
      );
      expect(item.sortIso).toBe(dismissedAt);
      expect(item.dayGroup).toBe("Yesterday");
    });

    it("falls back to updated_at for the sort timestamp", () => {
      const updatedAt = new Date(NOW - 3 * DAY).toISOString();
      const item = mapPlayRunToActivity(
        run({
          state: "failed",
          ran_at: null,
          updated_at: updatedAt,
        }),
      );
      expect(item.sortIso).toBe(updatedAt);
    });
  });
});

describe("dayGroupFromIso", () => {
  // Friday, Aug 14 2026, 3pm local — the week starts Monday Aug 10.
  const REF = new Date(2026, 7, 14, 15, 0, 0);

  it("labels today and yesterday", () => {
    expect(dayGroupFromIso(new Date(2026, 7, 14, 9).toISOString(), REF)).toBe("Today");
    expect(dayGroupFromIso(new Date(2026, 7, 13, 23).toISOString(), REF)).toBe("Yesterday");
  });

  it("labels earlier days of the same week", () => {
    expect(dayGroupFromIso(new Date(2026, 7, 11).toISOString(), REF)).toBe(
      "Earlier this week",
    );
    expect(dayGroupFromIso(new Date(2026, 7, 10).toISOString(), REF)).toBe(
      "Earlier this week",
    );
  });

  it("labels the previous week", () => {
    expect(dayGroupFromIso(new Date(2026, 7, 9).toISOString(), REF)).toBe("Last week");
    expect(dayGroupFromIso(new Date(2026, 7, 3).toISOString(), REF)).toBe("Last week");
  });

  it("uses explicit date labels beyond last week", () => {
    expect(dayGroupFromIso(new Date(2026, 7, 2).toISOString(), REF)).toBe("Aug 2");
    expect(dayGroupFromIso(new Date(2026, 0, 15).toISOString(), REF)).toBe("Jan 15");
  });

  it("includes the year for dates in a different year", () => {
    expect(dayGroupFromIso(new Date(2025, 7, 2).toISOString(), REF)).toBe("Aug 2, 2025");
  });
});
