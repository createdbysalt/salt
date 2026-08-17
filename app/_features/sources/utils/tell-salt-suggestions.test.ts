import { describe, expect, it } from "vitest";
import { CUSTOMIZE_AREA_ORDER } from "@/app/_features/capture/adapters/rule-entities";
import {
  RULE_SUGGESTIONS,
  suggestionsForArea,
} from "./tell-salt-suggestions";

describe("suggestionsForArea", () => {
  it("returns workspace suggestions when area is null", () => {
    expect(suggestionsForArea(null, [])).toEqual([
      ...RULE_SUGGESTIONS.workspace,
    ]);
  });

  it("every suggestion parses deterministically for its area", () => {
    for (const area of CUSTOMIZE_AREA_ORDER) {
      expect(
        suggestionsForArea(area, []),
        `area ${area} should have at least one parseable suggestion`,
      ).toEqual([...RULE_SUGGESTIONS[area]]);
    }
  });

  it("drops suggestions whose parsed key already exists as a rule", () => {
    // "*newsletter*" parses to sender_pattern *newsletter* on email.
    expect(suggestionsForArea("email", ["*newsletter*"])).toEqual([
      "subject:receipt",
      "@spammy-agency.com",
    ]);
  });

  it("matches existing keys case-insensitively", () => {
    // "subject:invoice" compiles to the glob *invoice*.
    expect(suggestionsForArea(null, ["*INVOICE*"])).toEqual([
      "*newsletter*",
      "@spammy-agency.com",
    ]);
  });

  it("returns an empty row when every suggestion is already a rule", () => {
    expect(suggestionsForArea("crm", ["sarah@acme.com"])).toEqual([]);
  });
});
