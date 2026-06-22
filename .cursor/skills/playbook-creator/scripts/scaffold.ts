#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";

const PLAYBOOK_ROOT = path.join(process.cwd(), "app/_features/plays/playbooks");
const PLAYER_SLUGS = ["follow-up", "brief", "client-risk", "scope", "billing", "keeper"] as const;
const KINDS = ["acting", "profile"] as const;

type PlaybookKind = (typeof KINDS)[number];
type PlayerSlug = (typeof PLAYER_SLUGS)[number];

function usage(): never {
  console.error("Usage: pnpm exec tsx .cursor/skills/playbook-creator/scripts/scaffold.ts <slug> --kind acting|profile --player <player_slug>");
  process.exit(1);
}

function readFlag(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function assertKind(value: string | null): PlaybookKind {
  if (value === "acting" || value === "profile") return value;
  usage();
}

function assertPlayer(value: string | null): PlayerSlug {
  if (value && PLAYER_SLUGS.includes(value as PlayerSlug)) return value as PlayerSlug;
  usage();
}

function actingJson(): string {
  return JSON.stringify(
    {
      version: 1,
      steps: [
        {
          kind: "llm",
          purpose: "draft_internal_output",
          modelSlot: "playPersonalize",
          instructions: "Draft the internal output for this playbook. Replace this with specific instructions.",
          inputs: ["run.title"],
          maxTokens: 300,
          bind: "draft",
        },
        {
          kind: "render",
          template: "{{draft}}",
          bind: "output",
        },
      ],
      value: { kind: "time_saved", amount: 10, currency: "USD" },
    },
    null,
    2,
  );
}

function profileJson(): string {
  return JSON.stringify(
    {
      version: 1,
      fields: ["relationship_type"],
      rules: [
        {
          id: "rel-example",
          field: "relationship_type",
          when: { signal: "has_invoice_sent", op: "eq", value: true },
          set: { value: "client" },
          confidence: 90,
          because: "You invoiced them",
        },
      ],
    },
    null,
    2,
  );
}

function playbookMarkdown(input: {
  slug: string;
  name: string;
  kind: PlaybookKind;
  player: PlayerSlug;
}): string {
  const json = input.kind === "profile" ? profileJson() : actingJson();
  const workspaceContext =
    input.kind === "profile"
      ? "\n## Workspace context\n\nDescribe the workspace facts this playbook needs, such as domains, vocabulary, or connected-system assumptions.\n"
      : "";

  return `---
slug: ${input.slug}
kind: ${input.kind}
name: ${input.name}
player_slug: ${input.player}
description: Replace with one sentence describing the playbook.
when_to_use: |
  Replace with the first trigger line.
  Replace with the second trigger line.
trigger:
  type: manual
consent:
  approval_required: false
---

# ${input.name}

## What this does

Replace with a plain-English description of the outcome.

## When it runs

- Replace with the primary trigger.
- Replace with an important near-trigger or boundary.

## How it works

1. **Read the inputs** - Replace with the facts Salt reads.
2. **Normalize the facts** - Replace with deterministic normalization.
3. **Decide** - Replace with decision order, model judgment, or rule evaluation.
4. **Handle confidence and conflicts** - Replace with auto-apply vs review policy.
5. **Record the result** - Replace with what Salt saves or prepares.

## What you approve

Replace with what applies automatically and what waits for review.
${workspaceContext}
\`\`\`json
${json}
\`\`\`
`;
}

function evalsJson(slug: string, kind: PlaybookKind): string {
  const evals =
    kind === "profile"
      ? [
          {
            id: "example-profile-case",
            name: "Example profile rule applies",
            input: {
              email: "client@example.com",
              signals: { has_invoice_sent: true },
              auto_apply_threshold: 85,
            },
            assertions: [
              { type: "field_value_eq", field: "relationship_type", expected: "client" },
            ],
          },
        ]
      : [
          {
            id: "example-acting-case",
            name: "Example acting play renders output",
            input: { run: { title: "Example run" } },
            assertions: [{ type: "bound_exists", bind: "output" }],
          },
        ];

  return `${JSON.stringify({ playbook_slug: slug, evals }, null, 2)}\n`;
}

function domainReference(name: string): string {
  return `# ${name} Domain Reference

## Entity

Replace with the record, workflow, or object this playbook owns.

## Fields It Can Read

- Replace with fields and sources.

## Fields It Can Write

- Replace with fields, allowed values, and review boundaries.

## Create vs Update Policy

- Create when...
- Update when...
- Skip when...
- Ask when...

## Admission Policy

- Qualifies as a durable record when...
- Does not qualify when...
- Waits for review when...
- Never create from...

## Entity Taxonomy

- Person:
- Organization:
- Team inbox or shared alias:
- System sender:
- Newsletter or marketing sender:
- Scam/spam/suspicious sender:
- Source artifact only:

## Identity Resolution And Dedupe

- Update existing record when...
- Create new record when...
- Suggest merge when...
- Never auto-merge when...

## Field Completion Matrix

| Section | Trusted sources | Auto-fill | Ask first | Never fill from |
|---------|-----------------|-----------|-----------|-----------------|
| Example | Example source | Example policy | Example boundary | Example exclusion |

## Signals

- Replace with signals and derivation.

## Context Budget

### Connected tools

- Required:
- Optional:
- Ignored:

### Memory scope

- Entity anchor:
- Memory surfaces: people, orgs, work, files, billing, conversations, meetings, teams, me
- Relation filters:
- Time window:
- Max records:
- Ranking:

### Operating surfaces

- Spaces:
- Connections:
- Visibility or approval boundary:
- Trigger scope:

### Time

- Trigger schedule/deadline/elapsed-time rule:
- Lookback/lookahead window:
- Timezone/business-day assumption:
- Recency or staleness rule:

### LLM context

- Facts passed:
- Facts excluded:
- Max input paths:

### Degradation

- If a required source is missing:
- If optional sources are missing:
- If too many records match:
- If evidence conflicts:

## Decision Order

1. Replace with the first decision.

## Negative Examples

- Replace with a case that should be skipped.
- Replace with a case that should become another entity type.
- Replace with a case that should wait for review.

## Confidence Policy

Replace with auto-apply vs review policy.

## Provenance

Replace with what Salt records.
`;
}

function main() {
  const slug = process.argv[2];
  if (!slug || slug.startsWith("--")) usage();

  const kind = assertKind(readFlag("--kind"));
  const player = assertPlayer(readFlag("--player"));
  const name = titleFromSlug(slug);
  const dir = path.join(PLAYBOOK_ROOT, slug);

  if (fs.existsSync(dir)) {
    console.error(`Refusing to overwrite existing playbook directory: ${dir}`);
    process.exit(1);
  }

  fs.mkdirSync(path.join(dir, "references"), { recursive: true });
  fs.mkdirSync(path.join(dir, "scripts"), { recursive: true });
  fs.mkdirSync(path.join(dir, "assets"), { recursive: true });
  fs.writeFileSync(path.join(dir, "playbook.md"), playbookMarkdown({ slug, name, kind, player }), "utf8");
  fs.writeFileSync(path.join(dir, "evals.json"), evalsJson(slug, kind), "utf8");
  fs.writeFileSync(path.join(dir, "references/domain.md"), domainReference(name), "utf8");

  console.log(`Created ${dir}`);
}

main();
