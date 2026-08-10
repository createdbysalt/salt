import { describe, expect, it } from "vitest";
import {
  buildAskSaltPlaybookIndexBlock,
  type AskSaltPlaybook,
} from "./playbook-index";

function playbook(overrides: Partial<AskSaltPlaybook> = {}): AskSaltPlaybook {
  return {
    slug: "reengage-quiet-clients",
    name: "Re-engage quiet clients",
    description: "Email clients who have gone quiet.",
    whenToUse: "a client has not replied in 30 days",
    requiredActions: ["GMAIL_CREATE_EMAIL_DRAFT"],
    voice: "concierge",
    ...overrides,
  };
}

describe("buildAskSaltPlaybookIndexBlock", () => {
  it("renders nothing when no playbooks are enabled", () => {
    expect(buildAskSaltPlaybookIndexBlock([])).toBe("");
  });

  it("lists each playbook with slug, when-to-use, and required apps", () => {
    const block = buildAskSaltPlaybookIndexBlock([playbook()]);

    expect(block).toContain("Enabled playbooks");
    expect(block).toContain("Re-engage quiet clients [slug: reengage-quiet-clients]");
    expect(block).toContain("use when: a client has not replied in 30 days");
    expect(block).toContain("uses: GMAIL_CREATE_EMAIL_DRAFT");
  });

  it("routes the model to load_playbook first and never mentions retired tools", () => {
    const block = buildAskSaltPlaybookIndexBlock([playbook()]);

    expect(block).toContain("load_playbook");
    expect(block).toContain("load_memory_intake");
    expect(block).not.toContain("propose_play");
    expect(block).not.toContain("adopt_playbook");
  });

  it("lists disabled playbooks as available with the enable marker", () => {
    const block = buildAskSaltPlaybookIndexBlock([], [playbook()]);

    expect(block).toContain("Available playbooks");
    expect(block).toContain("[enable]");
    expect(block).toContain("enable_playbook");
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
