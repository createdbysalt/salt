import { describe, expect, it } from "vitest";
import { sanitizeDomainHostnameForApi, VercelAPIError } from "./domain-manager";

describe("sanitizeDomainHostnameForApi", () => {
  it("accepts valid hostnames", () => {
    expect(sanitizeDomainHostnameForApi("Portal.Example.com")).toBe("portal.example.com");
    expect(sanitizeDomainHostnameForApi("sub.example.co.uk")).toBe("sub.example.co.uk");
  });

  it("rejects path traversal and URL injection attempts", () => {
    const malicious = [
      "evil.com/../../admin",
      "//evil.com",
      "https://evil.com",
      "evil.com%2f..%2f",
      "evil.com\n",
      "",
    ];

    for (const hostname of malicious) {
      expect(() => sanitizeDomainHostnameForApi(hostname)).toThrow(VercelAPIError);
    }
  });
});
