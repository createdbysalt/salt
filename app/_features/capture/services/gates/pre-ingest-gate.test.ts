import { describe, it, expect } from "vitest";
import { runPreIngestGate, extractDomainFromEmail } from "./pre-ingest-gate";

describe("runPreIngestGate", () => {
  it("passes through normal email without spam indicators", () => {
    const result = runPreIngestGate({
      senderEmail: "alice@acme.com",
      senderDomain: "acme.com",
      headers: {},
      labels: ["INBOX"],
    });
    expect(result).toBeNull();
  });

  it("drops email with List-Unsubscribe header", () => {
    const result = runPreIngestGate({
      senderEmail: "newsletter@company.com",
      senderDomain: "company.com",
      headers: { listUnsubscribe: "<mailto:unsubscribe@company.com>" },
    });
    expect(result).not.toBeNull();
    expect(result?.action).toBe("drop");
    expect(result?.category).toBe("marketing");
  });

  it("drops email with Precedence: bulk header", () => {
    const result = runPreIngestGate({
      senderEmail: "updates@service.com",
      senderDomain: "service.com",
      headers: { precedence: "bulk" },
    });
    expect(result).not.toBeNull();
    expect(result?.action).toBe("drop");
    expect(result?.category).toBe("automated");
  });

  it("drops email with Auto-Submitted header", () => {
    const result = runPreIngestGate({
      senderEmail: "bot@service.com",
      senderDomain: "service.com",
      headers: { autoSubmitted: "auto-generated" },
    });
    expect(result).not.toBeNull();
    expect(result?.action).toBe("drop");
    expect(result?.category).toBe("automated");
  });

  it("passes Auto-Submitted: no", () => {
    const result = runPreIngestGate({
      senderEmail: "human@company.com",
      senderDomain: "company.com",
      headers: { autoSubmitted: "no" },
    });
    expect(result).toBeNull();
  });

  it("drops email from disposable email domain", () => {
    const result = runPreIngestGate({
      senderEmail: "test@mailinator.com",
      senderDomain: "mailinator.com",
      headers: {},
    });
    expect(result).not.toBeNull();
    expect(result?.action).toBe("drop");
    expect(result?.category).toBe("spam");
  });

  it("drops email from marketing platform domain", () => {
    const result = runPreIngestGate({
      senderEmail: "campaign@sendgrid.net",
      senderDomain: "sendgrid.net",
      headers: {},
    });
    expect(result).not.toBeNull();
    expect(result?.action).toBe("drop");
    expect(result?.category).toBe("marketing");
  });

  it("drops email from noreply address", () => {
    const result = runPreIngestGate({
      senderEmail: "noreply@company.com",
      senderDomain: "company.com",
      headers: {},
    });
    expect(result).not.toBeNull();
    expect(result?.action).toBe("drop");
    expect(result?.category).toBe("automated");
  });

  it("drops email from no-reply address with hyphen", () => {
    const result = runPreIngestGate({
      senderEmail: "no-reply@company.com",
      senderDomain: "company.com",
      headers: {},
    });
    expect(result).not.toBeNull();
    expect(result?.action).toBe("drop");
    expect(result?.category).toBe("automated");
  });

  it("drops email with Gmail promotional label", () => {
    const result = runPreIngestGate({
      senderEmail: "deals@store.com",
      senderDomain: "store.com",
      headers: {},
      labels: ["CATEGORY_PROMOTIONS"],
    });
    expect(result).not.toBeNull();
    expect(result?.action).toBe("drop");
    expect(result?.category).toBe("marketing");
  });

  it("drops email with SPAM label", () => {
    const result = runPreIngestGate({
      senderEmail: "spam@unknown.com",
      senderDomain: "unknown.com",
      headers: {},
      labels: ["SPAM"],
    });
    expect(result).not.toBeNull();
    expect(result?.action).toBe("drop");
    expect(result?.category).toBe("marketing");
  });

  it("passes email with normal Gmail labels", () => {
    const result = runPreIngestGate({
      senderEmail: "alice@acme.com",
      senderDomain: "acme.com",
      headers: {},
      labels: ["INBOX", "IMPORTANT", "STARRED"],
    });
    expect(result).toBeNull();
  });
});

describe("extractDomainFromEmail", () => {
  it("extracts domain from valid email", () => {
    expect(extractDomainFromEmail("alice@acme.com")).toBe("acme.com");
  });

  it("lowercases domain", () => {
    expect(extractDomainFromEmail("alice@ACME.COM")).toBe("acme.com");
  });

  it("returns null for null input", () => {
    expect(extractDomainFromEmail(null)).toBeNull();
  });

  it("returns null for invalid email without @", () => {
    expect(extractDomainFromEmail("invalid-email")).toBeNull();
  });
});
