import { describe, expect, it } from "vitest";
import { parseRuleInput } from "./parse-rule-input";

/**
 * Smart parse box (Sources → Customize, Phase 2). The parser never guesses:
 * anything that doesn't match a known shape rejects with a hint, and the
 * parsed entity type must be legal for the area's rule vocabulary. The box
 * is keyed on the user-facing AREAS (Email, Messaging, Projects…) — the
 * same vocabulary as the Activity area filter — not the engineering
 * ConnectorCategory enum.
 */
describe("parseRuleInput — email area", () => {
  it("parses a sender email, normalizing case and whitespace", () => {
    expect(parseRuleInput("  SARAH@Acme.com ", "email")).toEqual({
      ok: true,
      entityType: "sender_email",
      entityKey: "sarah@acme.com",
      preview: "Sender · sarah@acme.com",
    });
  });

  it("parses a domain with a leading @", () => {
    expect(parseRuleInput("@acme.com", "email")).toEqual({
      ok: true,
      entityType: "domain",
      entityKey: "acme.com",
      preview: "Domain · everyone at acme.com",
    });
  });

  it("parses a bare domain", () => {
    expect(parseRuleInput("Acme.COM", "email")).toEqual({
      ok: true,
      entityType: "domain",
      entityKey: "acme.com",
      preview: "Domain · everyone at acme.com",
    });
  });

  it("parses a sender name pattern", () => {
    expect(parseRuleInput("*newsletter*", "email")).toEqual({
      ok: true,
      entityType: "sender_pattern",
      entityKey: "*newsletter*",
      preview: "Name pattern · *newsletter*",
    });
  });

  it("treats ? as a glob wildcard too", () => {
    const result = parseRuleInput("news?etter", "email");
    expect(result).toMatchObject({ ok: true, entityType: "sender_pattern" });
  });

  it("rejects an invalid glob with a pattern-syntax hint", () => {
    const result = parseRuleInput("*news(letter*", "email");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.hint).toMatch(/wildcards/i);
    }
  });

  it("rejects a channel under email — not in the category vocabulary", () => {
    const result = parseRuleInput("#random", "email");
    expect(result.ok).toBe(false);
  });
});

describe("parseRuleInput — other areas", () => {
  it("maps an email to the area's person entity", () => {
    expect(parseRuleInput("sarah@acme.com", "calendar")).toMatchObject({
      ok: true,
      entityType: "organizer",
      entityKey: "sarah@acme.com",
    });
    expect(parseRuleInput("sarah@acme.com", "billing")).toMatchObject({
      ok: true,
      entityType: "customer",
    });
    expect(parseRuleInput("sarah@acme.com", "crm")).toMatchObject({
      ok: true,
      entityType: "contact",
    });
    expect(parseRuleInput("sarah@acme.com", "meetings")).toMatchObject({
      ok: true,
      entityType: "host",
    });
    // Storage area folds the documents category in — same owner entity.
    expect(parseRuleInput("sarah@acme.com", "storage")).toMatchObject({
      ok: true,
      entityType: "owner",
    });
    expect(parseRuleInput("sarah@acme.com", "projects")).toMatchObject({
      ok: true,
      entityType: "assignee",
    });
    expect(parseRuleInput("sarah@acme.com", "messaging")).toMatchObject({
      ok: true,
      entityType: "author",
    });
  });

  it("parses a #channel under messaging, stripping the #", () => {
    expect(parseRuleInput("#Random", "messaging")).toEqual({
      ok: true,
      entityType: "channel",
      entityKey: "Random",
      preview: "Channel · #Random",
    });
  });

  it("rejects a domain where the area has no domain rules", () => {
    const result = parseRuleInput("@acme.com", "calendar");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.hint).toMatch(/name@example\.com/);
    }
  });

  it("rejects a name pattern outside email", () => {
    expect(parseRuleInput("*newsletter*", "billing").ok).toBe(false);
  });
});

describe("parseRuleInput — workspace-wide (area null)", () => {
  it("accepts the full intake vocabulary", () => {
    expect(parseRuleInput("sarah@acme.com", null)).toMatchObject({
      ok: true,
      entityType: "sender_email",
    });
    expect(parseRuleInput("@acme.com", null)).toMatchObject({
      ok: true,
      entityType: "domain",
    });
    expect(parseRuleInput("*newsletter*", null)).toMatchObject({
      ok: true,
      entityType: "sender_pattern",
    });
    expect(parseRuleInput("#random", null)).toMatchObject({
      ok: true,
      entityType: "channel",
      entityKey: "random",
    });
  });
});

describe("parseRuleInput — rejects without guessing", () => {
  it("rejects empty and whitespace-only input", () => {
    expect(parseRuleInput("", "email").ok).toBe(false);
    expect(parseRuleInput("   ", "email").ok).toBe(false);
  });

  it("rejects a bare name — could be anything", () => {
    const result = parseRuleInput("sarah", "email");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.hint).toMatch(/name@example\.com/);
    }
  });

  it("rejects a dot-less domain", () => {
    expect(parseRuleInput("acme", "email").ok).toBe(false);
  });

  it("rejects an email without a domain dot", () => {
    expect(parseRuleInput("sarah@acme", "email").ok).toBe(false);
  });

  it("rejects a malformed double-@ address", () => {
    expect(parseRuleInput("foo@@bar.com", "email").ok).toBe(false);
  });

  it("rejects a bare @ and a bare #", () => {
    expect(parseRuleInput("@", "email").ok).toBe(false);
    expect(parseRuleInput("#", "messaging").ok).toBe(false);
  });

  it("rejects a trailing-dot domain", () => {
    expect(parseRuleInput("acme.com.", "email").ok).toBe(false);
  });
});
