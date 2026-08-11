/**
 * Registry-driven profile defaults (Phase 2, registry-wiring plan).
 *
 * The field registry is the source of truth for fill logic — the same rules
 * the Memory → Customize card renders. These tests pin the translation from
 * registry fillRules into the creation-time ProfileFillRule shape so the
 * records engine can never drift from what the UI advertises.
 */

import { describe, expect, it } from "vitest";
import { getFieldDescriptor } from "@/app/_features/memory/taxonomy/field-registry";
import { PROFILE_SIGNAL_KEYS } from "./types";
import {
  defaultOrgProfileRules,
  defaultPeopleProfileRules,
  defaultWorkProfileRules,
} from "./validate-rules";

const WORK_STATUS_CANON = [
  "draft",
  "signed",
  "active",
  "on_hold",
  "completed",
  "archived",
];

describe("registry-driven profile defaults", () => {
  it("derives person relationship_type rules from the field registry", () => {
    const registryField = getFieldDescriptor("person", "relationshipType");
    expect(registryField?.fillRules?.length).toBeGreaterThan(0);
    const defaults = defaultPeopleProfileRules();

    for (const rule of registryField?.fillRules ?? []) {
      const match = defaults.rules.find(
        (r) => r.field === "relationship_type" && r.when.signal === rule.signal
      );
      expect(match, `rule for signal ${rule.signal}`).toBeDefined();
      expect(match?.set.value).toBe(String(rule.value));
      expect(match?.confidence).toBe(rule.confidence);
      expect(match?.because).toBe(rule.because);
    }
  });

  it("maps the person title extraction rule onto creation-time signature facts", () => {
    const defaults = defaultPeopleProfileRules();
    const title = defaults.rules.find((r) => r.field === "title");
    expect(title).toBeDefined();
    expect(title?.when.signal).toBe("has_signature");
    expect(title?.set.value).toBe("{{extracted_title}}");

    const registryField = getFieldDescriptor("person", "title");
    expect(title?.confidence).toBe(registryField?.fillRules?.[0]?.confidence);
  });

  it("keeps the org_link creation-time supplement (no registry field yet)", () => {
    const defaults = defaultPeopleProfileRules();
    const orgLink = defaults.rules.find((r) => r.field === "org_link");
    expect(orgLink?.when.signal).toBe("email_domain_is_personal");
    expect(orgLink?.set.value).toBe("{{org_domain}}");
  });

  it("derives org relationship_status rules from the field registry", () => {
    const registryField = getFieldDescriptor("org", "relationshipType");
    expect(registryField?.fillRules?.length).toBeGreaterThan(0);
    const defaults = defaultOrgProfileRules();

    for (const rule of registryField?.fillRules ?? []) {
      const match = defaults.rules.find(
        (r) => r.field === "relationship_status" && r.when.signal === rule.signal
      );
      expect(match, `rule for signal ${rule.signal}`).toBeDefined();
      expect(match?.set.value).toBe(String(rule.value));
      expect(match?.confidence).toBe(rule.confidence);
    }
  });

  it("maps the org website rule onto the domain-known creation fact", () => {
    const defaults = defaultOrgProfileRules();
    const website = defaults.rules.find((r) => r.field === "website");
    expect(website?.when.signal).toBe("org_domain_known");
    expect(website?.set.value).toBe("https://{{org_domain}}");
  });

  it("derives work status rules from the field registry in stored-canon values", () => {
    const registryField = getFieldDescriptor("work", "status");
    expect(registryField?.fillRules?.length).toBeGreaterThan(0);
    const defaults = defaultWorkProfileRules();

    for (const rule of registryField?.fillRules ?? []) {
      const match = defaults.rules.find(
        (r) => r.field === "status" && r.when.signal === rule.signal
      );
      expect(match, `rule for signal ${rule.signal}`).toBeDefined();
      expect(match?.set.value).toBe(String(rule.value));
    }

    // Stored canon only — display chips like "stalled" are never written.
    for (const rule of defaults.rules.filter((r) => r.field === "status")) {
      expect(WORK_STATUS_CANON).toContain(rule.set.value);
    }
  });

  it("keeps the work_created and inferred-description creation-time supplements", () => {
    const defaults = defaultWorkProfileRules();
    const created = defaults.rules.find(
      (r) => r.field === "status" && r.when.signal === "work_created"
    );
    expect(created?.set.value).toBe("active");
    const description = defaults.rules.find((r) => r.field === "description");
    expect(description?.when.signal).toBe("inferred_description");
    expect(description?.set.value).toBe("{{inferred_description}}");
  });

  it("only emits rules whose signals the engine can evaluate", () => {
    const known = new Set<string>(PROFILE_SIGNAL_KEYS);
    for (const doc of [
      defaultPeopleProfileRules(),
      defaultOrgProfileRules(),
      defaultWorkProfileRules(),
    ]) {
      for (const rule of doc.rules) {
        expect(
          known.has(rule.when.signal),
          `${rule.id} uses unknown signal ${rule.when.signal}`
        ).toBe(true);
      }
    }
  });

  it("registry edits propagate — confidence tracks the registry rule", () => {
    const registryField = getFieldDescriptor("person", "relationshipType");
    const paymentRule = registryField?.fillRules?.find(
      (r) => r.signal === "has_payment_received"
    );
    const defaults = defaultPeopleProfileRules();
    const match = defaults.rules.find(
      (r) => r.id === "relationship_type:has_payment_received"
    );
    expect(match?.confidence).toBe(paymentRule?.confidence);
  });
});
