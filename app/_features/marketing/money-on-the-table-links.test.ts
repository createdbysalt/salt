import { describe, expect, it } from "vitest";
import {
  MONEY_ON_THE_TABLE_FOOTER_LABEL,
  MONEY_ON_THE_TABLE_SECONDARY_CTA,
  normalizeMoneyOnTheTableLink,
} from "./money-on-the-table-links";

describe("normalizeMoneyOnTheTableLink", () => {
  it("renames the footer explore link", () => {
    expect(
      normalizeMoneyOnTheTableLink({
        text: "Money-on-the-table test",
        linkType: "internal",
        href: "/money-on-the-table",
      }).text
    ).toBe(MONEY_ON_THE_TABLE_FOOTER_LABEL);
  });

  it("renames secondary CTA copy from test to quiz", () => {
    expect(
      normalizeMoneyOnTheTableLink({
        text: "Take the 2-minute test",
        linkType: "internal",
        href: "/money-on-the-table?source=homepage-waitlist-cta",
      }).text
    ).toBe(MONEY_ON_THE_TABLE_SECONDARY_CTA);
  });
});
