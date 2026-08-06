import { describe, it, expect } from "vitest";
import { classifyEmail } from "./classifier";
import type {
  EmailClassificationInput,
  ClassificationContext,
} from "./types";

function createTestContext(
  overrides: Partial<ClassificationContext> = {}
): ClassificationContext {
  return {
    workspaceId: "ws-123",
    operatorEmail: "me@mycompany.com",
    workspaceDomains: ["mycompany.com"],
    clientEmails: new Set(["client@acme.com", "john@bigclient.com"]),
    clientDomains: new Set(["bigclient.com", "acme.com"]),
    vipEmails: new Set(["ceo@bigclient.com"]),
    senderProfiles: new Map(),
    ...overrides,
  };
}

function createTestInput(
  overrides: Partial<EmailClassificationInput> = {}
): EmailClassificationInput {
  return {
    messageId: "msg-123",
    threadId: null,
    subject: "Test Email",
    bodyPreview: "This is a test email body.",
    fromEmail: "someone@example.com",
    fromName: "Someone",
    toEmails: ["me@mycompany.com"],
    ccEmails: [],
    receivedAt: new Date().toISOString(),
    hasAttachments: false,
    attachmentNames: [],
    headers: {},
    isReply: false,
    threadDepth: 0,
    ...overrides,
  };
}

describe("classifyEmail", () => {
  describe("category classification", () => {
    it("classifies money-related emails as money_moves", () => {
      const input = createTestInput({
        subject: "Invoice #1234 - Payment Due",
        bodyPreview: "Please find attached your invoice for $5,000.00",
        hasAttachments: true,
        attachmentNames: ["invoice-1234.pdf"],
      });
      const context = createTestContext();

      const result = classifyEmail(input, context);

      expect(result.category).toBe("money_moves");
      expect(result.categoryConfidence).toBeGreaterThanOrEqual(80);
      expect(result.signals).toContain("email_money_amount_detected");
      expect(result.signals).toContain("email_invoice_attached");
    });

    it("classifies client action requests as action_required", () => {
      const input = createTestInput({
        fromEmail: "client@acme.com",
        subject: "Please review the proposal",
        bodyPreview: "Could you please review this and let me know your thoughts?",
      });
      const context = createTestContext();

      const result = classifyEmail(input, context);

      expect(result.category).toBe("action_required");
      expect(result.signals).toContain("email_action_requested");
    });

    it("classifies first-contact with opportunity signals as opportunities", () => {
      const input = createTestInput({
        fromEmail: "newlead@startup.com",
        subject: "Interested in your services",
        bodyPreview: "We are looking for a designer to help with our rebrand.",
        threadDepth: 0,
      });
      const context = createTestContext();

      const result = classifyEmail(input, context);

      expect(result.category).toBe("opportunities");
      expect(result.signals).toContain("sender_first_contact");
    });

    it("classifies newsletters as noise or subscribed", () => {
      const input = createTestInput({
        fromEmail: "newsletter@company.com",
        subject: "Your Weekly Digest",
        bodyPreview: "Here are this week's top stories. Unsubscribe here.",
        headers: { "list-unsubscribe": "<mailto:unsub@company.com>" },
      });
      const context = createTestContext();

      const result = classifyEmail(input, context);

      expect(["noise", "subscribed"]).toContain(result.category);
    });
  });

  describe("priority scoring", () => {
    it("gives high priority to VIP senders", () => {
      const input = createTestInput({
        fromEmail: "ceo@bigclient.com",
        subject: "Quick question",
        bodyPreview: "Can we chat tomorrow?",
      });
      const context = createTestContext();

      const result = classifyEmail(input, context);

      expect(result.priorityScore).toBeGreaterThanOrEqual(70);
      expect(result.signals).toContain("sender_vip");
    });

    it("gives low priority to bulk mail", () => {
      const input = createTestInput({
        fromEmail: "noreply@marketing.com",
        subject: "Special Offer!",
        bodyPreview: "Don't miss out on this limited time deal!",
        headers: {
          precedence: "bulk",
          "list-unsubscribe": "<http://unsub.marketing.com>",
        },
      });
      const context = createTestContext();

      const result = classifyEmail(input, context);

      expect(result.priorityScore).toBeLessThanOrEqual(40);
      expect(result.triageAction).toBe("silent_archive");
    });

    it("boosts priority for ongoing threads", () => {
      const input = createTestInput({
        subject: "Re: Project Update",
        bodyPreview: "Thanks for the update. Here's my feedback.",
        isReply: true,
        threadDepth: 3,
      });
      const context = createTestContext();

      const result = classifyEmail(input, context);

      expect(
        result.priorityFactors.some((f) => f.factor === "ongoing_thread")
      ).toBe(true);
    });
  });

  describe("urgency detection", () => {
    it("detects critical urgency", () => {
      const input = createTestInput({
        subject: "URGENT: Need response ASAP",
        bodyPreview: "This is time-sensitive. Please respond immediately.",
      });
      const context = createTestContext();

      const result = classifyEmail(input, context);

      expect(result.urgencyLevel).toBe("critical");
      expect(result.urgencyMarkers).toContain("urgent");
      expect(result.signals).toContain("email_urgency_high");
    });

    it("detects deadline mentions", () => {
      const input = createTestInput({
        subject: "Proposal due by Friday",
        bodyPreview: "Please submit your proposal before the deadline.",
      });
      const context = createTestContext();

      const result = classifyEmail(input, context);

      expect(result.urgencyMarkers).toContain("deadline_mentioned");
    });
  });

  describe("type classification", () => {
    it("identifies automated emails", () => {
      const input = createTestInput({
        fromEmail: "noreply@service.com",
        subject: "Your order has shipped",
        bodyPreview: "Your package is on the way.",
      });
      const context = createTestContext();

      const result = classifyEmail(input, context);

      expect(result.type).toBe("automated");
    });

    it("identifies personal emails from replies", () => {
      const input = createTestInput({
        subject: "Re: Meeting tomorrow",
        bodyPreview: "That works for me. See you then!",
        isReply: true,
        threadDepth: 2,
      });
      const context = createTestContext();

      const result = classifyEmail(input, context);

      expect(result.type).toBe("personal");
    });
  });

  describe("triage action", () => {
    it("surfaces urgent emails immediately", () => {
      const input = createTestInput({
        fromEmail: "client@acme.com",
        subject: "URGENT: Contract issue",
        bodyPreview: "We need to discuss this immediately.",
      });
      const context = createTestContext();

      const result = classifyEmail(input, context);

      expect(result.triageAction).toBe("surface_now");
    });

    it("batches low-priority emails for digest", () => {
      const input = createTestInput({
        fromEmail: "random@unknown.com",
        subject: "FYI - Industry News",
        bodyPreview: "Here's an article you might find interesting.",
        threadDepth: 0,
      });
      const context = createTestContext();

      const result = classifyEmail(input, context);

      expect(["batch_digest", "silent_archive"]).toContain(result.triageAction);
    });
  });
});
