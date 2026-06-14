import { describe, expect, it } from "vitest";
import {
  classifyEmailSender,
  filterMemoryProposalsForSender,
  isKnownSaasVendorDomain,
} from "./email-sender-context";
import { detectMemoryProposals } from "./memory-proposal-heuristics";
import { MANNA_HOUSE_TRAINING_EMAIL } from "./fixtures/memory-plan-emails";
import type { SenderProfileRegistry } from "../../types/sender-profiles";

function registryWithDomain(
  domain: string,
  entry: SenderProfileRegistry["byDomain"] extends Map<string, infer V> ? V : never
): SenderProfileRegistry {
  return {
    byEmail: new Map(),
    byDomain: new Map([[domain, entry]]),
  };
}

describe("email-sender-context", () => {
  it("classifies Stripe subscription receipts as vendor_saas", () => {
    const ctx = classifyEmailSender({
      from_email: "billing@stripe.com",
      from_name: "Stripe",
      subject: "Your receipt from Stripe",
      body_text: "Thanks for your subscription to Salt.",
    });

    expect(ctx.kind).toBe("vendor_saas");
    expect(ctx.vendorName).toBe("Stripe");
  });

  it("classifies personal @linear.app addresses as vendor_saas", () => {
    const ctx = classifyEmailSender({
      from_email: "jeremy@linear.app",
      from_name: "Jeremy",
      subject: "Comment on issue SAL-42",
      body_text: "Jeremy mentioned you in a comment.",
    });

    expect(ctx.kind).toBe("vendor_saas");
    expect(ctx.vendorName).toBe("Linear");
  });

  it("classifies Apify product mail as vendor_saas", () => {
    const ctx = classifyEmailSender({
      from_email: "team@apify.com",
      from_name: "Apify",
      subject: "Your Apify usage this month",
      body_text: "Here's your monthly usage summary.",
    });

    expect(ctx.kind).toBe("vendor_saas");
  });

  it("classifies Magic Path mail as vendor_saas", () => {
    const ctx = classifyEmailSender({
      from_email: "hello@magicpath.ai",
      from_name: "Magic Path",
      subject: "Welcome to Magic Path",
      body_text: "Thanks for signing up.",
    });

    expect(ctx.kind).toBe("vendor_saas");
  });

  it("classifies Gemini billing as vendor_saas", () => {
    const ctx = classifyEmailSender({
      from_email: "noreply@google.com",
      from_name: "Google",
      subject: "Your Gemini subscription receipt",
      body_text: "Payment received for Google AI Pro.",
    });

    expect(ctx.kind).toBe("vendor_saas");
    expect(ctx.vendorName).toBe("Gemini");
  });

  it("keeps Stripe client payments as payment_rail when payer is in body", () => {
    const ctx = classifyEmailSender({
      from_email: "notify@stripe.com",
      from_name: "Stripe",
      subject: "Payment received",
      body_text: "You've received $500.00 from Jane Client for invoice 1042.",
    });

    expect(ctx.kind).toBe("payment_rail");
  });

  it("does not classify client training email as vendor", () => {
    const ctx = classifyEmailSender({
      from_email: "pastor@mannahouse.org",
      from_name: "Manna House",
      subject: MANNA_HOUSE_TRAINING_EMAIL.subject,
      body_text: MANNA_HOUSE_TRAINING_EMAIL.body_text,
    });

    expect(ctx.kind).toBe("unknown");
  });

  it("filters org proposals for vendor senders", () => {
    const filtered = filterMemoryProposalsForSender(
      [
        {
          surface: "orgs",
          action: "create",
          hint: { name: "Linear" },
          confidence: 80,
          reason: "test",
          system_play: "system:create-org",
        },
      ],
      { kind: "vendor_saas", vendorName: "Linear" }
    );

    expect(filtered).toHaveLength(0);
  });

  it("detectMemoryProposals returns empty for Ramp receipt", () => {
    const proposals = detectMemoryProposals({
      id: "cap-ramp",
      from_email: "billing@ramp.com",
      from_name: "Ramp",
      to_emails: ["hello@createdbysalt.com"],
      subject: "Your Ramp invoice for March",
      snippet: "Subscription renewal",
      body_text: "Your monthly subscription was renewed.",
      sent_at: new Date().toISOString(),
      thread_id: "t-ramp",
      is_sent_by_user: false,
      has_prior_thread: false,
    });

    expect(proposals).toHaveLength(0);
  });

  it("recognizes common SaaS vendor domains", () => {
    expect(isKnownSaasVendorDomain("linear.app")).toBe(true);
    expect(isKnownSaasVendorDomain("mail.descript.com")).toBe(true);
    expect(isKnownSaasVendorDomain("mannahouse.org")).toBe(false);
  });

  it("classifies obscure domains with receipt subjects as vendor_saas", () => {
    const ctx = classifyEmailSender({
      from_email: "billing@obscure-saas-tool.io",
      from_name: "Obscure SaaS",
      subject: "Your receipt from Obscure SaaS",
      body_text: "Thanks for your subscription renewal.",
    });

    expect(ctx.kind).toBe("vendor_saas");
    expect(ctx.reason).toBe("receipt_billing_signal");
  });

  it("uses workspace client profile over vendor heuristics", () => {
    const registry = registryWithDomain("mannahouse.org", {
      kind: "client",
      source: "user_confirm",
      confidence: 95,
    });

    const ctx = classifyEmailSender(
      {
        from_email: "pastor@mannahouse.org",
        from_name: "Manna House",
        subject: "Your receipt from Manna House",
        body_text: "Payment received.",
      },
      { registry }
    );

    expect(ctx.kind).toBe("client");
    expect(ctx.reason).toBe("workspace_sender_profile");
  });

  it("uses workspace vendor profile for unknown billing senders", () => {
    const registry = registryWithDomain("customcrm.io", {
      kind: "vendor_saas",
      vendorName: "Custom CRM",
      source: "user_dismiss",
      confidence: 95,
    });

    const ctx = classifyEmailSender(
      {
        from_email: "hello@customcrm.io",
        from_name: "Custom CRM",
        subject: "Weekly digest",
        body_text: "Here is your product update.",
      },
      { registry }
    );

    expect(ctx.kind).toBe("vendor_saas");
    expect(ctx.vendorName).toBe("Custom CRM");
    expect(ctx.reason).toBe("workspace_sender_profile");
  });
});
