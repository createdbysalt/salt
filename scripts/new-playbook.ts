#!/usr/bin/env tsx
/**
 * Scaffold a new playbook directory with starter files.
 *
 * Usage: pnpm playbooks:new <slug>
 */

import fs from "node:fs";
import path from "node:path";

const PLAYBOOKS_ROOT = path.join(process.cwd(), "app/_features/plays/playbooks");

const PLAYBOOK_TEMPLATE = `---
slug: {{slug}}
name: {{name}}
kind: acting
player_slug: follow-up
description: Brief description of what this playbook does.
when_to_use: |
  Describe when Salt should suggest this playbook.
  Include trigger conditions and context.
trigger:
  type: manual
consent:
  approval_required: true
---

## What this does

Explain the purpose and outcome of this playbook.

## When it runs

- Trigger condition 1
- Trigger condition 2

## How it works

1. First step explanation
2. Second step explanation
3. Final step explanation

## What you approve

Describe what the user is approving before execution.

\`\`\`json
{
  "version": 1,
  "steps": [
    {
      "kind": "fetch",
      "tool": "TOOL_SLUG_HERE",
      "params": {},
      "bind": "data"
    },
    {
      "kind": "guard",
      "path": "data.condition",
      "op": "eq",
      "value": true
    },
    {
      "kind": "render",
      "template": "Hello {{run.recipient_label}}",
      "bind": "body"
    },
    {
      "kind": "act",
      "tool": "TOOL_SLUG_HERE",
      "params": { "body": "{{body}}" }
    }
  ]
}
\`\`\`
`;

const EVALS_TEMPLATE = `{
  "playbook_slug": "{{slug}}",
  "evals": [
    {
      "id": "basic-execution",
      "name": "Executes under normal conditions",
      "input": {
        "run": {
          "title": "Test Run",
          "recipient_label": "Test User"
        }
      },
      "mocks": {
        "TOOL_SLUG_HERE": { "condition": true }
      },
      "assertions": [
        { "type": "bound_contains", "bind": "body", "substring": "Test User" },
        { "type": "act_executed", "tool": "TOOL_SLUG_HERE" }
      ]
    },
    {
      "id": "guard-skips",
      "name": "Skips when guard condition not met",
      "input": {
        "run": {
          "title": "Test Run",
          "recipient_label": "Test User"
        }
      },
      "mocks": {
        "TOOL_SLUG_HERE": { "condition": false }
      },
      "assertions": [
        { "type": "guard_skipped", "index": 1 }
      ]
    }
  ]
}
`;

function toTitleCase(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function usage(): never {
  console.error("Usage: pnpm playbooks:new <slug>");
  console.error("");
  console.error("Examples:");
  console.error("  pnpm playbooks:new client-onboarding");
  console.error("  pnpm playbooks:new invoice-follow-up");
  process.exit(1);
}

function main() {
  const slug = process.argv[2];

  if (!slug) {
    usage();
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

  const dir = path.join(PLAYBOOKS_ROOT, slug);

  if (fs.existsSync(dir)) {
    console.error(`Directory already exists: ${dir}`);
    process.exit(1);
  }

  const name = toTitleCase(slug);
  const playbookContent = PLAYBOOK_TEMPLATE.replace(/\{\{slug\}\}/g, slug).replace(/\{\{name\}\}/g, name);
  const evalsContent = EVALS_TEMPLATE.replace(/\{\{slug\}\}/g, slug);

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "playbook.md"), playbookContent);
  fs.writeFileSync(path.join(dir, "evals.json"), evalsContent);

  console.log(`✓ Created ${slug}/`);
  console.log(`  - playbook.md`);
  console.log(`  - evals.json`);
  console.log("");
  console.log("Next steps:");
  console.log(`  1. Edit ${dir}/playbook.md`);
  console.log(`  2. Update evals.json with real test cases`);
  console.log(`  3. Run: pnpm playbooks:compile`);
}

main();
