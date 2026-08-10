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

  it("accepts prefixed patterns workspace-wide", () => {
    expect(parseRuleInput("subject:invoice", null)).toMatchObject({
      ok: true,
      entityType: "subject_pattern",
      entityKey: "*invoice*",
    });
    expect(parseRuleInput("title:standup", null)).toMatchObject({
      ok: true,
      entityType: "title_pattern",
    });
  });
});

describe("parseRuleInput — S5 vocabulary: area-default patterns", () => {
  it("maps a bare glob to the area's only pattern type", () => {
    expect(parseRuleInput("*lunch*", "calendar")).toMatchObject({
      ok: true,
      entityType: "title_pattern",
      entityKey: "*lunch*",
    });
    expect(parseRuleInput("*unsubscribe*", "messaging")).toMatchObject({
      ok: true,
      entityType: "keyword",
      entityKey: "*unsubscribe*",
    });
    expect(parseRuleInput("*template*", "storage")).toMatchObject({
      ok: true,
      entityType: "name_pattern",
      entityKey: "*template*",
    });
    expect(parseRuleInput("*standup*", "meetings")).toMatchObject({
      ok: true,
      entityType: "title_pattern",
    });
  });

  it("keeps sender_pattern as the email default (two pattern types)", () => {
    expect(parseRuleInput("*newsletter*", "email")).toMatchObject({
      ok: true,
      entityType: "sender_pattern",
    });
  });

  it("still rejects a bare glob where the area has no pattern type", () => {
    expect(parseRuleInput("*newsletter*", "billing").ok).toBe(false);
    expect(parseRuleInput("*newsletter*", "crm").ok).toBe(false);
    expect(parseRuleInput("*newsletter*", "projects").ok).toBe(false);
  });
});

describe("parseRuleInput — S5 vocabulary: prefixes", () => {
  it("subject: compiles to a subject pattern, wrapping bare words", () => {
    expect(parseRuleInput("subject:invoice", "email")).toEqual({
      ok: true,
      entityType: "subject_pattern",
      entityKey: "*invoice*",
      preview: "Subject pattern · *invoice*",
    });
  });

  it("subject: keeps explicit globs verbatim", () => {
    expect(parseRuleInput("subject:Invoice *", "email")).toMatchObject({
      ok: true,
      entityType: "subject_pattern",
      entityKey: "Invoice *",
    });
  });

  it("title: compiles to a title pattern in calendar and meetings", () => {
    expect(parseRuleInput("title:lunch", "calendar")).toMatchObject({
      ok: true,
      entityType: "title_pattern",
      entityKey: "*lunch*",
    });
    expect(parseRuleInput("title:standup", "meetings")).toMatchObject({
      ok: true,
      entityType: "title_pattern",
    });
  });

  it("keyword: compiles to a keyword in messaging", () => {
    expect(parseRuleInput("keyword:unsubscribe", "messaging")).toMatchObject({
      ok: true,
      entityType: "keyword",
      entityKey: "*unsubscribe*",
    });
  });

  it("name: compiles to a file name pattern in storage", () => {
    expect(parseRuleInput("name:template", "storage")).toEqual({
      ok: true,
      entityType: "name_pattern",
      entityKey: "*template*",
      preview: "Name pattern · *template*",
    });
  });

  it("attendee: overrides the calendar person default", () => {
    expect(parseRuleInput("attendee:Bob@Acme.com", "calendar")).toEqual({
      ok: true,
      entityType: "attendee",
      entityKey: "bob@acme.com",
      preview: "Attendee · bob@acme.com",
    });
  });

  it("participant: overrides the meetings person default", () => {
    expect(parseRuleInput("participant:carol@x.com", "meetings")).toMatchObject({
      ok: true,
      entityType: "participant",
      entityKey: "carol@x.com",
    });
  });

  it("rejects a prefix the area's vocabulary doesn't support", () => {
    expect(parseRuleInput("subject:invoice", "calendar").ok).toBe(false);
    expect(parseRuleInput("keyword:unsubscribe", "email").ok).toBe(false);
    expect(parseRuleInput("attendee:bob@acme.com", "email").ok).toBe(false);
  });

  it("rejects a people prefix with a non-email value", () => {
    expect(parseRuleInput("attendee:bob", "calendar").ok).toBe(false);
  });

  it("rejects an invalid prefixed glob with the pattern-syntax hint", () => {
    const result = parseRuleInput("subject:*inv(oice*", "email");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.hint).toMatch(/wildcards/i);
    }
  });

  it("rejects an empty prefix value", () => {
    expect(parseRuleInput("subject:", "email").ok).toBe(false);
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
