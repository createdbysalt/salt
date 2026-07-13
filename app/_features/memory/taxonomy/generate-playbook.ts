/**
 * Playbook Generator
 *
 * Generates PLAYBOOK.md and definition.yaml from the field-registry.ts
 * This ensures a single source of truth for all field definitions and fill rules.
 *
 * Usage: pnpm generate:playbooks
 */

import { writeFileSync } from "fs";
import { join } from "path";
import {
  PERSON_FIELDS,
  ORG_FIELDS,
  WORK_FIELDS,
  BILLING_FIELDS,
  FILE_FIELDS,
  MEETING_FIELDS,
  ME_IDENTITY_FIELDS,
  ME_BUSINESS_FIELDS,
  type FieldDescriptor,
  type FillRule,
  getWritePolicy,
} from "./field-registry";
import { SIGNALS, type SignalId } from "./signal-registry";

const PLAYBOOK_DIR = join(
  process.cwd(),
  "app/_features/plays/playbooks/v2/_meta/memory-records"
);

// ============================================================================
// VALIDATION
// ============================================================================

interface ValidationError {
  field: string;
  entity: string;
  issue: string;
}

function validateRegistry(): ValidationError[] {
  const errors: ValidationError[] = [];
  const signalIds = new Set(SIGNALS.map((s) => s.id));

  const allFields = [
    ...PERSON_FIELDS,
    ...ORG_FIELDS,
    ...WORK_FIELDS,
    ...BILLING_FIELDS,
    ...FILE_FIELDS,
    ...MEETING_FIELDS,
    ...ME_IDENTITY_FIELDS,
    ...ME_BUSINESS_FIELDS,
  ];

  for (const field of allFields) {
    const policy = getWritePolicy(field);

    // Check fill rules reference valid signals
    if (field.fillRules) {
      for (const rule of field.fillRules) {
        if (!signalIds.has(rule.signal)) {
          errors.push({
            field: field.key,
            entity: field.entityType,
            issue: `Fill rule references unknown signal: ${rule.signal}`,
          });
        }
        if (rule.confidence < 0 || rule.confidence > 100) {
          errors.push({
            field: field.key,
            entity: field.entityType,
            issue: `Confidence must be 0-100, got ${rule.confidence}`,
          });
        }
      }
    }

    // Warn if keeper_auto field has no fill rules
    if (policy === "keeper_auto" && !field.fillRules?.length && !field.isReadonly) {
      errors.push({
        field: field.key,
        entity: field.entityType,
        issue: `keeper_auto field has no fill rules`,
      });
    }
  }

  return errors;
}

// ============================================================================
// GENERATORS
// ============================================================================

function countFillRules(fields: FieldDescriptor[]): number {
  return fields.reduce((sum, f) => sum + (f.fillRules?.length || 0), 0);
}

function generateDefinitionYaml(): string {
  const allFields = [
    { name: "People", fields: PERSON_FIELDS },
    { name: "Organizations", fields: ORG_FIELDS },
    { name: "Work", fields: WORK_FIELDS },
    { name: "Billing", fields: BILLING_FIELDS },
    { name: "Files", fields: FILE_FIELDS },
    { name: "Meetings", fields: MEETING_FIELDS },
    { name: "Me Identity", fields: ME_IDENTITY_FIELDS },
    { name: "Me Business", fields: ME_BUSINESS_FIELDS },
  ];

  const totalFields = allFields.reduce((sum, g) => sum + g.fields.length, 0);
  const totalRules = allFields.reduce((sum, g) => sum + countFillRules(g.fields), 0);

  let yaml = `# Memory Records - GENERATED FILE
# DO NOT EDIT - Generated from field-registry.ts
# Run: pnpm generate:playbooks

name: Memory Records
slug: memory-records
version: 2.0.0
description: Salt keeps your records complete and accurate by learning from your connected accounts.

section: _meta
layer: learn

trigger:
  type: signal
  signal: entity_learning_extracted

requirements:
  categories:
    optional: [email, calendar, billing, crm, documents]

output:
  type: memory_update
  approval: per_entity

value:
  kind: record_maintenance
  estimate: 5

# ═══════════════════════════════════════════════════════════════════════════════
# POLICY - Generated from field-registry.ts
# Total: ${totalFields} fields, ${totalRules} fill rules, ${SIGNALS.length} signals
# ═══════════════════════════════════════════════════════════════════════════════

policy:
  auto_apply_threshold: 85

  procedure: |
    When a learning signal arrives for an entity:
    1. Load the current facts using memoryGetFacts
    2. Match the signal against fill_rules below
    3. For matching rules, call memoryUpdateField with the rule's value and confidence
    4. The tool handles threshold checking — you just provide the confidence

    Generated from field-registry.ts with ${totalRules} fill rules across ${totalFields} fields.

  # ─────────────────────────────────────────────────────────────────────────────
  # SIGNALS (${SIGNALS.length} total)
  # ─────────────────────────────────────────────────────────────────────────────
  signals:
`;

  for (const signal of SIGNALS) {
    yaml += `    - ${signal.id}\n`;
  }

  yaml += `
  # ─────────────────────────────────────────────────────────────────────────────
  # FIELDS (${totalFields} total)
  # ─────────────────────────────────────────────────────────────────────────────
  fields:
`;

  for (const group of allFields) {
    yaml += `    # ${group.name} (${group.fields.length} fields)\n`;
    for (const field of group.fields) {
      if (!field.isReadonly) {
        yaml += `    - ${field.key}\n`;
      }
    }
    yaml += "\n";
  }

  yaml += `  # ─────────────────────────────────────────────────────────────────────────────
  # FILL RULES (${totalRules} total)
  # ─────────────────────────────────────────────────────────────────────────────
  fill_rules:
`;

  for (const group of allFields) {
    const groupRules: Array<{ field: FieldDescriptor; rule: FillRule }> = [];
    for (const field of group.fields) {
      for (const rule of field.fillRules || []) {
        groupRules.push({ field, rule });
      }
    }

    if (groupRules.length > 0) {
      yaml += `    # ${group.name}\n`;
      for (const { field, rule } of groupRules) {
        yaml += `    - id: ${field.entityType}-${field.key}-${rule.signal.replace(/_/g, "-")}\n`;
        yaml += `      field: ${field.key}\n`;
        yaml += `      when:\n`;
        yaml += `        signal: ${rule.signal}\n`;
        yaml += `        op: ${rule.op || "eq"}\n`;
        yaml += `        value: ${rule.opValue !== undefined ? rule.opValue : true}\n`;
        yaml += `      set:\n`;
        yaml += `        value: "${rule.value}"\n`;
        yaml += `      confidence: ${rule.confidence}\n`;
        yaml += `      because: ${rule.because}\n\n`;
      }
    }
  }

  return yaml;
}

function generatePlaybookMd(): string {
  const allFields = [
    { name: "People", fields: PERSON_FIELDS },
    { name: "Organizations", fields: ORG_FIELDS },
    { name: "Work", fields: WORK_FIELDS },
    { name: "Billing", fields: BILLING_FIELDS },
    { name: "Files", fields: FILE_FIELDS },
    { name: "Meetings", fields: MEETING_FIELDS },
    { name: "Me Identity", fields: ME_IDENTITY_FIELDS },
    { name: "Me Business", fields: ME_BUSINESS_FIELDS },
  ];

  const totalFields = allFields.reduce((sum, g) => sum + g.fields.filter(f => !f.isReadonly).length, 0);
  const totalRules = allFields.reduce((sum, g) => sum + countFillRules(g.fields), 0);

  let md = `---
# GENERATED FILE - DO NOT EDIT
# Run: pnpm generate:playbooks
name: Memory Records
slug: memory-records
version: 2.0.0
description: Keep Memory records complete and accurate by learning from connected accounts.
---

# Memory Records

You keep Memory records complete and accurate by learning from connected accounts.

**Source of truth**: \`app/_features/memory/taxonomy/field-registry.ts\`

## Summary

- **${totalFields} fields** across 8 entity types
- **${totalRules} fill rules** with confidence scores
- **${SIGNALS.length} signals** that trigger updates

## How It Works

When a signal arrives (new person, payment received, meeting completed), you:

1. Load the current facts for the entity using \`memoryGetFacts\`
2. Check the field's \`fillRules\` array for matching signals
3. Call \`memoryUpdateField\` with the matched value and confidence
4. The tool handles threshold checking — you just provide the confidence

## Confidence Thresholds

\`\`\`
You call: memoryUpdateField(person, abc123, "relationship_type", "client", 95, "Payment received")
    ↓
Tool checks: Is 95 >= workspace threshold (85)?
    ↓
Yes → Applied to Memory, returns { action: "applied" }
No  → Evidence accumulated, returns { action: "accumulated" }
\`\`\`

## Entity Types (${totalFields} fields)

`;

  for (const group of allFields) {
    const writableFields = group.fields.filter(f => !f.isReadonly);
    const ruleCount = countFillRules(group.fields);
    md += `### ${group.name} (${writableFields.length} fields, ${ruleCount} rules)\n\n`;

    if (writableFields.length > 0) {
      md += `| Field | Type | Fill Rules | Write Policy |\n`;
      md += `|-------|------|------------|-------------|\n`;
      for (const field of writableFields) {
        const policy = getWritePolicy(field);
        const ruleCount = field.fillRules?.length || 0;
        md += `| ${field.key} | ${field.fieldType} | ${ruleCount} | ${policy} |\n`;
      }
      md += "\n";
    }
  }

  md += `## Signals (${SIGNALS.length})

Signals are extracted from connected accounts and trigger field updates.

| Signal | Entity Types | Sources |
|--------|--------------|---------|
`;

  for (const signal of SIGNALS.slice(0, 20)) {
    md += `| ${signal.id} | ${signal.entityTypes.join(", ")} | ${signal.sources.join(", ")} |\n`;
  }

  if (SIGNALS.length > 20) {
    md += `| ... | ... | ... |\n`;
    md += `\n*${SIGNALS.length - 20} more signals — see signal-registry.ts*\n`;
  }

  md += `
## Fill Rules Reference

Each field can have multiple fill rules. When a signal matches, the rule's value and confidence are used.

Example from \`field-registry.ts\`:

\`\`\`typescript
{
  key: "relationshipType",
  entityType: "person",
  fillRules: [
    { signal: "has_payment_received", value: "client", confidence: 95, because: "They paid you" },
    { signal: "has_invoice_sent", value: "client", confidence: 90, because: "You invoiced them" },
    { signal: "email_domain_matches_workspace", value: "team", confidence: 92, because: "Same domain" },
  ],
}
\`\`\`

## References

- \`field-registry.ts\` — Single source of truth for all fields and fill rules
- \`signal-registry.ts\` — All signals with descriptions and sources
- \`tools.yaml\` — Memory tools (\`memoryUpdateField\`, \`memoryGetFacts\`, etc.)
`;

  return md;
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  console.log("Generating playbook from field-registry.ts...\n");

  // Validate
  const errors = validateRegistry();
  if (errors.length > 0) {
    console.error("Validation errors:");
    for (const error of errors) {
      console.error(`  ${error.entity}.${error.field}: ${error.issue}`);
    }
    console.error(`\n${errors.length} error(s) found.`);
    // Don't fail on warnings for keeper_auto without rules
    const criticalErrors = errors.filter(e => !e.issue.includes("keeper_auto"));
    if (criticalErrors.length > 0) {
      process.exit(1);
    }
    console.log("(Continuing with warnings...)\n");
  }

  // Generate
  const definitionYaml = generateDefinitionYaml();
  const playbookMd = generatePlaybookMd();

  // Write
  writeFileSync(join(PLAYBOOK_DIR, "definition.yaml"), definitionYaml);
  console.log(`✓ Generated definition.yaml`);

  writeFileSync(join(PLAYBOOK_DIR, "PLAYBOOK.md"), playbookMd);
  console.log(`✓ Generated PLAYBOOK.md`);

  // Summary
  const allFields = [
    ...PERSON_FIELDS,
    ...ORG_FIELDS,
    ...WORK_FIELDS,
    ...BILLING_FIELDS,
    ...FILE_FIELDS,
    ...MEETING_FIELDS,
    ...ME_IDENTITY_FIELDS,
    ...ME_BUSINESS_FIELDS,
  ];
  const totalRules = allFields.reduce((sum, f) => sum + (f.fillRules?.length || 0), 0);

  console.log(`\nSummary:`);
  console.log(`  Fields: ${allFields.filter(f => !f.isReadonly).length}`);
  console.log(`  Fill rules: ${totalRules}`);
  console.log(`  Signals: ${SIGNALS.length}`);
}

main();
