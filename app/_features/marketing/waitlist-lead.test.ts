import { describe, it, expect } from "vitest";
import {
  assertMetadataWithinLimit,
  buildWaitlistRow,
  capSource,
  mergeWaitlistMetadata,
  METADATA_MAX_BYTES,
  normalizeWaitlistEmail,
  sanitizeQualification,
  sanitizeLastStep,
} from "./waitlist-lead";

describe("normalizeWaitlistEmail", () => {
  it("trims and lowercases email", () => {
    expect(normalizeWaitlistEmail("  User@Example.COM ")).toBe(
      "user@example.com"
    );
  });
});

describe("capSource", () => {
  it("sanitizes to allowed charset and max length", () => {
    expect(capSource("  Homepage_Hero!! ")).toBe("homepage_hero");
  });

  it("falls back to homepage when empty after sanitize", () => {
    expect(capSource("!!!")).toBe("homepage");
  });

  it("truncates to 64 characters", () => {
    const long = "a".repeat(80);
    expect(capSource(long).length).toBe(64);
  });
});

describe("sanitizeQualification", () => {
  it("drops unknown keys", () => {
    expect(
      sanitizeQualification({
        primaryBusiness: "coaching",
        role_segment: "founder",
        evil: "payload",
      })
    ).toEqual({ primaryBusiness: "coaching" });
  });

  it("drops invalid option values", () => {
    expect(
      sanitizeQualification({
        primaryBusiness: "not-a-real-option",
        annualRevenue: "100k-200k",
      })
    ).toEqual({ annualRevenue: "100k-200k" });
  });

  it("filters multi-select tools tokens", () => {
    expect(
      sanitizeQualification({
        tools: "stripe,invalid,email,bogus",
      })
    ).toEqual({ tools: "stripe,email" });
  });

  it("returns empty object for undefined input", () => {
    expect(sanitizeQualification(undefined)).toEqual({});
  });
});

describe("sanitizeLastStep", () => {
  it("allows email and qual field ids", () => {
    expect(sanitizeLastStep("email")).toBe("email");
    expect(sanitizeLastStep("hearAbout")).toBe("hearAbout");
  });

  it("rejects unknown steps", () => {
    expect(sanitizeLastStep("role_segment")).toBeUndefined();
  });
});

describe("mergeWaitlistMetadata", () => {
  it("merges qualification without dropping prior answers", () => {
    const merged = mergeWaitlistMetadata(
      {
        status: "partial",
        qualification: { primaryBusiness: "coaching" },
        last_step: "primaryBusiness",
      },
      {
        status: "partial",
        qualification: { annualRevenue: "100k-200k" },
        lastStep: "annualRevenue",
        source: "homepage",
      }
    );

    expect(merged).toMatchObject({
      status: "partial",
      qualification: {
        primaryBusiness: "coaching",
        annualRevenue: "100k-200k",
      },
      last_step: "annualRevenue",
      funnel_source: "homepage",
    });
  });

  it("never downgrades complete status", () => {
    const merged = mergeWaitlistMetadata(
      { status: "complete", completed_at: "2026-01-01T00:00:00.000Z" },
      { status: "partial", source: "homepage" }
    );

    expect(merged.status).toBe("complete");
    expect(merged.completed_at).toBe("2026-01-01T00:00:00.000Z");
  });

  it("sets completed_at when transitioning to complete", () => {
    const merged = mergeWaitlistMetadata(
      { status: "partial" },
      {
        status: "complete",
        qualification: { hearAbout: "search" },
        lastStep: "hearAbout",
        source: "homepage",
      }
    );

    expect(merged.status).toBe("complete");
    expect(merged.completed_at).toBeTruthy();
  });

  it("normalizes legacy metadata with qualification only", () => {
    const merged = mergeWaitlistMetadata(
      { qualification: { primaryBusiness: "consulting" } },
      {
        status: "partial",
        lastStep: "annualRevenue",
        qualification: { annualRevenue: "200k-plus" },
        source: "homepage",
      }
    );

    expect(merged.qualification).toEqual({
      primaryBusiness: "consulting",
      annualRevenue: "200k-plus",
    });
  });
});

describe("assertMetadataWithinLimit", () => {
  it("allows metadata under the cap", () => {
    expect(() =>
      assertMetadataWithinLimit({
        status: "partial",
        qualification: { primaryBusiness: "coaching" },
      })
    ).not.toThrow();
  });

  it("rejects metadata over 8KB", () => {
    const huge = "x".repeat(METADATA_MAX_BYTES);
    expect(() =>
      assertMetadataWithinLimit({
        status: "partial",
        qualification: { tools: huge },
      })
    ).toThrow("Waitlist metadata exceeds size limit.");
  });
});

describe("buildWaitlistRow", () => {
  it("shapes upsert payload", () => {
    const row = buildWaitlistRow({
      email: "User@Example.com",
      source: "homepage",
      metadata: { status: "partial", last_step: "email" },
    });

    expect(row).toEqual({
      email: "User@Example.com",
      normalized_email: "user@example.com",
      source: "homepage",
      metadata: { status: "partial", last_step: "email" },
    });
  });
});
