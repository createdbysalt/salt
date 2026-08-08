import { describe, it, expect } from "vitest";
import {
  evaluateRecordCapture,
  buildRecordCaptureInput,
  type RecordCaptureInput,
} from "./record-capture-criteria";

function makeInput(overrides: Partial<RecordCaptureInput> = {}): RecordCaptureInput {
  return {
    admissionScore: 0,
    admissionSignals: [],
    linkedRecords: [],
    senderClassification: "unknown",
    senderEmail: null,
    senderName: null,
    senderDomain: null,
    ...overrides,
  };
}

describe("evaluateRecordCapture", () => {
  describe("blockers", () => {
    it("returns NOTHING for known vendor/SaaS", () => {
      const input = makeInput({
        senderClassification: "vendor_saas",
        admissionScore: 90,
        admissionSignals: [{ type: "bidirectional", weight: 30 }],
      });

      const result = evaluateRecordCapture(input);

      expect(result.tier).toBe("nothing");
      expect(result.reason).toContain("vendor");
    });

    it("returns NOTHING when already linked to Person", () => {
      const input = makeInput({
        admissionScore: 90,
        linkedRecords: [
          { surface: "people", entity_id: "123", entity_label: "John", match_type: "email", confidence: 95 },
        ],
      });

      const result = evaluateRecordCapture(input);

      expect(result.tier).toBe("nothing");
      expect(result.reason).toContain("Already linked");
    });

    it("returns NOTHING for automated/noreply sender", () => {
      const input = makeInput({
        senderEmail: "noreply@company.com",
        admissionScore: 50,
      });

      const result = evaluateRecordCapture(input);

      expect(result.tier).toBe("nothing");
      expect(result.reason).toContain("Automated");
    });
  });

  describe("CREATE tier", () => {
    it("creates Person + Org for payment signal", () => {
      const input = makeInput({
        admissionScore: 80,
        admissionSignals: [{ type: "payment_customer", weight: 40 }],
        senderEmail: "client@acme.com",
        senderName: "Jane Client",
        senderDomain: "acme.com",
      });

      const result = evaluateRecordCapture(input);

      expect(result.tier).toBe("create");
      if (result.tier === "create") {
        expect(result.proposals.length).toBeGreaterThanOrEqual(1);
        expect(result.proposals.some((p) => p.surface === "people")).toBe(true);
        expect(result.confidence).toBe(95);
      }
    });

    it("creates Person for bidirectional thread", () => {
      const input = makeInput({
        admissionScore: 60,
        admissionSignals: [{ type: "bidirectional", weight: 30 }],
        senderEmail: "contact@acme.com",
        senderName: "Contact Person",
        senderDomain: "acme.com",
      });

      const result = evaluateRecordCapture(input);

      expect(result.tier).toBe("create");
      if (result.tier === "create") {
        expect(result.proposals.some((p) => p.surface === "people")).toBe(true);
        expect(result.confidence).toBe(90);
      }
    });

    it("creates Person when you initiated and they replied", () => {
      const input = makeInput({
        admissionScore: 75,
        admissionSignals: [
          { type: "you_initiated", weight: 40 },
          { type: "they_replied", weight: 35 },
        ],
        senderEmail: "prospect@company.com",
        senderName: "Prospect",
        senderDomain: "company.com",
      });

      const result = evaluateRecordCapture(input);

      expect(result.tier).toBe("create");
      if (result.tier === "create") {
        expect(result.proposals.some((p) => p.surface === "people")).toBe(true);
        expect(result.confidence).toBe(85);
      }
    });

    it("creates Person for calendar meeting", () => {
      const input = makeInput({
        admissionScore: 35,
        admissionSignals: [{ type: "calendar_meeting", weight: 35 }],
        senderEmail: "meeting@company.com",
        senderName: "Meeting Attendee",
        senderDomain: "company.com",
      });

      const result = evaluateRecordCapture(input);

      expect(result.tier).toBe("create");
      if (result.tier === "create") {
        expect(result.proposals.some((p) => p.surface === "people")).toBe(true);
        expect(result.confidence).toBe(85);
      }
    });

    it("creates Person for high-signal business domain with name", () => {
      const input = makeInput({
        admissionScore: 75,
        admissionSignals: [
          { type: "you_initiated", weight: 40 },
          { type: "shared_file", weight: 20 },
        ],
        senderEmail: "ceo@bigcorp.com",
        senderName: "CEO Name",
        senderDomain: "bigcorp.com",
      });

      const result = evaluateRecordCapture(input);

      expect(result.tier).toBe("create");
      if (result.tier === "create") {
        expect(result.confidence).toBeGreaterThanOrEqual(80);
      }
    });
  });

  describe("WATCH tier", () => {
    it("watches email when you initiated but no reply yet", () => {
      const input = makeInput({
        admissionScore: 40,
        admissionSignals: [{ type: "you_initiated", weight: 40 }],
        senderEmail: "lead@prospect.com",
        senderDomain: "prospect.com",
      });

      const result = evaluateRecordCapture(input);

      expect(result.tier).toBe("watch");
      if (result.tier === "watch") {
        expect(result.watchType).toBe("email");
        expect(result.target).toBe("lead@prospect.com");
      }
    });

    it("watches domain for business domain with some signal", () => {
      const input = makeInput({
        admissionScore: 35,
        admissionSignals: [{ type: "shared_file", weight: 20 }],
        senderEmail: "docs@business.com",
        senderDomain: "business.com",
      });

      const result = evaluateRecordCapture(input);

      expect(result.tier).toBe("watch");
      if (result.tier === "watch") {
        expect(result.target).toBe("business.com");
      }
    });

    it("watches email for shared file", () => {
      const input = makeInput({
        admissionScore: 20,
        admissionSignals: [{ type: "shared_file", weight: 20 }],
        senderEmail: "coworker@company.com",
        senderDomain: "company.com",
      });

      const result = evaluateRecordCapture(input);

      expect(result.tier).toBe("watch");
      if (result.tier === "watch") {
        expect(result.watchType).toBe("email");
      }
    });
  });

  describe("NOTHING tier", () => {
    it("returns NOTHING for cold inbound with low score", () => {
      const input = makeInput({
        admissionScore: 10,
        admissionSignals: [],
        senderEmail: "cold@unknown.com",
      });

      const result = evaluateRecordCapture(input);

      expect(result.tier).toBe("nothing");
      expect(result.reason).toContain("Cold inbound");
    });

    it("returns NOTHING for consumer domain with no signals", () => {
      const input = makeInput({
        admissionScore: 0,
        admissionSignals: [],
        senderEmail: "person@gmail.com",
        senderDomain: "gmail.com",
      });

      const result = evaluateRecordCapture(input);

      expect(result.tier).toBe("nothing");
      // Low score hits "cold inbound" first; consumer domain is an additional factor
      expect(result.reason).toContain("Cold inbound");
    });
  });
});

describe("buildRecordCaptureInput", () => {
  it("extracts domain from email", () => {
    const input = buildRecordCaptureInput({
      admissionScore: 50,
      admissionSignals: [],
      linkedRecords: [],
      senderClassification: "unknown",
      senderEmail: "test@example.com",
      senderName: "Test",
    });

    expect(input.senderDomain).toBe("example.com");
  });

  it("handles null email", () => {
    const input = buildRecordCaptureInput({
      admissionScore: 50,
      admissionSignals: [],
      linkedRecords: [],
      senderClassification: "unknown",
      senderEmail: null,
      senderName: null,
    });

    expect(input.senderDomain).toBeNull();
  });
});
