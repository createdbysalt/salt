import { describe, expect, it } from "vitest";
import { parsePlaybookV2Yaml, getSectionMetadata, getAllSections } from "./parser";
import { inferSlugFromName, inferSectionFromSlug, mapV1LayerToV2 } from "./schema";

describe("parsePlaybookV2Yaml", () => {
  it("parses a valid learn-layer playbook", () => {
    const yaml = `
name: Billing Records
slug: billing-keeper
version: 1.0.0
description: Maintain billing records from payment evidence

section: billing
layer: learn

trigger:
  type: signal
  signal: billing_created

output:
  type: memory_update
  approval: per_entity

policy:
  auto_apply_threshold: 85
  procedure: |
    When a billing signal arrives, update the record.
  signals:
    - billing_created
  fields:
    - status
  fill_rules:
    - id: billing-status
      field: status
      when:
        signal: billing_created
        op: eq
        value: true
      set:
        value: draft
      confidence: 90
      because: Billing record created
`;

    const result = parsePlaybookV2Yaml(yaml);
    expect(result.validationErrors).toHaveLength(0);
    expect(result.definition).not.toBeNull();
    expect(result.definition.name).toBe("Billing Records");
    expect(result.definition.section).toBe("billing");
    expect(result.definition.layer).toBe("learn");
    expect(result.definition.policy?.auto_apply_threshold).toBe(85);
    expect(result.sectionMeta?.name).toBe("Billing");
  });

  it("parses a valid act-layer playbook", () => {
    const yaml = `
name: Invoice Reminder
slug: invoice-reminder
version: 1.0.0
description: Drafts payment reminders for overdue invoices

section: billing
layer: act
voice: billing

trigger:
  type: signal
  signal: billing_due_date_passed

steps:
  - step: fetch
    id: overdue_invoices
    from: billing.read_invoices
    where:
      status: overdue

  - step: classify
    id: tone
    forEach: overdue_invoices
    rules:
      - if: "payment_history.on_time >= 3"
        then: gentle
      - if: "payment_history.late >= 2"
        then: firm
    else: professional

  - step: draft
    id: reminder_email
    prompt: |
      Draft a {{tone}} payment reminder for {{invoice.customer}}.
      Amount: {{invoice.amount}}
    max_tokens: 200

output:
  type: email_draft
  approval: per_entity

value:
  kind: invoice_collected
  estimate: 50
`;

    const result = parsePlaybookV2Yaml(yaml);
    expect(result.validationErrors).toHaveLength(0);
    expect(result.definition).not.toBeNull();
    expect(result.definition.layer).toBe("act");
    expect(result.definition.voice).toBe("billing");
    expect(result.definition.steps).toHaveLength(3);
    expect(result.definition.value?.kind).toBe("invoice_collected");
  });

  it("rejects invalid YAML", () => {
    const yaml = `
name: [unclosed bracket
version: 1.0.0
`;

    const result = parsePlaybookV2Yaml(yaml);
    expect(result.validationErrors.length).toBeGreaterThan(0);
    expect(result.validationErrors[0].path).toBe("root");
    expect(result.validationErrors[0].message).toContain("Invalid YAML");
  });

  it("rejects missing required fields", () => {
    const yaml = `
name: Test
version: 1.0.0
`;

    const result = parsePlaybookV2Yaml(yaml);
    expect(result.validationErrors.length).toBeGreaterThan(0);
    expect(result.validationErrors.some((e) => e.path === "description")).toBe(true);
    expect(result.validationErrors.some((e) => e.path === "section")).toBe(true);
  });

  it("rejects invalid signal", () => {
    const yaml = `
name: Test
version: 1.0.0
description: Test playbook
section: billing
layer: learn
trigger:
  type: signal
  signal: invalid_signal_that_does_not_exist
output:
  type: memory_update
policy:
  auto_apply_threshold: 85
  procedure: Test
  signals:
    - invalid_signal_that_does_not_exist
  fields:
    - status
  fill_rules:
    - id: test
      field: status
      when:
        signal: invalid_signal_that_does_not_exist
        op: eq
        value: true
      set:
        value: test
      confidence: 90
      because: Test
`;

    const result = parsePlaybookV2Yaml(yaml, { validateSignals: true });
    expect(result.validationErrors.some((e) => e.path === "trigger.signal")).toBe(true);
  });

  it("rejects act-layer without voice or steps", () => {
    const yaml = `
name: Test Action
version: 1.0.0
description: Test playbook
section: billing
layer: act
trigger:
  type: signal
  signal: billing_due_date_passed
output:
  type: email_draft
`;

    const result = parsePlaybookV2Yaml(yaml);
    // Act-layer requires steps or instructions
    expect(result.validationErrors.some((e) => e.path === "steps")).toBe(true);
  });

  it("rejects learn-layer with voice", () => {
    const yaml = `
name: Test Keeper
version: 1.0.0
description: Test playbook
section: billing
layer: learn
voice: billing
trigger:
  type: signal
  signal: billing_created
output:
  type: memory_update
policy:
  auto_apply_threshold: 85
  procedure: Test
  signals:
    - billing_created
  fields:
    - status
  fill_rules:
    - id: test
      field: status
      when:
        signal: billing_created
        op: eq
        value: true
      set:
        value: test
      confidence: 90
      because: Test
`;

    const result = parsePlaybookV2Yaml(yaml);
    expect(result.validationErrors.some((e) => e.path === "voice")).toBe(true);
  });

  it("rejects duplicate step ids", () => {
    const yaml = `
name: Test
version: 1.0.0
description: Test playbook
section: billing
layer: act
voice: billing
trigger:
  type: signal
  signal: billing_due_date_passed
steps:
  - step: fetch
    id: data
    from: billing.invoices
  - step: fetch
    id: data
    from: billing.payments
output:
  type: email_draft
`;

    const result = parsePlaybookV2Yaml(yaml);
    expect(result.validationErrors.some((e) => e.message.includes("Duplicate step id"))).toBe(true);
  });

  it("infers slug from name", () => {
    const yaml = `
name: Invoice Payment Reminder
version: 1.0.0
description: Test playbook
section: billing
layer: learn
trigger:
  type: signal
  signal: billing_created
output:
  type: memory_update
policy:
  auto_apply_threshold: 85
  procedure: Test
  signals:
    - billing_created
  fields:
    - status
  fill_rules:
    - id: test
      field: status
      when:
        signal: billing_created
        op: eq
        value: true
      set:
        value: test
      confidence: 90
      because: Test
`;

    const result = parsePlaybookV2Yaml(yaml);
    expect(result.validationErrors).toHaveLength(0);
    expect(result.definition.slug).toBe("invoice-payment-reminder");
  });
});

describe("getSectionMetadata", () => {
  it("returns metadata for valid section", () => {
    const meta = getSectionMetadata("billing");
    expect(meta.name).toBe("Billing");
    expect(meta.icon).toBe("credit-card");
    expect(meta.signals).toContain("billing_created");
  });
});

describe("getAllSections", () => {
  it("returns all 9 sections", () => {
    const sections = getAllSections();
    expect(sections).toHaveLength(9);
    expect(sections.map((s) => s.slug)).toContain("relationships");
    expect(sections.map((s) => s.slug)).toContain("notes");
    expect(sections.map((s) => s.slug)).not.toContain("convos");
    expect(sections.map((s) => s.slug)).toContain("_meta");
  });
});

describe("inferSlugFromName", () => {
  it("converts name to slug", () => {
    expect(inferSlugFromName("Invoice Reminder")).toBe("invoice-reminder");
    expect(inferSlugFromName("Cash Runway Alert")).toBe("cash-runway-alert");
    expect(inferSlugFromName("My Cool Playbook!")).toBe("my-cool-playbook");
  });
});

describe("inferSectionFromSlug", () => {
  it("maps v1 slugs to sections", () => {
    expect(inferSectionFromSlug("keeper-billing-records")).toBe("billing");
    expect(inferSectionFromSlug("keeper-people-records")).toBe("relationships");
    expect(inferSectionFromSlug("invoice-chase")).toBe("billing");
    expect(inferSectionFromSlug("daily-briefing")).toBe("_meta");
    expect(inferSectionFromSlug("unknown-slug")).toBeNull();
  });
});

describe("mapV1LayerToV2", () => {
  it("maps v1 kind to v2 layer", () => {
    expect(mapV1LayerToV2("profile")).toBe("learn");
    expect(mapV1LayerToV2("acting")).toBe("act");
  });
});
