#!/usr/bin/env tsx
/**
 * Scaffold a new v2 playbook package with the full contract:
 *
 *   app/_features/plays/playbooks/v2/<section>/<slug>/
 *   ├── definition.yaml   — the definition (schema-validated)
 *   ├── PLAYBOOK.md       — author doc (intent, decisions, edge cases)
 *   └── evals/
 *       └── smoke.yaml    — starter scenario for the shared eval runner
 *
 * Usage: pnpm playbooks:new <section> <slug>
 * Read v2/AUTHORING.md before filling the files in.
 */

import fs from "node:fs";
import path from "node:path";

const V2_ROOT = path.join(process.cwd(), "app/_features/plays/playbooks/v2");

const SECTIONS = [
  "relationships",
  "work",
  "billing",
  "resources",
  "meetings",
  "me",
  "connections",
  "notes",
  "communication",
] as const;

const DEFINITION_TEMPLATE = `# {{name}}
# <one line: what it does for the owner, and the outcome it produces>

name: {{name}}
slug: {{slug}}
version: 1.0.0
description: <plain-language description — shown on the play card>

section: {{section}}
layer: act
voice: {{section}}

# Pick one trigger kind. Record conditions validate against the Memory field
# registry; signals validate against the signal registry.
trigger:
  type: manual

# User-tunable knobs, referenced as {{settings.key}} in prompts and rules.
# List keys the trigger section should render under trigger.adjust.
# settings:
#   threshold_days:
#     type: number
#     label: "Wait {value} days"
#     default: 7

# App categories the play needs (schema-validated). The Overview tab renders
# these as "What it needs" with per-app toggles.
requirements:
  categories:
    required:
      - billing

# Single-document canon: every tool the play can reach. Slugs must exist in
# app/_lib/composio/tool-slugs.ts.
tools:
  - STRIPE_LIST_INVOICES

steps:
  - step: fetch
    id: example_fetch
    from: billing.read_invoices
    approval: auto

  - step: draft
    id: example_draft
    prompt: |
      Summarize what you found in {{example_fetch}} for the owner.
    max_tokens: 300
    approval: auto

output:
  type: notification
  approval: ask

value:
  kind: time_saved
  estimate: 10

instructions:
  system: |
    <who the agent is, who it serves, what good looks like — the why, not a
    list of MUSTs>
  guidelines:
    - "<behavioral guidance in imperative voice>"
  avoid:
    - "<specific failure mode to steer away from>"
  examples:
    - label: "<scenario name>"
      content: "<input sketch → expected behavior>"
`;

const PLAYBOOK_MD_TEMPLATE = `# {{name}} — author notes

> Author-only doc. The user-facing Overview is generated from
> definition.yaml — keep the definition truthful and this file for context
> that doesn't belong in the product: intent, trade-offs, edge cases.

## Intent

<What problem does this play solve? Why does it exist?>

## Decisions

- <Non-obvious choice and its reasoning>

## Edge cases

- <Known near-miss: what should NOT fire, and how the play avoids it>

## Eval coverage

| Scenario | Near-miss? | What it locks in |
|----------|-----------|------------------|
| smoke    | no        | Happy path runs end to end |
`;

const EVAL_TEMPLATE = `# Starter scenario — run with: pnpm test (evals.runner.test.ts picks it up)
# given.memory  — fetchMemorySource payloads, keyed by memory capability
# given.fetch   — connector fetch data, keyed by fetch-step id
# given.agent   — agent-step answers in execution order
# given.draft   — draft-step texts in execution order
# expect.steps  — per-step status (branch children included)
id: smoke
name: Happy path runs end to end
given:
  fetch:
    example_fetch:
      - id: "example-1"
        name: "Example record"
  draft:
    - step: example_draft
      text: "Summary for the owner."
expect:
  status: success
  outputCount: 1
  steps:
    example_fetch: success
    example_draft: success
`;

function toTitleCase(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function usage(): never {
  console.error("Usage: pnpm playbooks:new <section> <slug>");
  console.error("");
  console.error(`Sections: ${SECTIONS.join(", ")}`);
  console.error("");
  console.error("Examples:");
  console.error("  pnpm playbooks:new billing invoice-follow-up");
  console.error("  pnpm playbooks:new relationships client-onboarding");
  process.exit(1);
}

function main() {
  const section = process.argv[2];
  const slug = process.argv[3];

  if (!section || !slug) {
    usage();
  }

  if (!(SECTIONS as readonly string[]).includes(section)) {
    console.error(`Invalid section: "${section}"`);
    console.error(`Sections: ${SECTIONS.join(", ")}`);
    process.exit(1);
  }

  if (!/^[a-z][a-z0-9-]*$/.test(slug)) {
    console.error(`Invalid slug: "${slug}"`);
    console.error("Slug must be lowercase, start with a letter, and contain only letters, numbers, and hyphens.");
    process.exit(1);
  }

  if (slug.startsWith("keeper-") || slug.startsWith("memory-")) {
    console.error(`Slug "${slug}" uses a prefix reserved for Memory Care capabilities.`);
    console.error("Memory Care is not playbook-based — see docs/architecture/memory-care.md.");
    process.exit(1);
  }

  const dir = path.join(V2_ROOT, section, slug);

  if (fs.existsSync(dir)) {
    console.error(`Directory already exists: ${dir}`);
    process.exit(1);
  }

  const name = toTitleCase(slug);
  const fill = (template: string) =>
    template
      .replace(/\{\{slug\}\}/g, slug)
      .replace(/\{\{name\}\}/g, name)
      .replace(/\{\{section\}\}/g, section);

  fs.mkdirSync(path.join(dir, "evals"), { recursive: true });
  fs.writeFileSync(path.join(dir, "definition.yaml"), fill(DEFINITION_TEMPLATE));
  fs.writeFileSync(path.join(dir, "PLAYBOOK.md"), fill(PLAYBOOK_MD_TEMPLATE));
  fs.writeFileSync(path.join(dir, "evals", "smoke.yaml"), fill(EVAL_TEMPLATE));

  console.log(`✓ Created ${section}/${slug}/`);
  console.log(`  - definition.yaml`);
  console.log(`  - PLAYBOOK.md`);
  console.log(`  - evals/smoke.yaml`);
  console.log("");
  console.log("Next steps:");
  console.log(`  1. Read app/_features/plays/playbooks/v2/AUTHORING.md`);
  console.log(`  2. Fill in ${dir}/definition.yaml`);
  console.log(`  3. Run: pnpm playbooks:validate`);
  console.log(`  4. Run: pnpm test -- evals.runner`);
}

main();
