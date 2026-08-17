import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  captureVendorSubscription,
  parseVendorSubscriptionEmail,
} from "./subscription-capture";

type BillingRow = Record<string, unknown>;

function buildSupabase(existing: BillingRow[] = []) {
  const inserted: BillingRow[] = [];
  const supabase = {
    from: (table: string) => {
      if (table !== "billing_records") throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: (_c: string, workspaceId: string) => ({
            eq: (_c2: string, sourceExternalId: string) => ({
              maybeSingle: async () => ({
                data:
                  existing.find(
                    (row) =>
                      row.workspace_id === workspaceId &&
                      row.source_external_id === sourceExternalId
                  ) ?? null,
                error: null,
              }),
            }),
          }),
        }),
        insert: async (row: BillingRow) => {
          if (
            existing.some(
              (r) =>
                r.workspace_id === row.workspace_id &&
                r.source_external_id === row.source_external_id
            )
          ) {
            return { error: { code: "23505", message: "duplicate" } };
          }
          inserted.push(row);
          existing.push(row);
          return { error: null };
        },
      };
    },
  };
  return { supabase, inserted };
}

describe("parseVendorSubscriptionEmail", () => {
  it("parses a monthly receipt with an amount in the subject", () => {
    const parsed = parseVendorSubscriptionEmail({
      subject: "Your receipt from ClickUp — $7.00",
      bodyText: "Thanks for your payment. Your monthly plan has been renewed.",
    });
    expect(parsed).toEqual({
      amountCents: 700,
      cadence: "monthly",
      kind: "receipt",
    });
  });

  it("parses an annual renewal notice", () => {
    const parsed = parseVendorSubscriptionEmail({
      subject: "Your ConvertKit subscription renews soon",
      bodyText: "Your annual plan will renew for $290.00 next week.",
    });
    expect(parsed).toEqual({
      amountCents: 29000,
      cadence: "yearly",
      kind: "renewal_notice",
    });
  });

  it("handles comma-formatted amounts", () => {
    const parsed = parseVendorSubscriptionEmail({
      subject: "Receipt for your payment",
      bodyText: "Amount paid: $1,250.00",
    });
    expect(parsed?.amountCents).toBe(125000);
  });

  it("returns null when no amount is present", () => {
    expect(
      parseVendorSubscriptionEmail({
        subject: "Your receipt from ClickUp",
        bodyText: "Thanks! View your account online.",
      })
    ).toBeNull();
  });

  it("returns null for non-billing mail", () => {
    expect(
      parseVendorSubscriptionEmail({
        subject: "What's new in ClickUp 3.0",
        bodyText: "Check out our brand new features.",
      })
    ).toBeNull();
  });

  it("rejects implausible amounts", () => {
    expect(
      parseVendorSubscriptionEmail({
        subject: "Payment received: $50,000,000.00",
        bodyText: "",
      })
    ).toBeNull();
  });
});

describe("captureVendorSubscription", () => {
  const email = {
    subject: "Your receipt from ClickUp — $7.00",
    body_text: "Payment received. Monthly plan.",
    snippet: null,
    sent_at: "2026-08-13T10:00:00.000Z",
  };

  it("creates a paid payable record tagged subscription for a receipt", async () => {
    const { supabase, inserted } = buildSupabase();
    const outcome = await captureVendorSubscription({
      supabase: supabase as never,
      workspaceId: "ws-1",
      captureId: "cap-1",
      vendorName: "ClickUp",
      email,
    });

    expect(outcome).toBe("created");
    expect(inserted).toHaveLength(1);
    const row = inserted[0];
    expect(row.direction).toBe("payable");
    expect(row.status).toBe("paid");
    expect(row.amount_cents).toBe(700);
    expect(row.amount_paid_cents).toBe(700);
    expect(row.vendor_label).toBe("ClickUp");
    expect(row.category).toBe("software");
    expect(row.tags).toEqual(["subscription"]);
    expect(row.recurrence_cadence).toBe("monthly");
    expect(row.source_external_id).toBe("vendor-sub:cap-1");
    expect(row.capture_event_id).toBe("cap-1");
    expect(row.source).toBe("salt_inferred");
  });

  it("is idempotent across rescans", async () => {
    const { supabase, inserted } = buildSupabase();
    const args = {
      supabase: supabase as never,
      workspaceId: "ws-1",
      captureId: "cap-1",
      vendorName: "ClickUp",
      email,
    };
    expect(await captureVendorSubscription(args)).toBe("created");
    expect(await captureVendorSubscription(args)).toBe("duplicate");
    expect(inserted).toHaveLength(1);
  });

  it("skips mail without a parseable amount", async () => {
    const { supabase, inserted } = buildSupabase();
    const outcome = await captureVendorSubscription({
      supabase: supabase as never,
      workspaceId: "ws-1",
      captureId: "cap-2",
      vendorName: "ClickUp",
      email: { ...email, subject: "Your receipt from ClickUp", body_text: "" },
    });
    expect(outcome).toBe("skipped");
    expect(inserted).toHaveLength(0);
  });

  it("does not write on dryRun", async () => {
    const { supabase, inserted } = buildSupabase();
    const outcome = await captureVendorSubscription({
      supabase: supabase as never,
      workspaceId: "ws-1",
      captureId: "cap-1",
      vendorName: "ClickUp",
      email,
      dryRun: true,
    });
    expect(outcome).toBe("created");
    expect(inserted).toHaveLength(0);
  });
});
