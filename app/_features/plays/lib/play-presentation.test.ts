import { describe, it, expect } from "vitest";
import {
  buildPlayPresentation,
  buildPlayRunMetadata,
  SALT_APP_ID,
  type ProviderPresentationResolver,
  type StepProvenance,
} from "./play-presentation";

const stripeResolver: ProviderPresentationResolver = (provider) =>
  provider === "stripe"
    ? {
        catalogId: "stripe",
        label: "Stripe",
        dashboardUrl: "https://dashboard.stripe.com",
      }
    : provider === "gmail"
      ? {
          catalogId: "google",
          label: "Gmail",
          dashboardUrl: "https://mail.google.com",
        }
      : null;

const baseInput = {
  playbookName: "Payment Received",
  section: "billing",
  layer: "act" as const,
  outputType: "email_draft" as const,
  subject: "Payment Received",
  resolveProvider: stripeResolver,
};

describe("buildPlayPresentation", () => {
  it("emits the trigger as the first evidence item, marked as Salt-sourced", () => {
    const presentation = buildPlayPresentation({
      ...baseInput,
      steps: [],
      stepData: {},
      triggerLabel: "Payment received in Stripe",
    });

    expect(presentation.evidence[0]).toEqual({
      label: "Payment received in Stripe",
      appId: SALT_APP_ID,
    });
  });

  it("emits a Salt-sourced evidence item naming the apps an agent step researched", () => {
    const steps: StepProvenance[] = [
      {
        stepId: "research",
        kind: "agent",
        source: "salt",
        toolSlugs: ["STRIPE_LIST_CHARGES", "GMAIL_FETCH_EMAILS"],
        providers: ["stripe", "gmail"],
      },
    ];

    const presentation = buildPlayPresentation({
      ...baseInput,
      steps,
      stepData: { research: { text: "All paid", toolCalls: [] } },
    });

    expect(presentation.evidence[0]).toEqual({
      label: "Researched Stripe, Gmail for research",
      appId: SALT_APP_ID,
    });
    // Every app the agent touched counts toward the run's logos.
    expect(presentation.connectorIds).toEqual(["stripe", "google"]);
  });

  it("falls back to a call count when agent providers don't resolve", () => {
    const steps: StepProvenance[] = [
      {
        stepId: "research",
        kind: "agent",
        source: "salt",
        toolSlugs: ["UNKNOWN_TOOL"],
        providers: ["unknown-app"],
      },
    ];

    const presentation = buildPlayPresentation({
      ...baseInput,
      steps,
      stepData: {},
    });

    expect(presentation.evidence[0]).toEqual({
      label: "Ran 1 tool call for research",
      appId: SALT_APP_ID,
    });
    expect(presentation.connectorIds).toEqual([]);
  });

  it("emits one evidence item per connector fetch with the provider glyph and deep link", () => {
    const steps: StepProvenance[] = [
      {
        stepId: "payment_details",
        kind: "fetch",
        source: "connector",
        provider: "stripe",
        toolSlug: "STRIPE_LIST_CHARGES",
        category: "billing",
      },
    ];

    const presentation = buildPlayPresentation({
      ...baseInput,
      steps,
      stepData: { payment_details: [{ id: "ch_123" }] },
    });

    expect(presentation.evidence).toHaveLength(1);
    expect(presentation.evidence[0]).toMatchObject({
      appId: "stripe",
      appLabel: "Stripe",
      url: "https://dashboard.stripe.com/payments/ch_123",
    });
    expect(presentation.evidence[0]!.label).toContain("Stripe");
  });

  it("falls back to the provider dashboard URL when no deep link extracts", () => {
    const steps: StepProvenance[] = [
      {
        stepId: "payment_details",
        kind: "fetch",
        source: "connector",
        provider: "stripe",
        toolSlug: "STRIPE_LIST_CHARGES",
        category: "billing",
      },
    ];

    const presentation = buildPlayPresentation({
      ...baseInput,
      steps,
      stepData: { payment_details: { _placeholder: true } },
    });

    expect(presentation.evidence[0]).toMatchObject({
      appId: "stripe",
      url: "https://dashboard.stripe.com",
    });
  });

  it("links Memory invoice context and a hosted Stripe pay page", () => {
    const presentation = buildPlayPresentation({
      ...baseInput,
      playbookSlug: "invoice-reminder",
      entitySurface: "billing",
      entityId: "br-frank",
      triggerLabel: "Billing due date passed",
      steps: [
        { stepId: "invoice_context", kind: "fetch", source: "memory" },
        {
          stepId: "verify_unpaid",
          kind: "agent",
          source: "salt",
          toolSlugs: ["STRIPE_LIST_INVOICES"],
          providers: ["stripe"],
        },
      ],
      stepData: {
        invoice_context: {
          invoice: {
            number: "INV-2026-1589",
            pay_url: "https://invoice.stripe.com/i/acct_test/in_frank",
          },
        },
      },
    });

    expect(presentation.evidence[0]).toMatchObject({
      label: "Billing due date passed",
      url: "/billing/br-frank",
    });
    expect(presentation.evidence[1]).toMatchObject({
      label: "Read invoice context from Memory",
      url: "/billing/br-frank",
    });
    expect(presentation.evidence[2]?.url).toBe(
      "https://invoice.stripe.com/i/acct_test/in_frank"
    );
  });

  it("marks memory and capture fetches as Salt-sourced (stars icon)", () => {
    const steps: StepProvenance[] = [
      { stepId: "person_context", kind: "fetch", source: "memory" },
      { stepId: "recent_emails", kind: "fetch", source: "capture" },
      { stepId: "triage", kind: "classify", source: "salt" },
    ];

    const presentation = buildPlayPresentation({
      ...baseInput,
      steps,
      stepData: {},
    });

    expect(presentation.evidence.map((e) => e.appId)).toEqual([
      SALT_APP_ID,
      SALT_APP_ID,
      SALT_APP_ID,
    ]);
    expect(presentation.connectorIds).toEqual([]);
  });

  it("collects connector logos from tools actually used, deduped and capped", () => {
    const steps: StepProvenance[] = [
      { stepId: "a", kind: "fetch", source: "connector", provider: "stripe", toolSlug: "STRIPE_LIST_CHARGES" },
      { stepId: "b", kind: "fetch", source: "connector", provider: "stripe", toolSlug: "STRIPE_LIST_INVOICES" },
      { stepId: "c", kind: "action", source: "connector", provider: "gmail", toolSlug: "GMAIL_SEND_EMAIL" },
      { stepId: "d", kind: "classify", source: "salt" },
    ];

    const presentation = buildPlayPresentation({
      ...baseInput,
      steps,
      stepData: {},
    });

    expect(presentation.connectorIds).toEqual(["stripe", "google"]);
  });

  it("includes the delivery channel app in connector logos (draft targets Gmail, no Gmail tool ran)", () => {
    const steps: StepProvenance[] = [
      { stepId: "payment_details", kind: "fetch", source: "connector", provider: "stripe", toolSlug: "STRIPE_LIST_CHARGES" },
      { stepId: "thank_you", kind: "draft", source: "salt" },
    ];

    const presentation = buildPlayPresentation({
      ...baseInput,
      steps,
      stepData: { thank_you: "Hi Alex, thank you…" },
      channel: "Gmail",
      channelProvider: "gmail",
    });

    expect(presentation.connectorIds).toEqual(["stripe", "google"]);
  });

  it("does not duplicate the channel app when a tool from it already ran", () => {
    const steps: StepProvenance[] = [
      { stepId: "send", kind: "action", source: "connector", provider: "gmail", toolSlug: "GMAIL_SEND_EMAIL" },
    ];

    const presentation = buildPlayPresentation({
      ...baseInput,
      steps,
      stepData: {},
      channel: "Gmail",
      channelProvider: "gmail",
    });

    expect(presentation.connectorIds).toEqual(["google"]);
  });

  it("ignores an unresolvable channel provider", () => {
    const presentation = buildPlayPresentation({
      ...baseInput,
      steps: [],
      stepData: {},
      channel: "Unknown App",
      channelProvider: "unknown_app",
    });

    expect(presentation.connectorIds).toEqual([]);
  });

  it("emits an artifact per executed action step with a deep link", () => {
    const steps: StepProvenance[] = [
      {
        stepId: "send_invoice",
        kind: "action",
        source: "connector",
        provider: "stripe",
        toolSlug: "STRIPE_CREATE_INVOICE",
      },
    ];

    const presentation = buildPlayPresentation({
      ...baseInput,
      steps,
      stepData: {
        send_invoice: { executed: true, result: { id: "in_9", hosted_invoice_url: "https://invoice.stripe.com/i/9" } },
      },
    });

    expect(presentation.artifacts).toEqual([
      {
        appId: "stripe",
        label: expect.stringContaining("Send invoice"),
        url: "https://invoice.stripe.com/i/9",
      },
    ]);
  });

  it("skips artifacts for action steps that did not execute", () => {
    const steps: StepProvenance[] = [
      { stepId: "send_invoice", kind: "action", source: "connector", provider: "stripe", toolSlug: "STRIPE_CREATE_INVOICE" },
    ];

    const presentation = buildPlayPresentation({
      ...baseInput,
      steps,
      stepData: { send_invoice: { executed: false } },
    });

    expect(presentation.artifacts).toEqual([]);
  });

  it("puts an email_draft draft on draftBody, not in artifacts (modal renders it once)", () => {
    const presentation = buildPlayPresentation({
      ...baseInput,
      steps: [
        { stepId: "thank_you", kind: "draft", source: "salt" },
      ],
      stepData: { thank_you: "Hi Nina,\n\nPayment received — thank you!" },
    });

    expect(presentation.draftBody).toBe("Hi Nina,\n\nPayment received — thank you!");
    expect(presentation.artifacts).toEqual([]);
  });

  it("uses the billing client as the email recipient, not the invoice number", () => {
    const presentation = buildPlayPresentation({
      ...baseInput,
      recipientLabel: "INV-2026-1589",
      targetLabel: "INV-2026-1589",
      steps: [
        { stepId: "invoice_context", kind: "fetch", source: "memory" },
        { stepId: "reminder_email", kind: "draft", source: "salt" },
      ],
      stepData: {
        invoice_context: {
          invoice: { number: "INV-2026-1589" },
          client: { name: "Frank", kind: "person" },
        },
        reminder_email: "Hi Frank,\n\nJust a reminder.",
      },
    });

    expect(presentation.recipientLabel).toBe("Frank");
    expect(presentation.headline).toBe("Frank hasn't paid INV-2026-1589");
  });

  it("puts a found hosted pay URL into the reminder letter", () => {
    const presentation = buildPlayPresentation({
      ...baseInput,
      steps: [
        { stepId: "invoice_context", kind: "fetch", source: "memory" },
        { stepId: "reminder_email", kind: "draft", source: "salt" },
      ],
      stepData: {
        invoice_context: {
          invoice: {
            number: "INV-2026-1589",
            pay_url: "https://invoice.stripe.com/i/acct_test/in_frank",
          },
          client: { name: "Frank", kind: "person" },
        },
        reminder_email:
          "Hi Frank,\n\nPlease send payment.\n\nBest regards,\nGabriella Martins",
      },
    });

    expect(presentation.draftBody).toContain(
      "Pay invoice: https://invoice.stripe.com/i/acct_test/in_frank"
    );
    expect(presentation.draftBody).toContain("Best regards,");
  });

  it("renders a briefing draft as an artifact with paragraphs", () => {
    const presentation = buildPlayPresentation({
      ...baseInput,
      outputType: "briefing",
      steps: [{ stepId: "brief", kind: "draft", source: "salt" }],
      stepData: { brief: "Para one.\n\nPara two." },
    });

    expect(presentation.draftBody).toBe("Para one.\n\nPara two.");
    expect(presentation.artifacts).toEqual([
      expect.objectContaining({
        appId: SALT_APP_ID,
        draftBody: ["Para one.", "Para two."],
      }),
    ]);
  });

  it("composes a moment-first headline from the output type and target", () => {
    const presentation = buildPlayPresentation({
      ...baseInput,
      steps: [],
      stepData: {},
      targetLabel: "Meridian Studio",
    });

    expect(presentation.headline).toBe("Thank Meridian Studio");
  });

  it("survives an unknown provider (resolver returns null) without crashing", () => {
    const steps: StepProvenance[] = [
      { stepId: "mystery", kind: "fetch", source: "connector", provider: "unknown_app", toolSlug: "UNKNOWN_DO" },
    ];

    const presentation = buildPlayPresentation({
      ...baseInput,
      steps,
      stepData: {},
    });

    expect(presentation.evidence).toHaveLength(1);
    expect(presentation.evidence[0]!.appId).toBeNull();
    expect(presentation.connectorIds).toEqual([]);
  });
});

describe("buildPlayRunMetadata", () => {
  it("shapes metadata with the keys the card mapper and modal read", () => {
    const presentation = buildPlayPresentation({
      ...baseInput,
      steps: [
        { stepId: "payment_details", kind: "fetch", source: "connector", provider: "stripe", toolSlug: "STRIPE_LIST_CHARGES" },
      ],
      stepData: { payment_details: [{ id: "ch_1" }] },
      triggerLabel: "Payment received in Stripe",
      targetLabel: "Meridian Studio",
    });

    const metadata = buildPlayRunMetadata(presentation);

    expect(metadata).toMatchObject({
      section: "billing",
      layer: "act",
      output_type: "email_draft",
      playbook_name: "Payment Received",
      headline: "Thank Meridian Studio",
      connector_ids: ["stripe"],
    });
    expect(Array.isArray(metadata.evidence)).toBe(true);
    expect(Array.isArray(metadata.artifacts)).toBe(true);
  });
});
