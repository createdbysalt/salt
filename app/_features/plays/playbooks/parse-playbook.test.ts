import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parsePlaybookMarkdown } from "./parse-playbook";
import { discoverPlaybookDirs, readPlaybookSource } from "./discover-playbooks";
import { MEMORY_MUTATING_SLUGS } from "./memory-monopoly";

describe("parsePlaybookMarkdown", () => {
  it("parses keeper-people-records playbook", () => {
    const root = path.join(process.cwd(), "app/_features/plays/playbooks/keeper-people-records/playbook.md");
    const parsed = parsePlaybookMarkdown(fs.readFileSync(root, "utf8"), root);

    expect(parsed.frontmatter.slug).toBe("keeper-people-records");
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
});
