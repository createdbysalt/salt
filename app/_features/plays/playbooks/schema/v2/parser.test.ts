import { describe, expect, it } from "vitest";
import {
  parsePlaybookV2Yaml,
  validatePlaybookV2,
  getSectionMetadata,
  getAllSections,
} from "./parser";
import { inferSlugFromName, inferSectionFromSlug, mapV1LayerToV2 } from "./schema";

describe("parsePlaybookV2Yaml", () => {
  it("parses a valid learn-layer playbook", () => {
    const yaml = `
name: Billing Records
slug: billing-records
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

  it("parses an agent step with a tools allowlist", () => {
    const yaml = `
name: Collections Research
slug: collections-research
version: 1.0.0
description: Researches overdue accounts before drafting

section: billing
layer: act
voice: billing

trigger:
  type: signal
  signal: billing_due_date_passed

tools:
  - STRIPE_LIST_CHARGES
  - STRIPE_LIST_INVOICES

steps:
  - step: agent
    id: research
    prompt: |
      Look up recent charges and invoices for the customer.
    tools:
      - STRIPE_LIST_CHARGES
      - STRIPE_LIST_INVOICES
    max_calls: 4

  - step: draft
    id: follow_up
    prompt: "Draft a note using {{research}}"

output:
  type: email_draft
  approval: ask
`;

    const result = parsePlaybookV2Yaml(yaml);
    expect(result.validationErrors).toHaveLength(0);
    const agent = result.definition.steps?.[0];
    expect(agent?.step).toBe("agent");
    if (agent?.step === "agent") {
      expect(agent.tools).toEqual(["STRIPE_LIST_CHARGES", "STRIPE_LIST_INVOICES"]);
      expect(agent.max_calls).toBe(4);
    }
  });

  it("rejects an agent step whose tools are not in the definition allowlist", () => {
    const yaml = `
name: Collections Research
slug: collections-research
version: 1.0.0
description: Researches overdue accounts before drafting

section: billing
layer: act
voice: billing

trigger:
  type: signal
  signal: billing_due_date_passed

tools:
  - STRIPE_LIST_CHARGES

steps:
  - step: agent
    id: research
    prompt: Look things up.
    tools:
      - STRIPE_LIST_CHARGES
      - GMAIL_SEND_EMAIL

output:
  type: finding
  approval: ask
`;

    const result = parsePlaybookV2Yaml(yaml);
    expect(
      result.validationErrors.some(
        (e) => e.path === "tools" && e.message.includes("allowlist")
      )
    ).toBe(true);
  });

  it("rejects a memory-mutating tool in an agent step allowlist", () => {
    const yaml = `
name: Sneaky Agent
slug: sneaky-agent
version: 1.0.0
description: Tries to write Memory from an agent step

section: billing
layer: act
voice: billing

trigger:
  type: signal
  signal: billing_due_date_passed

tools:
  - memory_create_person

steps:
  - step: agent
    id: research
    prompt: Look things up.
    tools:
      - memory_create_person

output:
  type: finding
  approval: ask
`;

    const result = parsePlaybookV2Yaml(yaml);
    expect(
      result.validationErrors.some((e) =>
        e.message.includes("Memory-mutating tools are not allowed")
      )
    ).toBe(true);
  });

  it("rejects agent max_calls above the ceiling", () => {
    const yaml = `
name: Collections Research
slug: collections-research
version: 1.0.0
description: Researches overdue accounts before drafting

section: billing
layer: act
voice: billing

trigger:
  type: signal
  signal: billing_due_date_passed

tools:
  - STRIPE_LIST_CHARGES

steps:
  - step: agent
    id: research
    prompt: Look things up.
    tools:
      - STRIPE_LIST_CHARGES
    max_calls: 50

output:
  type: finding
  approval: ask
`;

    const result = parsePlaybookV2Yaml(yaml);
    expect(result.validationErrors.length).toBeGreaterThan(0);
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

  describe("section signal affinity", () => {
    const crossSectionYaml = `
name: Billing Watches People
slug: billing-watches-people
version: 1.0.0
description: Billing-section play triggered by a Relationships signal
section: billing
layer: act
voice: billing
trigger:
  type: signal
  signal: person_created
steps:
  - step: draft
    id: note
    prompt: Note the new person for billing follow-up.
output:
  type: notification
  approval: auto
`;

    it("is a fatal error by default (repo authoring stays strict)", () => {
      const result = parsePlaybookV2Yaml(crossSectionYaml);
      expect(
        result.validationErrors.some(
          (e) =>
            e.path === "trigger.signal" &&
            e.message.includes("not typically used by the Billing section")
        )
      ).toBe(true);
    });

    it("becomes a non-fatal warning with sectionSignalAffinity: warning", () => {
      const result = parsePlaybookV2Yaml(crossSectionYaml, {
        sectionSignalAffinity: "warning",
      });
      expect(result.validationErrors).toHaveLength(0);
      expect(result.definition).not.toBeNull();
      expect(
        result.validationWarnings?.some(
          (w) =>
            w.path === "trigger.signal" &&
            w.message.includes("not typically used by the Billing section")
        )
      ).toBe(true);
    });

    it("validatePlaybookV2 (fork save path) accepts cross-section signals", () => {
      const parsed = parsePlaybookV2Yaml(crossSectionYaml, {
        sectionSignalAffinity: "warning",
      });
      const validation = validatePlaybookV2(parsed.definition);
      expect(validation.valid).toBe(true);
    });

    it("validatePlaybookV2 still rejects unknown signals", () => {
      const parsed = parsePlaybookV2Yaml(crossSectionYaml, {
        sectionSignalAffinity: "warning",
      });
      const validation = validatePlaybookV2({
        ...parsed.definition,
        trigger: { type: "signal", signal: "not_a_real_signal" },
      });
      expect(validation.valid).toBe(false);
      expect(
        validation.errors.some((e) => e.message.includes("Unknown signal"))
      ).toBe(true);
    });
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
name: Test Learn Playbook
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

describe("settings + trigger adjustments", () => {
  const baseYaml = `
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
  adjust:
    - grace_days

settings:
  grace_days:
    type: number
    label: "Wait {value} days after the due date"
    default: 0

steps:
  - step: draft
    id: reminder_email
    prompt: "Draft a reminder after {{settings.grace_days}} days."
    max_tokens: 200

output:
  type: email_draft
  approval: ask
`;

  it("parses a settings block and trigger adjust keys", () => {
    const result = parsePlaybookV2Yaml(baseYaml);

    expect(result.validationErrors).toHaveLength(0);
    expect(result.definition.settings?.grace_days).toEqual({
      type: "number",
      label: "Wait {value} days after the due date",
      default: 0,
    });
    const trigger = result.definition.trigger;
    expect(trigger?.type === "signal" && trigger.adjust).toEqual(["grace_days"]);
  });

  it("rejects an adjust key that is not a declared setting", () => {
    const yaml = baseYaml.replace("- grace_days\n\nsettings:", "- bogus_key\n\nsettings:");
    const result = parsePlaybookV2Yaml(yaml);

    expect(result.validationErrors.length).toBeGreaterThan(0);
    expect(
      result.validationErrors.some((e) =>
        e.message.includes("adjust")
      )
    ).toBe(true);
  });

  it("rejects a settings field with an invalid type", () => {
    const yaml = baseYaml.replace("type: number", "type: slider");
    const result = parsePlaybookV2Yaml(yaml);

    expect(result.validationErrors.length).toBeGreaterThan(0);
  });

  it("round-trips a workspace value override through validation", () => {
    const yaml = baseYaml.replace(
      "    default: 0\n",
      "    default: 0\n    value: 3\n"
    );
    const result = parsePlaybookV2Yaml(yaml);

    expect(result.validationErrors).toHaveLength(0);
    expect(result.definition.settings?.grace_days?.value).toBe(3);
  });
});

describe("record_condition triggers (Phase 5)", () => {
  const baseYaml = `
name: Stale Client Nudge
slug: stale-client-nudge
version: 1.0.0
description: Nudges when a client goes quiet

section: relationships
layer: act
voice: follow-up

trigger:
  type: record_condition
  entity: person
  field: relationshipType
  op: eq
  value: client

steps:
  - step: draft
    id: nudge
    prompt: "Draft a check-in."
    max_tokens: 200

output:
  type: email_draft
  approval: ask
`;

  it("parses a valid record_condition trigger", () => {
    const result = parsePlaybookV2Yaml(baseYaml);

    expect(result.validationErrors).toHaveLength(0);
    const trigger = result.definition.trigger;
    expect(
      trigger?.type === "record_condition" && {
        entity: trigger.entity,
        field: trigger.field,
        op: trigger.op,
        value: trigger.value,
      }
    ).toEqual({
      entity: "person",
      field: "relationshipType",
      op: "eq",
      value: "client",
    });
  });

  it("rejects an unknown operator", () => {
    const yaml = baseYaml.replace("op: eq", "op: vibes");
    const result = parsePlaybookV2Yaml(yaml);

    expect(result.validationErrors.length).toBeGreaterThan(0);
  });

  it("rejects an unknown entity", () => {
    const yaml = baseYaml.replace("entity: person", "entity: toaster");
    const result = parsePlaybookV2Yaml(yaml);

    expect(result.validationErrors.length).toBeGreaterThan(0);
  });

  it("rejects a field the registry does not know for the entity", () => {
    const yaml = baseYaml.replace("field: relationshipType", "field: favoriteColor");
    const result = parsePlaybookV2Yaml(yaml);

    expect(
      result.validationErrors.some(
        (e) => e.path.startsWith("trigger") && e.message.includes("favoriteColor")
      )
    ).toBe(true);
  });

  it("rejects a field that belongs to a different entity", () => {
    // dueAt is a billing field, not a person field.
    const yaml = baseYaml.replace("field: relationshipType", "field: dueAt");
    const result = parsePlaybookV2Yaml(yaml);

    expect(
      result.validationErrors.some((e) => e.message.includes("dueAt"))
    ).toBe(true);
  });

  it("accepts every entity in the vocabulary", () => {
    for (const [entity, field] of [
      ["billing", "status"],
      ["work", "status"],
      ["person", "relationshipType"],
      ["org", "relationshipType"],
    ] as const) {
      const yaml = baseYaml
        .replace("entity: person", `entity: ${entity}`)
        .replace("field: relationshipType", `field: ${field}`);
      const result = parsePlaybookV2Yaml(yaml);
      expect(result.validationErrors).toHaveLength(0);
    }
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
    expect(sections.map((s) => s.slug)).toContain("communication");
    expect(sections.map((s) => s.slug)).not.toContain("convos");
    expect(sections.map((s) => s.slug)).not.toContain("_meta");
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
  it("maps known slugs to sections", () => {
    expect(inferSectionFromSlug("billing-records")).toBe("billing");
    expect(inferSectionFromSlug("people-records")).toBe("relationships");
    expect(inferSectionFromSlug("invoice-chase")).toBe("billing");
    expect(inferSectionFromSlug("daily-briefing")).toBe("me");
    expect(inferSectionFromSlug("unknown-slug")).toBeNull();
  });
});

describe("mapV1LayerToV2", () => {
  it("maps v1 kind to v2 layer", () => {
    expect(mapV1LayerToV2("profile")).toBe("learn");
    expect(mapV1LayerToV2("acting")).toBe("act");
  });
});
