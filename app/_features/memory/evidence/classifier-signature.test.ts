import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/app/_lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
// classifier imports the memory-care intake module for identifier
// canonicalization; stub it so this test stays free of DB dependencies.
vi.mock("@/app/_features/memory/care/intake", () => ({
  canonicalizeIdentifier: (value: string) => value.trim().toLowerCase(),
}));

import { parseEmailSignature, parseSignatureFromBody } from "./classifier";

describe("parseEmailSignature", () => {
  it("extracts company, title, and phone from a signature block", () => {
    const signature = [
      "Jordan Reyes",
      "Creative Director",
      "Lumen Studio Inc",
      "+1 (416) 555-0134",
      "jordan@lumenstudio.com",
    ].join("\n");

    const parsed = parseEmailSignature(signature);

    expect(parsed.title).toBe("Creative Director");
    expect(parsed.company).toBe("Lumen Studio Inc");
    expect(parsed.phone).toContain("416");
  });

  it("splits 'Title, Company' composite lines", () => {
    const parsed = parseEmailSignature("Founder, Brightpath Media");
    expect(parsed.title).toBe("Founder");
  });

  it("ignores URL and email lines", () => {
    const parsed = parseEmailSignature(
      ["https://acme-studio.co", "hello@acme.co"].join("\n")
    );
    expect(parsed.company).toBeUndefined();
    expect(parsed.title).toBeUndefined();
  });

  it("does not treat long sentences as titles", () => {
    const parsed = parseEmailSignature(
      "I spoke with our Senior Developer about the timeline and they said it should be fine"
    );
    expect(parsed.title).toBeUndefined();
  });

  it("returns an empty result for empty input", () => {
    expect(parseEmailSignature("")).toEqual({});
  });
});

describe("parseSignatureFromBody", () => {
  it("parses the signature from the tail of a full email body", () => {
    const body = [
      "Hi there,",
      "",
      "Thanks for sending the proposal over. The scope looks right and",
      "we should be able to kick off in two weeks.",
      "",
      "Best,",
      "Sam Okafor",
      "Principal",
      "Okafor Design Group",
      "+1 647 555 0199",
    ].join("\n");

    const parsed = parseSignatureFromBody(body);

    expect(parsed.title).toBe("Principal");
    expect(parsed.company).toBe("Okafor Design Group");
    expect(parsed.phone).toContain("647");
  });

  it("only considers the last lines of the body", () => {
    const filler = Array.from({ length: 30 }, (_, i) => `Body line ${i}.`);
    const body = ["Acme Studio Inc appears early but should be ignored", ...filler].join(
      "\n"
    );
    const parsed = parseSignatureFromBody(body);
    expect(parsed.company).toBeUndefined();
  });
});
