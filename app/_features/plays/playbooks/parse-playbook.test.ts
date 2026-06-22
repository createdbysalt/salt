import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parsePlaybookMarkdown } from "./parse-playbook";
import { discoverPlaybookDirs, readPlaybookSource } from "./discover-playbooks";

describe("parsePlaybookMarkdown", () => {
  it("parses reference quiet-lead-nudge playbook", () => {
    const root = path.join(process.cwd(), "app/_features/plays/playbooks/quiet-lead-nudge/playbook.md");
    const parsed = parsePlaybookMarkdown(fs.readFileSync(root, "utf8"), root);

    expect(parsed.frontmatter.slug).toBe("quiet-lead-nudge");
    expect(parsed.frontmatter.player_slug).toBe("follow-up");
    expect(parsed.frontmatter.kind).toBe("acting");
    expect(parsed.definition.steps.length).toBeGreaterThan(0);
    expect(parsed.required_actions).toContain("GMAIL_CREATE_EMAIL_DRAFT");
    expect(parsed.procedure_md).toMatch(/What this does/);
  });

  it("parses people-profile playbook", () => {
    const root = path.join(process.cwd(), "app/_features/plays/playbooks/people-profile/playbook.md");
    const parsed = parsePlaybookMarkdown(fs.readFileSync(root, "utf8"), root);

    expect(parsed.frontmatter.slug).toBe("people-profile");
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
});
