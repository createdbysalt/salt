import { describe, expect, it } from "vitest";
import { parsePlaybookMarkdown, deriveToolkitSlugsFromActions } from "./parse-playbook";
import { discoverPlaybookDirs, readPlaybookSource } from "./discover-playbooks";
import { MEMORY_MUTATING_SLUGS } from "./memory-monopoly";

describe("parsePlaybookMarkdown", () => {
  it("parses a profile playbook with fill rules", () => {
    const source = `---
slug: memory-records
name: Memory Records
kind: profile
player_slug: keeper
description: Unified memory intake
when_to_use: Always on
---

## What this does
Keeps Memory up to date.

## When it runs
On entity changes and captures.

## How it works
Accumulates evidence and applies updates.

## What you approve
New records and field updates.

\`\`\`json
{
  "version": 1,
  "fields": ["relationship_type"],
  "rules": [
    {
      "id": "person-payment-client",
      "field": "relationship_type",
      "when": {
        "signal": "has_payment_received",
        "op": "eq",
        "value": true
      },
      "set": {
        "value": "client"
      },
      "confidence": 90,
      "because": "Payment received"
    }
  ]
}
\`\`\`
`;
    const parsed = parsePlaybookMarkdown(source, "memory-records/playbook.md");

    expect(parsed.frontmatter.slug).toBe("memory-records");
    expect(parsed.frontmatter.kind).toBe("profile");
    expect(parsed.frontmatter.player_slug).toBe("keeper");
    expect(parsed.fill_rules?.rules.length).toBeGreaterThan(0);
  });

  it("parses all discovered playbooks", () => {
    for (const item of discoverPlaybookDirs()) {
      const parsed = parsePlaybookMarkdown(readPlaybookSource(item.playbookPath), item.playbookPath);
      expect(parsed.frontmatter.slug).toBe(item.slug);
    }
  });

  describe("memory-monopoly enforcement", () => {
    const makePlaybook = (playerSlug: string, actTool: string) => `---
slug: test-playbook
name: Test Playbook
kind: acting
player_slug: ${playerSlug}
description: Test
when_to_use: Testing
---

## What this does
Test

## When it runs
Manual

## How it works
Test

## What you approve
Test

\`\`\`json
{
  "version": 1,
  "steps": [
    { "kind": "act", "tool": "${actTool}", "params": {} }
  ]
}
\`\`\`
`;

    it("rejects non-keeper playbook with memory-mutating slug before policy validation", () => {
      for (const slug of MEMORY_MUTATING_SLUGS.slice(0, 3)) {
        expect(() => parsePlaybookMarkdown(makePlaybook("follow-up", slug), "test.md"))
          .toThrow(/memory-monopoly violation/);
      }
    });

    it("allows non-keeper playbook with non-memory slug (policy check follows)", () => {
      expect(() => parsePlaybookMarkdown(makePlaybook("follow-up", "GMAIL_CREATE_EMAIL_DRAFT"), "test.md"))
        .not.toThrow();
    });
  });

  describe("required_toolkits derivation", () => {
    it("extracts toolkit slugs from action slugs", () => {
      const result = deriveToolkitSlugsFromActions([
        "GMAIL_SEND_EMAIL",
        "GMAIL_CREATE_EMAIL_DRAFT",
        "stripe_create_invoice",
        "GOOGLECALENDAR_CREATE_EVENT",
      ]);
      expect(result).toEqual(["gmail", "googlecalendar", "stripe"]);
    });

    it("skips capability-based actions", () => {
      const result = deriveToolkitSlugsFromActions([
        "capability:email.send",
        "GMAIL_SEND_EMAIL",
        "capability:calendar.create_event",
      ]);
      expect(result).toEqual(["gmail"]);
    });

    it("skips system plays without underscore", () => {
      const result = deriveToolkitSlugsFromActions([
        "memory_create_person",
        "system-play-name",
        "send_message",
      ]);
      expect(result).toEqual(["memory", "send"]);
    });

    it("returns empty array for no actions", () => {
      expect(deriveToolkitSlugsFromActions([])).toEqual([]);
    });

    it("deduplicates toolkit slugs", () => {
      const result = deriveToolkitSlugsFromActions([
        "gmail_send_email",
        "gmail_create_draft",
        "gmail_list_messages",
      ]);
      expect(result).toEqual(["gmail"]);
    });
  });
});
