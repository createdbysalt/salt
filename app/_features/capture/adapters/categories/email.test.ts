import { describe, it, expect } from "vitest";
import { createEmailCategoryAdapter, getEmailAdapter } from "./email";

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

    it("returns null for unknown provider", () => {
      const adapter = getEmailAdapter("unknown");
      expect(adapter).toBeNull();
    });

    it("returns null for non-email provider", () => {
      const adapter = getEmailAdapter("stripe");
      expect(adapter).toBeNull();
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
