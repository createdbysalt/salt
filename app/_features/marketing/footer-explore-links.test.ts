import { describe, expect, it } from "vitest";
import { normalizeFooterExploreLinks } from "./footer-explore-links";

describe("normalizeFooterExploreLinks", () => {
  it("sorts Sanity footer nav into canonical explore order", () => {
    const links = normalizeFooterExploreLinks([
      { text: "Features", linkType: "internal", href: "#product" },
      { text: "Compare", linkType: "internal", href: "/compare" },
      {
        text: "Money On The Table Quiz",
        linkType: "internal",
        href: "/money-on-the-table",
      },
      {
        text: "Early access",
        linkType: "internal",
        href: "/waitlist?source=homepage-footer",
      },
    ]);

    expect(links.map((link) => link.text)).toEqual([
      "Blog",
      "Features",
      "Compare",
      "Early access",
      "Money On The Table Quiz",
    ]);
  });

  it("drops legacy Learn and sorts remaining links", () => {
    const links = normalizeFooterExploreLinks([
      { text: "Compare", linkType: "internal", href: "/compare" },
      { text: "Learn", linkType: "internal", href: "/learn" },
      { text: "Blog", linkType: "internal", href: "/blog" },
    ]);

    expect(links.map((link) => link.href)).toEqual(["/blog", "/compare"]);
  });
});
