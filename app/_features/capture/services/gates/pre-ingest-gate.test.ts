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

  it("drops mail from expanded ESP infrastructure domains", () => {
    for (const domain of ["mcsv.net", "braze.com", "mktomail.com", "rs6.net", "convertkit-mail.com"]) {
      const result = runPreIngestGate({
        senderEmail: `campaign@${domain}`,
        senderDomain: domain,
        headers: {},
      });
      expect(result?.action, domain).toBe("drop");
      expect(result?.category, domain).toBe("marketing");
    }
  });

  it("drops product-announcement local parts", () => {
    for (const local of ["notifications", "newsletter", "marketing", "digest", "updates"]) {
      const result = runPreIngestGate({
        senderEmail: `${local}@product.io`,
        senderDomain: "product.io",
        headers: {},
      });
      expect(result?.action, local).toBe("drop");
      expect(result?.category, local).toBe("automated");
    }
  });

  it("drops noreply variants with tags or suffixes", () => {
    for (const local of ["noreply+billing", "no-reply.security", "donotreply-alerts"]) {
      const result = runPreIngestGate({
        senderEmail: `${local}@company.com`,
        senderDomain: "company.com",
        headers: {},
      });
      expect(result?.action, local).toBe("drop");
    }
  });

  it("still passes real people whose names resemble automated words", () => {
    // Exact-match only: "news.smith" or "anna" must never be dropped
    for (const local of ["anna", "news.smith", "updates-team-lead", "notice"]) {
      const result = runPreIngestGate({
        senderEmail: `${local}@acme.com`,
        senderDomain: "acme.com",
        headers: {},
      });
      expect(result, local).toBeNull();
    }
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
