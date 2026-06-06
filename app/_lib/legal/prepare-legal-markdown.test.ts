import { describe, expect, it } from "vitest";
import { prepareLegalMarkdown } from "./prepare-legal-markdown";

describe("prepareLegalMarkdown", () => {
  it("strips markdown title and last updated from service terms", () => {
    const input = `# Salt Service Terms

**Last updated:** June 6, 2026  
**Applies to:** https://app.usesalt.io

## 1. What Salt is

Body copy.`;

    const result = prepareLegalMarkdown(input, "Fallback");

    expect(result.title).toBe("Salt Service Terms");
    expect(result.lastUpdated).toBe("June 6, 2026");
    expect(result.appliesTo).toBe("https://app.usesalt.io");
    expect(result.body).toContain("## 1. What Salt is");
    expect(result.body).not.toContain("# Salt Service Terms");
  });

  it("parses Cooley website terms header", () => {
    const input = `Website Terms of Use
Version 1.0
Last revised on: June 6, 2026
The website located at https://usesalt.io/`;

    const result = prepareLegalMarkdown(input, "Website Terms of Use");

    expect(result.title).toBe("Website Terms of Use");
    expect(result.lastUpdated).toBe("June 6, 2026");
    expect(result.body).toContain("The website located at");
    expect(result.body).not.toContain("Version 1.0");
  });
});
