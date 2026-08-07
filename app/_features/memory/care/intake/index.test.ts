import { describe, it, expect } from "vitest";
import {
  parseIntakeRequest,
  getCreationOrder,
  getMissingFieldsToWatch,
  extractAmountCents,
  extractDateHints,
  ENTITY_TIERS,
  SIGNAL_WEIGHTS,
  EVIDENCE_THRESHOLDS,
  canonicalizeIdentifier,
  accumulateEvidence,
  evaluateEvidence,
  logOddsToProbability,
  probabilityToLogOdds,
} from "./index";

describe("parseIntakeRequest", () => {
  it("parses single person request", () => {
    const result = parseIntakeRequest("Add a person called Jane Doe");
    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].type).toBe("person");
    expect(result.entities[0].name).toBe("Jane Doe");
    expect(result.isMultiEntity).toBe(false);
  });

  it("parses single organization request", () => {
    const result = parseIntakeRequest("Add Acme Studio as a client company");
    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].type).toBe("organization");
    expect(result.entities[0].name).toBe("Acme Studio");
  });

  it("parses multi-entity request: org + person + work", () => {
    const result = parseIntakeRequest(
      "Add Acme Studio and Liam G. as the main contact. We're working on a website for them."
    );

    expect(result.isMultiEntity).toBe(true);
    expect(result.entities.length).toBeGreaterThanOrEqual(2);

    const types = result.entities.map((e) => e.type);
    expect(types).toContain("organization");
    expect(types).toContain("person");
  });

  it("extracts email and associates with person", () => {
    const result = parseIntakeRequest("Add a contact called Jane Doe, her email is jane@example.com");
    const person = result.entities.find((e) => e.type === "person");
    expect(person?.email).toBe("jane@example.com");
  });

  it("parses casual add Jane Example with project for her", () => {
    const result = parseIntakeRequest(
      "okay add Jane Example. we're working on a project for her.",
    );

    expect(result.isMultiEntity).toBe(true);
    const person = result.entities.find((e) => e.type === "person");
    const work = result.entities.find((e) => e.type === "work");

    expect(person?.name).toBe("Jane Example");
    expect(work?.name).toBe("Project for Jane Example");
    expect(work?.explicitLinks.some((link) => link.targetName === "Jane Example")).toBe(true);
    expect(result.entities.filter((e) => e.type === "work")).toHaveLength(1);
  });

  it("parses lowercase add jane example with implied project work", () => {
    const result = parseIntakeRequest(
      "add jane example we're working on a project for her.",
    );

    expect(result.isMultiEntity).toBe(true);
    expect(result.entities.find((e) => e.type === "person")?.name).toBe("Jane Example");
    expect(result.entities.find((e) => e.type === "work")?.name).toBe("Project for Jane Example");
    expect(result.entities.filter((e) => e.type === "work")).toHaveLength(1);
  });

  it("groups entities by tier", () => {
    const result = parseIntakeRequest(
      "Add Acme Corp with John Smith as contact, log an invoice for $5000"
    );

    const tier1 = result.tiers.get(1) || [];
    const tier2 = result.tiers.get(2) || [];
    const tier4 = result.tiers.get(4) || [];

    // Org is tier 1
    expect(tier1.some((e) => e.type === "organization")).toBe(true);
    // Person is tier 2
    expect(tier2.some((e) => e.type === "person")).toBe(true);
    // Billing is tier 4
    expect(tier4.some((e) => e.type === "billing")).toBe(true);
  });
});

describe("getCreationOrder", () => {
  it("returns entities sorted by tier", () => {
    const request = parseIntakeRequest(
      "Log invoice from Acme for the website project, add John as contact"
    );
    const order = getCreationOrder(request);

    // Should be sorted: tier 1 (org) → tier 2 (person) → tier 3 (work) → tier 4 (billing)
    let lastTier = 0;
    for (const entity of order) {
      expect(entity.tier).toBeGreaterThanOrEqual(lastTier);
      lastTier = entity.tier;
    }
  });
});

describe("getMissingFieldsToWatch", () => {
  it("returns all watch fields when nothing is present", () => {
    const missing = getMissingFieldsToWatch("person", []);
    expect(missing).toContain("email");
    expect(missing).toContain("phone");
    expect(missing).toContain("organization");
  });

  it("excludes present fields", () => {
    const missing = getMissingFieldsToWatch("person", ["email"]);
    expect(missing).not.toContain("email");
    expect(missing).toContain("phone");
  });

  it("returns org-specific watch fields", () => {
    const missing = getMissingFieldsToWatch("organization", []);
    expect(missing).toContain("domain");
    expect(missing).toContain("website");
    expect(missing).toContain("billing_email");
  });

  it("returns work-specific watch fields", () => {
    const missing = getMissingFieldsToWatch("work", []);
    expect(missing).toContain("deadline");
    expect(missing).toContain("contract_value_cents");
  });
});

describe("extractAmountCents", () => {
  it("extracts $5000 as 500000 cents", () => {
    const cents = extractAmountCents("invoice for $5000");
    expect(cents).toBe(500000);
  });

  it("extracts $5,000.00 as 500000 cents", () => {
    const cents = extractAmountCents("log $5,000.00 payment");
    expect(cents).toBe(500000);
  });

  it("extracts $99.99 as 9999 cents", () => {
    const cents = extractAmountCents("$99.99 due");
    expect(cents).toBe(9999);
  });

  it("returns null when no amount found", () => {
    const cents = extractAmountCents("add a new invoice");
    expect(cents).toBeNull();
  });
});

describe("extractDateHints", () => {
  it("extracts 'due in 30 days'", () => {
    const hints = extractDateHints("invoice due in 30 days");
    expect(hints.dueDate).toBeDefined();

    // Should be ~30 days from now
    const dueDate = new Date(hints.dueDate!);
    const now = new Date();
    const diffDays = Math.round((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBeGreaterThanOrEqual(29);
    expect(diffDays).toBeLessThanOrEqual(31);
  });

  it("extracts 'deadline: July 15'", () => {
    const hints = extractDateHints("deadline July 15");
    expect(hints.deadline).toBe("July 15");
  });
});

describe("ENTITY_TIERS", () => {
  it("has org at tier 1", () => {
    expect(ENTITY_TIERS.organization).toBe(1);
  });

  it("has person and file at tier 2", () => {
    expect(ENTITY_TIERS.person).toBe(2);
    expect(ENTITY_TIERS.file).toBe(2);
  });

  it("has work and meeting at tier 3", () => {
    expect(ENTITY_TIERS.work).toBe(3);
    expect(ENTITY_TIERS.meeting).toBe(3);
  });

  it("has billing at tier 4", () => {
    expect(ENTITY_TIERS.billing).toBe(4);
  });
});

describe("canonicalizeIdentifier", () => {
  it("lowercases and trims person email", () => {
    expect(canonicalizeIdentifier("person", "  Jane@Example.COM  ")).toBe(
      "jane@example.com"
    );
  });

  it("extracts domain from email for organization", () => {
    expect(canonicalizeIdentifier("organization", "jane@PhotonStudio.com")).toBe(
      "photonstudio.com"
    );
  });

  it("strips www from organization domain", () => {
    expect(canonicalizeIdentifier("organization", "www.example.com")).toBe(
      "example.com"
    );
  });

  it("normalizes whitespace for work", () => {
    expect(canonicalizeIdentifier("work", "  Website   Redesign  ")).toBe(
      "website redesign"
    );
  });
});

describe("accumulateEvidence", () => {
  it("adds positive signal weight", () => {
    const score = accumulateEvidence(0, "email_from_unknown_address");
    expect(score).toBe(2.5);
  });

  it("accumulates multiple signals", () => {
    let score = 0;
    score = accumulateEvidence(score, "email_from_unknown_address"); // +2.5
    score = accumulateEvidence(score, "meeting_attendee_unknown"); // +3.0
    expect(score).toBe(5.5);
  });

  it("subtracts negative signal weight", () => {
    let score = 5.0;
    score = accumulateEvidence(score, "looks_like_newsletter"); // -3.0
    expect(score).toBe(2.0);
  });

  it("returns same score for unknown signal", () => {
    const score = accumulateEvidence(3.0, "unknown_signal");
    expect(score).toBe(3.0);
  });
});

describe("evaluateEvidence", () => {
  it("returns 'watch' below suggest threshold", () => {
    expect(evaluateEvidence("person", 2.0)).toBe("watch");
  });

  it("returns 'suggest' at suggest threshold", () => {
    expect(evaluateEvidence("person", 4.0)).toBe("suggest");
  });

  it("returns 'auto' at auto threshold", () => {
    expect(evaluateEvidence("person", 8.0)).toBe("auto");
  });

  it("returns 'dismiss' at dismiss threshold", () => {
    expect(evaluateEvidence("person", -3.0)).toBe("dismiss");
  });

  it("uses entity-specific thresholds", () => {
    // meeting has lower suggest threshold (2.0)
    expect(evaluateEvidence("meeting", 2.0)).toBe("suggest");
    // work has higher suggest threshold (5.0)
    expect(evaluateEvidence("work", 3.0)).toBe("watch");
  });
});

describe("logOddsToProbability", () => {
  it("converts 0 log-odds to 50%", () => {
    expect(logOddsToProbability(0)).toBe(50);
  });

  it("converts positive log-odds to >50%", () => {
    expect(logOddsToProbability(2)).toBe(80); // 2^2 / (1 + 2^2) = 4/5 = 80%
  });

  it("converts negative log-odds to <50%", () => {
    expect(logOddsToProbability(-2)).toBe(20); // 2^-2 / (1 + 2^-2) = 0.25/1.25 = 20%
  });

  it("handles high log-odds", () => {
    expect(logOddsToProbability(10)).toBeGreaterThan(99);
  });
});

describe("probabilityToLogOdds", () => {
  it("converts 50% to 0 log-odds", () => {
    expect(probabilityToLogOdds(50)).toBe(0);
  });

  it("converts 80% to ~2 log-odds", () => {
    expect(probabilityToLogOdds(80)).toBeCloseTo(2, 1);
  });

  it("converts 20% to ~-2 log-odds", () => {
    expect(probabilityToLogOdds(20)).toBeCloseTo(-2, 1);
  });
});

describe("SIGNAL_WEIGHTS", () => {
  it("has positive weights for strong signals", () => {
    expect(SIGNAL_WEIGHTS.meeting_attendee_unknown).toBeGreaterThan(2);
    expect(SIGNAL_WEIGHTS.invoice_attachment_detected).toBeGreaterThan(3);
  });

  it("has negative weights for spam indicators", () => {
    expect(SIGNAL_WEIGHTS.looks_like_newsletter).toBeLessThan(0);
    expect(SIGNAL_WEIGHTS.domain_is_known_spam).toBeLessThan(0);
  });
});

describe("EVIDENCE_THRESHOLDS", () => {
  it("has suggest < auto for all entity types", () => {
    for (const entityType of Object.keys(EVIDENCE_THRESHOLDS)) {
      const thresholds = EVIDENCE_THRESHOLDS[entityType as keyof typeof EVIDENCE_THRESHOLDS];
      expect(thresholds.suggest).toBeLessThan(thresholds.auto);
    }
  });

  it("has dismiss < suggest for all entity types", () => {
    for (const entityType of Object.keys(EVIDENCE_THRESHOLDS)) {
      const thresholds = EVIDENCE_THRESHOLDS[entityType as keyof typeof EVIDENCE_THRESHOLDS];
      expect(thresholds.dismiss).toBeLessThan(thresholds.suggest);
    }
  });
});
