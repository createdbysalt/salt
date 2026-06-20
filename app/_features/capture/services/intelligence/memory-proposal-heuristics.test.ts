import { describe, expect, it } from "vitest";
import {
  MANNA_HOUSE_TRAINING_EMAIL,
  SITE_STRATEGY_REVIEW_EMAIL,
} from "./fixtures/memory-plan-emails";
import { detectMemoryProposals } from "./memory-proposal-heuristics";

describe("detectMemoryProposals", () => {
  it("proposes meeting and org for Manna House training email", () => {
    const proposals = detectMemoryProposals(MANNA_HOUSE_TRAINING_EMAIL);

    expect(proposals.some((p) => p.surface === "meetings")).toBe(true);
    expect(proposals.some((p) => p.surface === "orgs" && p.hint.name === "Manna House")).toBe(
      true
    );
  });

  it("proposes work for site strategy review email", () => {
    const proposals = detectMemoryProposals(SITE_STRATEGY_REVIEW_EMAIL);

    expect(proposals.some((p) => p.surface === "work")).toBe(true);
    const work = proposals.find((p) => p.surface === "work");
    expect(work?.hint.name?.toLowerCase()).toContain("site strategy");
  });

  it("caps proposals at three per email", () => {
    const proposals = detectMemoryProposals({
      ...MANNA_HOUSE_TRAINING_EMAIL,
      subject: "Site strategy training session mannahouse ready for review",
      body_text:
        "Monthly training session. Site strategy ready for review. Deliverable attached.",
    });

    expect(proposals.length).toBeLessThanOrEqual(3);
  });
});
