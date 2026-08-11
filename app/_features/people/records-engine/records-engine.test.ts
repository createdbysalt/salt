import { describe, expect, it } from "vitest";
import { evaluateAdmission, classifyEntity, resolveIdentity } from ".";
import type { ExistingPersonCandidate, RecordsInput } from "./types";

function decide(input: RecordsInput, candidates: ExistingPersonCandidate[] = []) {
  const classification = classifyEntity(input);
  const duplicates = resolveIdentity({ recordsInput: input, candidates });
  return evaluateAdmission({ recordsInput: input, classification, duplicates });
}

describe("records engine", () => {
  it("skips noreply system senders", () => {
    const decision = decide({ email: "noreply@stripe.com", explicitRequest: false });

    expect(decision.entityType).toBe("system_sender");
    expect(decision.action).toBe("skip");
  });

  it("requires confirmation when the user insists a system sender is a person", () => {
    const decision = decide({
      email: "noreply@stripe.com",
      explicitRequest: true,
      userInsistsPerson: true,
    });

    expect(decision.entityType).toBe("system_sender");
    expect(decision.action).toBe("needs_confirmation");
  });

  it("routes billing aliases to organization suggestions by default", () => {
    const decision = decide({ email: "billing@acme.com", explicitRequest: true });

    expect(decision.entityType).toBe("shared_alias");
    expect(decision.action).toBe("suggest_org");
  });

  it("routes domain-only input to organization suggestions", () => {
    const decision = decide({ name: "Acme", domain: "acme.com", explicitRequest: true });

    expect(decision.entityType).toBe("organization");
    expect(decision.action).toBe("suggest_org");
  });

  it("skips suspicious senders", () => {
    const decision = decide({ email: "verify-account@phish.example", explicitRequest: true });

    expect(decision.entityType).toBe("suspicious");
    expect(decision.action).toBe("skip");
  });

  it("creates a clear human request with real email", () => {
    const decision = decide({
      name: "Maya Chen",
      email: "maya@acme.com",
      explicitRequest: true,
    });

    expect(decision.entityType).toBe("person");
    expect(decision.action).toBe("create");
    expect(decision.confidence).toBeGreaterThanOrEqual(85);
  });

  it("caps LLM-inferred signals at needs_confirmation — never auto-create (5.2)", () => {
    const observed = decide({
      name: "Maya Chen",
      email: "maya@acme.com",
      signals: { has_stripe_payment: true, is_bidirectional_thread: true },
    });
    expect(observed.action).toBe("create");

    const inferred = decide({
      name: "Maya Chen",
      email: "maya@acme.com",
      signals: { has_stripe_payment: true, is_bidirectional_thread: true },
      signalsInferred: true,
    });
    expect(inferred.action).toBe("needs_confirmation");
    expect(inferred.reasons).toContain("Signals inferred by AI — requires confirmation");
  });

  it("requires confirmation for a name-only explicit request", () => {
    const decision = decide({ name: "Maya Chen", explicitRequest: true });

    expect(decision.entityType).toBe("person");
    expect(decision.action).toBe("needs_confirmation");
  });

  it("updates existing person on exact email match", () => {
    const decision = decide(
      { name: "Maya Chen", email: "maya@acme.com", explicitRequest: true },
      [{ id: "person-1", name: "Maya Chen", email: "maya@acme.com" }],
    );

    expect(decision.action).toBe("update_existing");
    expect(decision.duplicates).toHaveLength(1);
  });

  it("suggests merge for same name with a different org", () => {
    const decision = decide(
      {
        name: "Alex Rivera",
        email: "alex@beta.com",
        domain: "beta.com",
        organizationName: "Beta",
        explicitRequest: true,
      },
      [
        {
          id: "person-1",
          name: "Alex Rivera",
          email: "alex@acme.com",
          organizationName: "Acme",
          organizationDomain: "acme.com",
        },
      ],
    );

    expect(decision.action).toBe("suggest_merge");
    expect(decision.duplicates[0]?.id).toBe("person-1");
  });

  it("creates a person when capture signals are strong", () => {
    const decision = decide({
      email: "maya@acme.com",
      signals: { has_payment_received: true, has_invoice_sent: true },
    });

    expect(decision.action).toBe("create");
    expect(decision.suggestedRelationshipType).toBe("client");
  });
});

describe("cross-app corroboration (registry-wiring Phase 4)", () => {
  // Base: calendar (30) + bidirectional thread (25) + email identity (10) +
  // company domain (5) + name (10) = 80 → needs_confirmation without the
  // corroboration bonus.
  const borderline: RecordsInput = {
    name: "Maya Chen",
    email: "maya@acme.com",
    signals: { has_calendar_meeting: true, is_bidirectional_thread: true },
  };

  it("lifts borderline candidates corroborated across connected apps", () => {
    const decision = decide({ ...borderline, corroborationCount: 2 });

    expect(decision.action).toBe("create");
    expect(decision.confidence).toBe(95);
    expect(
      decision.reasons.some((reason) => reason.includes("Corroborated")),
    ).toBe(true);
  });

  it("single-source evidence earns no corroboration bonus", () => {
    const decision = decide({ ...borderline, corroborationCount: 1 });

    expect(decision.action).toBe("needs_confirmation");
    expect(decision.confidence).toBe(80);
  });

  it("LLM-inferred signals stay capped even with corroboration", () => {
    const decision = decide({
      ...borderline,
      signalsInferred: true,
      corroborationCount: 4,
    });

    expect(decision.action).toBe("needs_confirmation");
    expect(decision.confidence).toBeLessThanOrEqual(50);
  });
});
