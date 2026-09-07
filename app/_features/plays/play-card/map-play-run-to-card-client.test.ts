import { describe, it, expect } from "vitest";
import type { PlayRunRow } from "../types";
import { mapPlayRunToCardClient } from "./map-play-run-to-card-client";

function baseRow(overrides: Partial<PlayRunRow> = {}): PlayRunRow {
  return {
    id: "run-1",
    workspace_id: "ws-1",
    player_id: null,
    prepared_by_player_id: null,
    template_id: null,
    opportunity_gap_id: null,
    owner_member_id: null,
    owner_team_id: null,
    space_id: null,
    target_type: null,
    target_id: null,
    target_label: "Meridian Studio kickoff",
    state: "queued",
    title: "Brief ready: Kickoff call with Meridian Studio",
    preview: "Kickoff call with Meridian Studio at 2:00 PM today.",
    recipient_label: null,
    channel: null,
    channels: null,
    draft_body: null,
    confidence: null,
    eta_label: null,
    scheduled_for: null,
    approved_at: null,
    ran_at: null,
    dismissed_at: null,
    last_error: null,
    created_at: new Date().toISOString(),
    metadata: {
      playbook_slug: "meeting-prep",
      playbook_name: "Meeting Prep",
      section: "meetings",
      output_type: "briefing",
      total_steps: 2,
    },
    ...overrides,
  } as PlayRunRow;
}

describe("mapPlayRunToCardClient — artifacts + evidence", () => {
  it("reads executor-written artifacts and evidence entries", () => {
    const vm = mapPlayRunToCardClient(
      baseRow({
        metadata: {
          playbook_slug: "meeting-prep",
          artifacts: [
            { appId: "google", label: "Follow-up draft to Dana", draftBody: ["Hi Dana,"] },
            { appId: "google-calendar", label: "Kickoff call event", url: "https://calendar.google.com/" },
          ],
          evidence: [
            { appId: "google-calendar", label: "Saw the kickoff call at 2:00 PM" },
            { appId: "google", label: "Read the proposal thread from Tuesday" },
          ],
        },
      }),
    );
    expect(vm.artifacts).toHaveLength(2);
    expect(vm.artifacts?.[0]).toMatchObject({ appId: "google", label: "Follow-up draft to Dana" });
    expect(vm.evidence?.items.map((i) => i.label)).toEqual([
      "Saw the kickoff call at 2:00 PM",
      "Read the proposal thread from Tuesday",
    ]);
    expect(vm.evidence?.thin).toBe(false);
  });

  it("drops malformed artifact/evidence entries instead of leaking them", () => {
    const vm = mapPlayRunToCardClient(
      baseRow({
        metadata: {
          artifacts: [{ appId: "google" }, { label: 42 }, null],
          evidence: [{ label: "Valid" }, { nope: true }],
        },
      }),
    );
    expect(vm.artifacts).toBeNull();
    expect(vm.evidence?.items.map((i) => i.label)).toEqual(["Valid"]);
  });

  it("turns invoice-reminder evidence into Memory and Stripe links", () => {
    const pay = "https://invoice.stripe.com/i/acct_test/in_frank";
    const vm = mapPlayRunToCardClient(
      baseRow({
        target_type: "billing",
        target_id: "br-frank",
        target_label: "INV-2026-1589",
        context_inputs: {
          invoice_context: { invoice: { number: "INV-2026-1589", pay_url: pay } },
        },
        metadata: {
          playbook_slug: "invoice-reminder",
          playbook_name: "Invoice Reminder",
          section: "billing",
          output_type: "email_draft",
          evidence: [
            { appId: "salt", label: "Billing due date passed" },
            { appId: "salt", label: "Read invoice context from Memory" },
            {
              appId: "salt",
              label: "Researched Stripe, QuickBooks, Gmail for verify unpaid",
            },
            { appId: "salt", label: "Classified the tier results" },
          ],
        },
      })
    );

    expect(vm.evidence?.items[0]?.url).toBe("/billing/br-frank");
    expect(vm.evidence?.items[1]?.url).toBe("/billing/br-frank");
    expect(vm.evidence?.items[1]?.links?.map((link) => link.href)).toEqual([
      "/billing/br-frank",
      pay,
    ]);
    expect(vm.evidence?.items[2]?.url).toBe(pay);
    expect(vm.evidence?.items[3]?.url).toBe("/billing/br-frank");
  });
});
