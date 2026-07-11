import { describe, expect, it } from "vitest";
import {
  buildAskSaltPlaybookIndexBlock,
  type AskSaltPlaybook,
} from "./playbook-index";

function playbook(overrides: Partial<AskSaltPlaybook> = {}): AskSaltPlaybook {
  return {
    templateId: "tpl-1",
    slug: "reengage-quiet-clients",
    name: "Re-engage quiet clients",
    description: "Email clients who have gone quiet.",
    whenToUse: "a client has not replied in 30 days",
    requiredActions: ["GMAIL_CREATE_EMAIL_DRAFT"],
    playerSlug: "concierge",
    ...overrides,
  };
}

describe("buildAskSaltPlaybookIndexBlock", () => {
  it("renders nothing when no playbooks are adopted", () => {
    expect(buildAskSaltPlaybookIndexBlock([])).toBe("");
  });

  it("lists each playbook with slug, when-to-use, and required apps", () => {
    const block = buildAskSaltPlaybookIndexBlock([playbook()]);

    expect(block).toContain("Adopted playbooks");
    expect(block).toContain("Re-engage quiet clients [slug: reengage-quiet-clients]");
    expect(block).toContain("use when: a client has not replied in 30 days");
    expect(block).toContain("uses: GMAIL_CREATE_EMAIL_DRAFT");
  });

  it("instructs the model to load before acting and to queue via propose_play", () => {
    const block = buildAskSaltPlaybookIndexBlock([playbook()]);

    expect(block).toContain("load_playbook");
    expect(block).toContain("propose_play");
    expect(block).toMatch(/do not improvise/i);
  });

  it("omits optional annotations gracefully", () => {
    const block = buildAskSaltPlaybookIndexBlock([
      playbook({ whenToUse: null, requiredActions: [] }),
    ]);

    expect(block).toContain("[slug: reengage-quiet-clients]");
    expect(block).not.toContain("use when:");
    expect(block).not.toContain("uses:");
  });
});
