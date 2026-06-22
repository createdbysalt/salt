import { describe, expect, it } from "vitest";
import {
  aggregateLearningSignals,
  synthesizePlaybookProposal,
} from "./synthesize-proposal";
import type { PlayDefinition } from "../../utils/play-definition";

const definition: PlayDefinition = {
  version: 1,
  steps: [
    { kind: "guard", path: "thread.days_since_reply", op: "gte", value: 14 },
    { kind: "render", template: "Hi", bind: "body" },
  ],
};

describe("synthesizePlaybookProposal", () => {
  it("returns null when there are no meaningful signals", () => {
    const result = synthesizePlaybookProposal({
      blueprint_slug: "quiet-lead-nudge",
      from_version: 1,
      procedure_md: "Procedure",
      definition,
      required_actions: [],
      signals: [],
      evals: [],
    });

    expect(result).toBeNull();
  });

  it("proposes when edit signals exceed threshold", () => {
    const result = synthesizePlaybookProposal({
      blueprint_slug: "quiet-lead-nudge",
      from_version: 1,
      procedure_md: "Procedure",
      definition,
      required_actions: [],
      signals: aggregateLearningSignals([
        { signal_type: "edited", delta: { new_length: 120 } },
        { signal_type: "edited", delta: { new_length: 90 } },
        { signal_type: "edited", delta: { new_length: 110 } },
      ]),
      evals: [],
    });

    expect(result?.rationale).toMatch(/edited/i);
    expect(result?.proposed_procedure_md).toMatch(/Learned preference/);
  });
});
