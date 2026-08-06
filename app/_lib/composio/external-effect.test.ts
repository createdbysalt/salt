import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/** Rows the mocked `tool_classifications` lookup returns, per slug. */
let classifications: Record<
  string,
  { risk: string | null; external_effect: boolean | null }
> = {};
let lookupError: { message: string } | null = null;

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: (_column: string, slug: string) => ({
          maybeSingle: async () => ({
            data: classifications[slug] ?? null,
            error: lookupError,
          }),
        }),
      }),
    }),
  }),
}));

import {
  anyToolHasExternalEffect,
  classifyExternalEffectByHeuristic,
  invalidateExternalEffectCache,
  resolveToolExternalEffect,
} from "./external-effect";

beforeEach(() => {
  classifications = {};
  lookupError = null;
  invalidateExternalEffectCache();
});

describe("classifyExternalEffectByHeuristic", () => {
  it("treats read tools as internal", () => {
    const result = classifyExternalEffectByHeuristic("GMAIL_LIST_MESSAGES", "read");

    expect(result.externalEffect).toBe(false);
    expect(result.source).toBe("risk");
  });

  it("treats mutating and destructive tools as external", () => {
    expect(
      classifyExternalEffectByHeuristic("GMAIL_SEND_EMAIL", "mutating").externalEffect,
    ).toBe(true);
    expect(
      classifyExternalEffectByHeuristic("GOOGLECALENDAR_DELETE_EVENT", "destructive")
        .externalEffect,
    ).toBe(true);
  });

  it("infers risk from the slug when none is supplied", () => {
    expect(
      classifyExternalEffectByHeuristic("GOOGLECALENDAR_LIST_EVENTS").externalEffect,
    ).toBe(false);
    expect(
      classifyExternalEffectByHeuristic("GOOGLECALENDAR_CREATE_EVENT").externalEffect,
    ).toBe(true);
  });

  // Charging for these would be charging the user for Salt filing their mail.
  it("exempts mailbox housekeeping", () => {
    const result = classifyExternalEffectByHeuristic(
      "GMAIL_ADD_LABEL_TO_EMAIL",
      "mutating",
    );

    expect(result.externalEffect).toBe(false);
    expect(result.source).toBe("override");
  });

  // §1 counts "invoice drafted to a third party" as billable output.
  it("counts drafts written into an external mailbox", () => {
    const result = classifyExternalEffectByHeuristic(
      "GMAIL_CREATE_EMAIL_DRAFT",
      "mutating",
    );

    expect(result.externalEffect).toBe(true);
    expect(result.source).toBe("override");
  });

  it("is case-insensitive on overrides", () => {
    expect(
      classifyExternalEffectByHeuristic("gmail_create_email_draft").externalEffect,
    ).toBe(true);
  });
});

describe("resolveToolExternalEffect", () => {
  it("prefers an explicit database classification", async () => {
    classifications.SOME_TOOL = { risk: "mutating", external_effect: false };

    const result = await resolveToolExternalEffect("SOME_TOOL");

    expect(result.externalEffect).toBe(false);
    expect(result.source).toBe("database");
  });

  it("derives from stored risk when external_effect is unset", async () => {
    classifications.SOME_TOOL = { risk: "read", external_effect: null };

    const result = await resolveToolExternalEffect("SOME_TOOL");

    expect(result.externalEffect).toBe(false);
    expect(result.source).toBe("risk");
  });

  it("falls back to the slug heuristic when the tool is unknown", async () => {
    const result = await resolveToolExternalEffect("SLACK_SEND_MESSAGE");

    expect(result.externalEffect).toBe(true);
  });

  // Metering must degrade to an estimate, never throw into a play that ran.
  it("falls back to the heuristic on a database error", async () => {
    lookupError = { message: "connection failure" };

    await expect(
      resolveToolExternalEffect("GMAIL_LIST_MESSAGES"),
    ).resolves.toMatchObject({ externalEffect: false });
  });
});

describe("anyToolHasExternalEffect", () => {
  it("is false for a play that executed nothing", async () => {
    await expect(anyToolHasExternalEffect([])).resolves.toBe(false);
  });

  it("is false when every tool only read context", async () => {
    await expect(
      anyToolHasExternalEffect(["GMAIL_LIST_MESSAGES", "GOOGLECALENDAR_LIST_EVENTS"]),
    ).resolves.toBe(false);
  });

  // Hybrid plays are billable exactly once — one send is enough.
  it("is true when a single tool left Salt", async () => {
    await expect(
      anyToolHasExternalEffect([
        "GMAIL_LIST_MESSAGES",
        "GMAIL_ADD_LABEL_TO_EMAIL",
        "GMAIL_SEND_EMAIL",
      ]),
    ).resolves.toBe(true);
  });
});
