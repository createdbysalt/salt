import { describe, expect, it } from "vitest";
import {
  parseAddress,
  extractEmailFromHeader,
  extractNameFromHeader,
  extractMessageIdFromRow,
  extractSenderFromRow,
  extractSubjectFromRow,
  extractSnippetFromRow,
  extractThreadIdFromRow,
  extractTimestampFromRow,
  extractRecipientsFromRow,
  extractLabelsFromRow,
  extractGmailRowFields,
  headerMatchesTarget,
} from "./gmail-rows";
import {
  GMAIL_TRIGGER_CAMEL,
  GMAIL_TRIGGER_SNAKE_NESTED,
  GMAIL_FETCH_ROW,
} from "@/app/_features/capture/adapters/__fixtures__/gmail-trigger-payloads";

describe("parseAddress", () => {
  it("parses display name and email from angle bracket format", () => {
    const result = parseAddress("Jane Example <jane@acme.com>");
    expect(result.name).toBe("Jane Example");
    expect(result.email).toBe("jane@acme.com");
  });

  it("parses quoted display name", () => {
    const result = parseAddress('"Jane Example" <jane@acme.com>');
    expect(result.name).toBe("Jane Example");
    expect(result.email).toBe("jane@acme.com");
  });

  it("parses email-only format", () => {
    const result = parseAddress("jane@acme.com");
    expect(result.name).toBeNull();
    expect(result.email).toBe("jane@acme.com");
  });

  it("lowercases email", () => {
    const result = parseAddress("JANE@ACME.COM");
    expect(result.email).toBe("jane@acme.com");
  });

  it("handles empty angle brackets", () => {
    const result = parseAddress("<jane@acme.com>");
    expect(result.name).toBeNull();
    expect(result.email).toBe("jane@acme.com");
  });
});

describe("extractEmailFromHeader / extractNameFromHeader", () => {
  it("extracts email from header", () => {
    expect(extractEmailFromHeader('"Jane Example" <jane@acme.com>')).toBe("jane@acme.com");
  });

  it("extracts name from header", () => {
    expect(extractNameFromHeader('"Jane Example" <jane@acme.com>')).toBe("Jane Example");
  });
});

describe("extractMessageIdFromRow", () => {
  it("reads messageId from GMAIL_FETCH_EMAILS row", () => {
    expect(extractMessageIdFromRow(GMAIL_FETCH_ROW)).toBe("198d6f40c1825d60");
  });

  it("reads messageId from trigger payload (camelCase)", () => {
    expect(extractMessageIdFromRow(GMAIL_TRIGGER_CAMEL)).toBe("197a2f0c8d4e1a2c");
  });

  it("reads message_id from nested snake_case format", () => {
    expect(extractMessageIdFromRow(GMAIL_TRIGGER_SNAKE_NESTED)).toBe("18f001aa42bc9911");
  });

  it("returns null for missing id", () => {
    expect(extractMessageIdFromRow({})).toBeNull();
    expect(extractMessageIdFromRow({ threadId: "abc" })).toBeNull();
  });
});

describe("extractSenderFromRow", () => {
  it("reads sender from fetch row", () => {
    expect(extractSenderFromRow(GMAIL_FETCH_ROW)).toBe("Grace Hopper <grace@acmecreative.co>");
  });

  it("reads sender from trigger payload", () => {
    expect(extractSenderFromRow(GMAIL_TRIGGER_CAMEL)).toBe("Ada Lovelace <ada@northwind.com>");
  });

  it("reads from nested message.from", () => {
    expect(extractSenderFromRow(GMAIL_TRIGGER_SNAKE_NESTED)).toBe("billing@vendorworks.co");
  });
});

describe("extractSubjectFromRow", () => {
  it("reads subject from fetch row", () => {
    expect(extractSubjectFromRow(GMAIL_FETCH_ROW)).toBe("Contract draft for the June retainer");
  });

  it("reads subject from trigger payload", () => {
    expect(extractSubjectFromRow(GMAIL_TRIGGER_CAMEL)).toBe("Kickoff agenda for next week");
  });
});

describe("extractSnippetFromRow", () => {
  it("reads preview.body from fetch row", () => {
    const snippet = extractSnippetFromRow(GMAIL_FETCH_ROW);
    expect(snippet).toContain("redlined contract");
  });

  it("reads preview string from trigger payload", () => {
    const snippet = extractSnippetFromRow(GMAIL_TRIGGER_CAMEL);
    expect(snippet).toContain("Sharing the agenda");
  });
});

describe("extractThreadIdFromRow", () => {
  it("reads threadId from trigger payload", () => {
    expect(extractThreadIdFromRow(GMAIL_TRIGGER_CAMEL)).toBe("197a2f0c8d4e1a2b");
  });

  it("reads thread_id from nested format", () => {
    expect(extractThreadIdFromRow(GMAIL_TRIGGER_SNAKE_NESTED)).toBe("18f001aa42bc9900");
  });
});

describe("extractTimestampFromRow", () => {
  it("parses ISO timestamp", () => {
    const ts = extractTimestampFromRow(GMAIL_TRIGGER_CAMEL);
    expect(ts).toBe("2026-07-02T18:24:11.000Z");
  });

  it("parses epoch millis string", () => {
    const ts = extractTimestampFromRow(GMAIL_TRIGGER_SNAKE_NESTED);
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("extractRecipientsFromRow", () => {
  it("reads to string", () => {
    expect(extractRecipientsFromRow(GMAIL_TRIGGER_CAMEL)).toEqual(["you@usesalt.io"]);
  });

  it("reads to array from nested", () => {
    expect(extractRecipientsFromRow(GMAIL_TRIGGER_SNAKE_NESTED)).toEqual([
      "you@usesalt.io",
      "Ops <ops@usesalt.io>",
    ]);
  });
});

describe("extractLabelsFromRow", () => {
  it("reads labelIds array", () => {
    expect(extractLabelsFromRow(GMAIL_TRIGGER_CAMEL)).toEqual(["INBOX", "IMPORTANT"]);
  });
});

describe("extractGmailRowFields", () => {
  it("extracts all fields from fetch row", () => {
    const fields = extractGmailRowFields(GMAIL_FETCH_ROW);
    expect(fields.messageId).toBe("198d6f40c1825d60");
    expect(fields.sender).toBe("Grace Hopper <grace@acmecreative.co>");
    expect(fields.subject).toBe("Contract draft for the June retainer");
    expect(fields.labels).toEqual(["INBOX"]);
  });
});

describe("headerMatchesTarget", () => {
  it("matches by email", () => {
    expect(headerMatchesTarget("Jane Example <jane@acme.com>", { email: "jane@acme.com" })).toBe(true);
    expect(headerMatchesTarget("Jane Example <jane@acme.com>", { email: "other@acme.com" })).toBe(false);
  });

  it("matches by name", () => {
    expect(headerMatchesTarget("Jane Example <jane@acme.com>", { name: "Jane Example" })).toBe(true);
    expect(headerMatchesTarget("Jane Example <jane@acme.com>", { name: "jane example" })).toBe(true);
    expect(headerMatchesTarget("Jane Example <jane@acme.com>", { name: "Other Person" })).toBe(false);
  });

  it("handles quoted names", () => {
    expect(headerMatchesTarget('"Jane Example" <jane@acme.com>', { name: "Jane Example" })).toBe(true);
  });
});
