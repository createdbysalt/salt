import { describe, it, expect } from "vitest";
import type { CaptureEnvelope } from "./types";
import { getEmailAdapter } from "./categories/email";
import { getCalendarAdapter } from "./categories/calendar";
import { getBillingAdapter } from "./categories/billing";
import { getStorageAdapter } from "./categories/storage";
import { getCrmAdapter } from "./categories/crm";
import { getMeetingsAdapter } from "./categories/meetings";
import { getDocumentsAdapter } from "./categories/documents";
import { getProjectManagementAdapter } from "./categories/project-management";
import { getCommunicationAdapter } from "./categories/communication";

/**
 * Entity extraction conformance (Connector Rules & Learning, Phase 2):
 * each category adapter derives `feedbackEntity { type, key }` from a
 * normalized envelope per the coverage matrix. These thin envelopes mirror
 * what a stored capture_events row can reconstruct (extracted + participants).
 */
function envelope(
  sourceType: string,
  extracted: Record<string, unknown>,
  participants: CaptureEnvelope["participants"] = [],
): CaptureEnvelope {
  return {
    sourceType,
    captureType: "message",
    externalId: "x-1",
    title: null,
    occurredAt: null,
    participants,
    threadId: null,
    extracted,
    raw: {},
    noise: null,
  } as CaptureEnvelope;
}

describe("extractFeedbackEntity per category", () => {
  it("email → sender_email (lowercased)", () => {
    const adapter = getEmailAdapter("gmail");
    const entity = adapter.extractFeedbackEntity(
      envelope("gmail", { sender_email: "Alice@Example.COM" }),
    );
    expect(entity).toEqual({ type: "sender_email", key: "alice@example.com" });
  });

  it("email → null when the sender is unknown", () => {
    const adapter = getEmailAdapter("gmail");
    expect(
      adapter.extractFeedbackEntity(envelope("gmail", { sender_email: null })),
    ).toBeNull();
  });

  it("calendar → organizer", () => {
    const adapter = getCalendarAdapter("googlecalendar");
    const entity = adapter.extractFeedbackEntity(
      envelope("googlecalendar", { organizer_email: "Host@Co.com" }),
    );
    expect(entity).toEqual({ type: "organizer", key: "host@co.com" });
  });

  it("billing → customer", () => {
    const adapter = getBillingAdapter("stripe");
    const entity = adapter.extractFeedbackEntity(
      envelope("stripe", { customer_email: "Buyer@Shop.com" }),
    );
    expect(entity).toEqual({ type: "customer", key: "buyer@shop.com" });
  });

  it("storage → owner", () => {
    const adapter = getStorageAdapter("googledrive");
    const entity = adapter.extractFeedbackEntity(
      envelope("googledrive", { owner_email: "Files@Co.com" }),
    );
    expect(entity).toEqual({ type: "owner", key: "files@co.com" });
  });

  it("documents → owner from participants when no extracted owner", () => {
    const adapter = getDocumentsAdapter("notion");
    const entity = adapter.extractFeedbackEntity(
      envelope("notion", {}, [
        { email: "editor@co.com", name: "Ed", role: "other" },
      ]),
    );
    expect(entity).toEqual({ type: "owner", key: "editor@co.com" });
  });

  it("crm → contact", () => {
    const adapter = getCrmAdapter("hubspot");
    const entity = adapter.extractFeedbackEntity(
      envelope("hubspot", { email: "Lead@BigCo.com" }),
    );
    expect(entity).toEqual({ type: "contact", key: "lead@bigco.com" });
  });

  it("meetings → null (payloads carry no host)", () => {
    const adapter = getMeetingsAdapter("fireflies");
    expect(
      adapter.extractFeedbackEntity(
        envelope("fireflies", { participants: ["a@b.com"] }, [
          { email: "a@b.com", name: null, role: "attendee" },
        ]),
      ),
    ).toBeNull();
  });

  it("project_management → assignee", () => {
    const adapter = getProjectManagementAdapter("asana");
    const entity = adapter.extractFeedbackEntity(
      envelope("asana", { assignee_email: "Dev@Co.com" }),
    );
    expect(entity).toEqual({ type: "assignee", key: "dev@co.com" });
  });

  it("communication → channel when present", () => {
    const adapter = getCommunicationAdapter("slack");
    const entity = adapter.extractFeedbackEntity(
      envelope("slack", { channel: "C0123ABC", sender_id: "U999" }),
    );
    expect(entity).toEqual({ type: "channel", key: "C0123ABC" });
  });

  it("communication → author when the capture has no channel (DM)", () => {
    const adapter = getCommunicationAdapter("slack");
    const entity = adapter.extractFeedbackEntity(
      envelope("slack", { channel: null, is_dm: true, sender_id: "U999" }),
    );
    expect(entity).toEqual({ type: "author", key: "U999" });
  });
});
