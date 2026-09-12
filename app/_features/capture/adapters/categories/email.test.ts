import { describe, it, expect } from "vitest";
import { createEmailCategoryAdapter, getEmailAdapter } from "./email";
import { runAdapterConformance } from "../adapter-conformance";

const GENERIC_EMAIL_MESSAGE = {
  id: "pm-msg-001",
  subject: "Re: Proposal feedback",
  from: "Rita Alvarez <rita@clientco.com>",
  snippet: "Loved the direction — a few notes inline.",
  date: "2026-08-07T15:30:00Z",
  threadId: "pm-thread-9",
};

describe("email category adapter", () => {
  describe("getEmailAdapter", () => {
    it("returns adapter for gmail", () => {
      const adapter = getEmailAdapter("gmail");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("gmail");
    });

    it("returns adapter for outlook", () => {
      const adapter = getEmailAdapter("outlook");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("outlook");
    });

    it("returns adapter with generic extraction for unknown provider", () => {
      const adapter = getEmailAdapter("unknown");
      expect(adapter).not.toBeNull();
      expect(adapter.sourceType).toBe("unknown");
    });

    it("returns adapter with generic extraction for non-email provider", () => {
      const adapter = getEmailAdapter("stripe");
      expect(adapter).not.toBeNull();
      expect(adapter.sourceType).toBe("stripe");
    });
  });

  describe("gmail normalization", () => {
    const adapter = createEmailCategoryAdapter("gmail");

    it("normalizes gmail message payload", () => {
      const payload = {
        messageId: "msg-123",
        subject: "Test email",
        sender: "Jane Doe <jane@example.com>",
        to: ["john@test.com"],
        preview: { snippet: "This is a test" },
        threadId: "thread-456",
        receivedAt: "2024-07-12T10:00:00Z",
        labelIds: ["INBOX"],
      };

      const envelope = adapter.normalize(payload);

      expect(envelope).not.toBeNull();
      expect(envelope?.sourceType).toBe("gmail");
      expect(envelope?.captureType).toBe("message");
      expect(envelope?.externalId).toBe("msg-123");
      expect(envelope?.title).toBe("Test email");
      expect(envelope?.threadId).toBe("thread-456");
      expect(envelope?.participants).toHaveLength(2);
      expect(envelope?.participants[0].email).toBe("jane@example.com");
      expect(envelope?.participants[0].role).toBe("from");
    });

    it("returns null for invalid payload", () => {
      expect(adapter.normalize(null)).toBeNull();
      expect(adapter.normalize({})).toBeNull();
      expect(adapter.normalize({ foo: "bar" })).toBeNull();
    });

    it("detects sent mail from labels", () => {
      const payload = {
        messageId: "msg-sent",
        sender: "me@example.com",
        subject: "Sent mail",
        labelIds: ["SENT"],
      };

      const envelope = adapter.normalize(payload);
      expect(envelope?.extracted.isSentByUser).toBe(true);
    });

    it("passes gate-relevant headers from the Gmail API payload into raw", () => {
      const payload = {
        message_id: "msg-headers",
        sender: "Newsletter <news@example.com>",
        subject: "Weekly digest",
        label_ids: ["INBOX"],
        payload: {
          headers: [
            { name: "List-Unsubscribe", value: "<mailto:unsub@example.com>" },
            { name: "Precedence", value: "bulk" },
            { name: "Auto-Submitted", value: "auto-generated" },
            { name: "X-Received", value: "should be filtered out" },
          ],
        },
      };

      const envelope = adapter.normalize(payload);
      const headers = envelope?.raw.headers as Record<string, string>;

      expect(headers["List-Unsubscribe"]).toBe("<mailto:unsub@example.com>");
      expect(headers["Precedence"]).toBe("bulk");
      expect(headers["Auto-Submitted"]).toBe("auto-generated");
      expect(headers["X-Received"]).toBeUndefined();
    });

    it("forwards label_ids so promotional-category drops fire downstream", () => {
      const payload = {
        message_id: "msg-promo",
        sender: "deals@store.com",
        subject: "50% off",
        label_ids: ["CATEGORY_PROMOTIONS", "INBOX"],
      };

      const envelope = adapter.normalize(payload);
      expect(envelope?.extracted.labels).toContain("CATEGORY_PROMOTIONS");
    });

    it("stores empty headers when the payload carries none", () => {
      const payload = {
        messageId: "msg-plain",
        sender: "alice@acme.com",
        subject: "Hi",
      };

      const envelope = adapter.normalize(payload);
      expect(envelope?.raw.headers).toEqual({});
    });

    it("extracts attachments with download pointers from the flat attachments shape", () => {
      const payload = {
        messageId: "msg-att",
        sender: "alice@acme.com",
        subject: "Agreement",
        attachments: [
          { filename: "Service Agreement.pdf", mimeType: "application/pdf", size: 1234, attachmentId: "ANGjdJ8" },
        ],
      };

      const envelope = adapter.normalize(payload);
      expect(envelope?.extracted.has_attachments).toBe(true);
      expect(envelope?.extracted.attachments).toEqual([
        { name: "Service Agreement.pdf", contentType: "application/pdf", size: 1234, attachmentId: "ANGjdJ8" },
      ]);
    });

    it("extracts attachments from Composio's attachmentList shape", () => {
      const payload = {
        messageId: "msg-attlist",
        sender: "alice@acme.com",
        subject: "SOW",
        attachmentList: [
          { filename: "SOW.pdf", mimeType: "application/pdf", attachment_id: "ANG-list" },
        ],
      };

      const envelope = adapter.normalize(payload);
      expect(envelope?.extracted.has_attachments).toBe(true);
      expect(envelope?.extracted.attachments).toEqual([
        { name: "SOW.pdf", contentType: "application/pdf", size: undefined, attachmentId: "ANG-list" },
      ]);
    });

    it("extracts attachments from the raw Gmail API payload.parts shape (recursive)", () => {
      const payload = {
        messageId: "msg-parts",
        sender: "alice@acme.com",
        subject: "Contract",
        payload: {
          mimeType: "multipart/mixed",
          parts: [
            {
              mimeType: "multipart/alternative",
              parts: [{ mimeType: "text/plain", body: { data: "aGVsbG8=" } }],
            },
            {
              filename: "Contract.pdf",
              mimeType: "application/pdf",
              body: { attachmentId: "ANG-parts", size: 4321 },
            },
          ],
        },
      };

      const envelope = adapter.normalize(payload);
      expect(envelope?.extracted.has_attachments).toBe(true);
      expect(envelope?.extracted.attachments).toEqual([
        { name: "Contract.pdf", contentType: "application/pdf", size: 4321, attachmentId: "ANG-parts" },
      ]);
    });
  });

  describe("outlook normalization", () => {
    const adapter = createEmailCategoryAdapter("outlook");

    it("normalizes outlook message payload", () => {
      const payload = {
        id: "outlook-msg-123",
        subject: "Meeting tomorrow",
        bodyPreview: "Let's discuss the project",
        from: {
          emailAddress: {
            address: "sender@outlook.com",
            name: "Sender Name",
          },
        },
        toRecipients: [
          {
            emailAddress: {
              address: "recipient@test.com",
              name: "Recipient",
            },
          },
        ],
        conversationId: "conv-789",
        receivedDateTime: "2024-07-12T10:00:00Z",
      };

      const envelope = adapter.normalize(payload);

      expect(envelope).not.toBeNull();
      expect(envelope?.sourceType).toBe("outlook");
      expect(envelope?.captureType).toBe("message");
      expect(envelope?.externalId).toBe("outlook-msg-123");
      expect(envelope?.title).toBe("Meeting tomorrow");
      expect(envelope?.threadId).toBe("conv-789");
      expect(envelope?.participants).toHaveLength(2);
      expect(envelope?.participants[0].email).toBe("sender@outlook.com");
    });

    it("returns null for invalid payload", () => {
      expect(adapter.normalize(null)).toBeNull();
      expect(adapter.normalize({})).toBeNull();
    });

    it("populates raw.headers from internetMessageHeaders (2.7 marketing-gate parity)", () => {
      const payload = {
        id: "outlook-msg-mkt",
        subject: "50% off everything!",
        bodyPreview: "Deals deals deals",
        from: { emailAddress: { address: "promo@shop.com", name: "Shop" } },
        toRecipients: [],
        conversationId: "conv-mkt",
        receivedDateTime: "2026-08-08T10:00:00Z",
        internetMessageHeaders: [
          { name: "List-Unsubscribe", value: "<mailto:unsub@shop.com>" },
          { name: "Precedence", value: "bulk" },
          { name: "X-Irrelevant", value: "dropped" },
        ],
      };

      const envelope = adapter.normalize(payload);

      expect(envelope?.raw.headers).toEqual({
        "List-Unsubscribe": "<mailto:unsub@shop.com>",
        Precedence: "bulk",
      });
    });

    it("omits header values when Graph payload carries none (no false gating)", () => {
      const payload = {
        id: "outlook-msg-plain",
        subject: "Hi",
        bodyPreview: "Quick question",
        from: { emailAddress: { address: "human@client.com", name: "Client" } },
        toRecipients: [],
        conversationId: "conv-plain",
        receivedDateTime: "2026-08-08T10:00:00Z",
      };

      const envelope = adapter.normalize(payload);
      expect(envelope?.raw.headers).toEqual({});
    });
  });

  describe("generic provider normalization (long tail)", () => {
    const adapter = createEmailCategoryAdapter("protonmail");

    it("passes conformance (golden fixture)", () => {
      runAdapterConformance(adapter, [
        {
          name: "generic message",
          payload: GENERIC_EMAIL_MESSAGE,
          expectExternalId: "pm-msg-001",
        },
        { name: "no id", payload: { subject: "?" }, expectExternalId: null },
      ]);
    });

    it("normalizes a generic payload with gate-ready noise input", () => {
      const envelope = adapter.normalize(GENERIC_EMAIL_MESSAGE);

      expect(envelope).not.toBeNull();
      expect(envelope?.sourceType).toBe("protonmail");
      expect(envelope?.captureType).toBe("message");
      expect(envelope?.title).toBe("Re: Proposal feedback");
      expect(envelope?.threadId).toBe("pm-thread-9");
      expect(envelope?.participants[0].email).toBe("rita@clientco.com");
      expect(envelope?.participants[0].name).toBe("Rita Alvarez");
      expect(envelope?.extracted.is_reply).toBe(true);
      // Message captures must consult the noise gate — generic providers get
      // the same gate inputs as known ones (was noise:null, a conformance
      // violation).
      expect(envelope?.noise).toEqual({
        sourceType: "protonmail",
        fromEmail: "rita@clientco.com",
        subject: "Re: Proposal feedback",
        isSentByUser: false,
      });
    });
  });

  describe("deriveSignals", () => {
    const adapter = createEmailCategoryAdapter("gmail");

    it("counts emails and tracks bidirectional threads", () => {
      const envelopes = [
        {
          sourceType: "gmail" as const,
          captureType: "message" as const,
          externalId: "1",
          title: "Inbound",
          occurredAt: "2024-07-12T10:00:00Z",
          participants: [{ email: "contact@example.com", name: "Contact", role: "from" as const }],
          threadId: "t1",
          extracted: { isSentByUser: false },
          raw: {},
          noise: null,
        },
        {
          sourceType: "gmail" as const,
          captureType: "message" as const,
          externalId: "2",
          title: "Outbound",
          occurredAt: "2024-07-12T11:00:00Z",
          participants: [{ email: "contact@example.com", name: "Contact", role: "to" as const }],
          threadId: "t1",
          extracted: { isSentByUser: true },
          raw: {},
          noise: null,
        },
      ];

      const signals = adapter.deriveSignals!(envelopes, { userEmail: "me@test.com" });

      expect(signals.has("contact@example.com")).toBe(true);
      const contactSignals = signals.get("contact@example.com");
      expect(contactSignals?.email_count).toBe(2);
      expect(contactSignals?.is_bidirectional_thread).toBe(true);
      expect(contactSignals?.you_initiated).toBe(true);
    });

    it("excludes self from signals", () => {
      const envelopes = [
        {
          sourceType: "gmail" as const,
          captureType: "message" as const,
          externalId: "1",
          title: "Test",
          occurredAt: "2024-07-12T10:00:00Z",
          participants: [{ email: "me@test.com", name: "Me", role: "from" as const }],
          threadId: null,
          extracted: { isSentByUser: false },
          raw: {},
          noise: null,
        },
      ];

      const signals = adapter.deriveSignals!(envelopes, { userEmail: "me@test.com" });
      expect(signals.has("me@test.com")).toBe(false);
    });
  });
});
