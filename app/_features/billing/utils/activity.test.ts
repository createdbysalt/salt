import { describe, expect, it } from "vitest";
import type { EntityNoteWithProvenance } from "@/app/_features/memory/types/taxonomies";
import {
  mapBillingActivityToTimeline,
  mapBillingNotesToActivityEntries,
  mapBillingPaymentToActivityEntries,
  mapBillingProvenanceToActivityEntry,
  type BillingPaymentActivityInput,
  type BillingProvenanceActivityInput,
} from "./activity";

const basePayment: BillingPaymentActivityInput = {
  id: "payment-1",
  amountCents: 120_000,
  currency: "USD",
  paidAt: "2026-06-28T10:00:00.000Z",
  provider: "stripe",
  matchStatus: "unmatched",
  matchConfidence: null,
  createdAt: "2026-06-28T10:05:00.000Z",
  updatedAt: "2026-06-28T10:05:00.000Z",
};

describe("mapBillingPaymentToActivityEntries", () => {
  it("maps a provider payment to a system entry with amount and provider", () => {
    const entries = mapBillingPaymentToActivityEntries(basePayment);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: "billing-payment-payment-1",
      at: "2026-06-28T10:00:00.000Z",
      kind: "system",
      label: "Payment received",
    });
    expect(entries[0]?.detail).toContain("$1,200.00");
    expect(entries[0]?.detail).toContain("via Stripe");
  });

  it("surfaces Salt matching with confidence", () => {
    const entries = mapBillingPaymentToActivityEntries({
      ...basePayment,
      matchStatus: "matched",
      matchConfidence: 92,
    });

    expect(entries[0]?.detail).toContain("Matched by Salt · 92% sure");
  });

  it("labels manual payments as user entries", () => {
    const entries = mapBillingPaymentToActivityEntries({
      ...basePayment,
      provider: "manual",
    });

    expect(entries[0]?.kind).toBe("user");
    expect(entries[0]?.detail).toContain("via manual entry");
  });

  it("labels negative amounts as refunds", () => {
    const entries = mapBillingPaymentToActivityEntries({
      ...basePayment,
      amountCents: -50_000,
    });

    expect(entries[0]?.label).toBe("Refund recorded");
    expect(entries[0]?.detail).toContain("$500.00");
  });

  it("falls back to created_at when paid_at is missing and emits a reversal entry", () => {
    const entries = mapBillingPaymentToActivityEntries({
      ...basePayment,
      paidAt: null,
      matchStatus: "reversed",
      updatedAt: "2026-06-29T09:00:00.000Z",
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]?.at).toBe("2026-06-28T10:05:00.000Z");
    expect(entries[1]).toMatchObject({
      id: "billing-payment-reversed-payment-1",
      at: "2026-06-29T09:00:00.000Z",
      kind: "system",
      label: "Payment reversed",
    });
  });
});

describe("mapBillingActivityToTimeline", () => {
  it("maps record activity events into timeline entries", () => {
    const entries = mapBillingActivityToTimeline([
      {
        id: "created",
        at: "2026-06-20T10:00:00.000Z",
        kind: "user",
        label: "Record added to Billing Memory",
        detail: "Salt prepared this record from Ask Salt or an uploaded document.",
      },
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0]?.label).toBe("Record added to Billing Memory");
    expect(entries[0]?.kind).toBe("user");
  });
});

describe("mapBillingProvenanceToActivityEntry", () => {
  const baseProvenance: BillingProvenanceActivityInput = {
    field: "amountPaid",
    value: "120000",
    source: "manual",
    confidence: 100,
    because: "You corrected this field",
    status: "applied",
    setAt: "2026-07-03T10:00:00.000Z",
  };

  it("maps a manual field edit to a user entry with the friendly field label", () => {
    const entry = mapBillingProvenanceToActivityEntry(baseProvenance);

    expect(entry).toMatchObject({
      id: "billing-profile-amountPaid-2026-07-03T10:00:00.000Z",
      at: "2026-07-03T10:00:00.000Z",
      kind: "user",
      label: "You updated amount paid",
    });
    expect(entry.detail).toContain("You corrected this field");
    expect(entry.detail).toContain("100% sure");
  });

  it("maps non-manual provenance to keeper entries", () => {
    const entry = mapBillingProvenanceToActivityEntry({
      ...baseProvenance,
      field: "dueAt",
      source: "rule",
      because: null,
      confidence: null,
    });

    expect(entry.kind).toBe("keeper");
    expect(entry.label).toBe("Keeper updated due date");
    expect(entry.detail).toContain("Based on trusted billing-record evidence.");
  });
});

describe("mapBillingNotesToActivityEntries", () => {
  it("maps user notes with a title preview", () => {
    const note: EntityNoteWithProvenance = {
      id: "note-1",
      title: "Chased payment",
      content: "Sent a reminder email this morning.",
      noteKind: "general",
      source: "manual",
      sourceRef: null,
      confidence: null,
      status: "confirmed",
      authorType: "user",
      isPinned: false,
      tags: [],
      createdAt: "2026-06-27T09:00:00.000Z",
      author: "you",
      at: "2026-06-27T09:00:00.000Z",
      body: "Sent a reminder email this morning.",
      pinned: false,
    };

    const entries = mapBillingNotesToActivityEntries([note]);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: "note-created-note-1",
      kind: "user",
      label: "You added a note",
      detail: "Chased payment",
    });
  });
});
