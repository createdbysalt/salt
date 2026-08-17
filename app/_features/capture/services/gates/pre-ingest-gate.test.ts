import { describe, it, expect } from "vitest";
import {
  runPreIngestGate,
  runPreIngestGateDetailed,
  extractDomainFromEmail,
} from "./pre-ingest-gate";
import { resolveGatePolicy } from "./gate-policy";

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

describe("runPreIngestGate with gate policy (S3)", () => {
  const automatedInput = {
    senderEmail: "noreply@company.com",
    senderDomain: "company.com",
    headers: {},
  };

  it("default policy keeps current behavior (automated dropped)", () => {
    const result = runPreIngestGate(automatedInput, resolveGatePolicy(null));
    expect(result?.action).toBe("drop");
    expect(result?.category).toBe("automated");
  });

  it("omitted policy keeps current behavior", () => {
    expect(runPreIngestGate(automatedInput)?.action).toBe("drop");
  });

  it("watched: automated detections pass instead of dropping", () => {
    const policy = resolveGatePolicy({
      email: { automated_senders: "watched" },
    });
    expect(runPreIngestGate(automatedInput, policy)).toBeNull();
    expect(
      runPreIngestGate(
        {
          senderEmail: "updates@service.com",
          senderDomain: "service.com",
          headers: { precedence: "bulk" },
        },
        policy,
      ),
    ).toBeNull();
  });

  it("let_in: automated detections pass instead of dropping", () => {
    const policy = resolveGatePolicy({
      email: { automated_senders: "let_in" },
    });
    expect(runPreIngestGate(automatedInput, policy)).toBeNull();
  });

  it("policy never softens spam or marketing drops — only automated", () => {
    const policy = resolveGatePolicy({
      email: { automated_senders: "let_in" },
    });
    // Disposable domain (spam) still drops.
    expect(
      runPreIngestGate(
        {
          senderEmail: "test@mailinator.com",
          senderDomain: "mailinator.com",
          headers: {},
        },
        policy,
      )?.category,
    ).toBe("spam");
    // Marketing platform domain still drops even from a noreply address.
    expect(
      runPreIngestGate(
        {
          senderEmail: "noreply@sendgrid.net",
          senderDomain: "sendgrid.net",
          headers: {},
        },
        policy,
      )?.category,
    ).toBe("marketing");
    // List-Unsubscribe (marketing) still drops.
    expect(
      runPreIngestGate(
        {
          senderEmail: "news@company.com",
          senderDomain: "company.com",
          headers: { listUnsubscribe: "<mailto:u@company.com>" },
        },
        policy,
      )?.category,
    ).toBe("marketing");
  });

  it("detailed result reports the suppressed automated detection", () => {
    const policy = resolveGatePolicy({
      email: { automated_senders: "watched" },
    });
    const result = runPreIngestGateDetailed(automatedInput, policy);
    expect(result.drop).toBeNull();
    expect(result.suppressed?.category).toBe("automated");
  });

  it("detailed result reports no suppression under the default policy", () => {
    const result = runPreIngestGateDetailed(
      automatedInput,
      resolveGatePolicy(null),
    );
    expect(result.drop?.category).toBe("automated");
    expect(result.suppressed).toBeNull();
  });

  it("detailed result on clean mail is all null", () => {
    const result = runPreIngestGateDetailed(
      { senderEmail: "alice@acme.com", senderDomain: "acme.com", headers: {} },
      resolveGatePolicy(null),
    );
    expect(result).toEqual({ drop: null, suppressed: null });
  });

  it("lets receipt-shaped senders on known vendor domains through when subscriptions are tracked (default)", () => {
    const vendorReceipt = {
      senderEmail: "receipts@clickup.com",
      senderDomain: "clickup.com",
      headers: {},
    };
    const result = runPreIngestGateDetailed(vendorReceipt, resolveGatePolicy(null));
    expect(result.drop).toBeNull();
    expect(result.suppressed?.category).toBe("automated");
  });

  it("drops vendor receipts again when track_subscriptions = ignored", () => {
    const vendorReceipt = {
      senderEmail: "receipts@clickup.com",
      senderDomain: "clickup.com",
      headers: {},
    };
    const result = runPreIngestGateDetailed(
      vendorReceipt,
      resolveGatePolicy({ email: { track_subscriptions: "ignored" } }),
    );
    expect(result.drop?.category).toBe("automated");
    expect(result.suppressed).toBeNull();
  });

  it("does not let non-receipt automated senders through on vendor domains", () => {
    const vendorNoreply = {
      senderEmail: "noreply@clickup.com",
      senderDomain: "clickup.com",
      headers: {},
    };
    const result = runPreIngestGateDetailed(vendorNoreply, resolveGatePolicy(null));
    expect(result.drop?.category).toBe("automated");
  });

  it("does not let receipt-shaped senders through on non-vendor domains", () => {
    const unknownReceipt = {
      senderEmail: "receipts@randomstore.io",
      senderDomain: "randomstore.io",
      headers: {},
    };
    const result = runPreIngestGateDetailed(unknownReceipt, resolveGatePolicy(null));
    expect(result.drop?.category).toBe("automated");
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
