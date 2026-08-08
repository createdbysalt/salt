import { describe, expect, it } from "vitest";

import {
  buildSenderScopedQuery,
  chunkSenderQueries,
  DEFAULT_MAX_QUERY_LENGTH,
  normalizeSenderEmails,
} from "./gmail-sender-query";

describe("normalizeSenderEmails", () => {
  it("lowercases, trims, and dedupes", () => {
    expect(normalizeSenderEmails(["  Alex@Client.CO ", "alex@client.co", "b@y.com"])).toEqual([
      "alex@client.co",
      "b@y.com",
    ]);
  });

  it("drops blanks and malformed addresses", () => {
    expect(normalizeSenderEmails(["", "  ", null, undefined, "not-an-email", "a@b"])).toEqual([]);
  });
});

describe("buildSenderScopedQuery", () => {
  it("builds a Gmail OR-group", () => {
    expect(buildSenderScopedQuery(["a@x.com", "b@y.com"])).toBe("from:(a@x.com OR b@y.com)");
  });

  it("returns an empty string for an empty list — never subscribe unfiltered", () => {
    // An empty query matches EVERYTHING; the billing-leak invariant is that
    // callers get a falsy value and skip the upsert.
    expect(buildSenderScopedQuery([])).toBe("");
  });
});

describe("chunkSenderQueries", () => {
  it("returns no queries for an empty sender set", () => {
    expect(chunkSenderQueries([])).toEqual([]);
    expect(chunkSenderQueries([null, "nope"] as string[])).toEqual([]);
  });

  it("keeps a small set in a single query", () => {
    const chunks = chunkSenderQueries(["a@x.com", "b@y.com"]);
    expect(chunks).toEqual(["from:(a@x.com OR b@y.com)"]);
  });

  it("splits at the length bound without dropping senders", () => {
    const emails = Array.from({ length: 200 }, (_, i) => `person${i}@example.com`);

    const chunks = chunkSenderQueries(emails, 200);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(200);
    }
    const covered = chunks.flatMap((chunk) => chunk.match(/[^\s()]+@[^\s()]+/g) ?? []);
    expect(covered.sort()).toEqual([...emails].sort());
  });

  it("respects the default bound", () => {
    const emails = Array.from({ length: 500 }, (_, i) => `person${i}@example.com`);

    const chunks = chunkSenderQueries(emails);

    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(DEFAULT_MAX_QUERY_LENGTH);
    }
  });

  it("skips a single email that alone exceeds the bound", () => {
    const huge = `${"a".repeat(300)}@example.com`;

    const chunks = chunkSenderQueries([huge, "ok@x.com"], 200);

    expect(chunks).toEqual(["from:(ok@x.com)"]);
  });
});
