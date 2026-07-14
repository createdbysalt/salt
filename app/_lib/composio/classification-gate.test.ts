import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assertComposioToolAllowed } from "./tool-policy";
import { getComposioToolPolicy } from "./tool-policy-registry";
import { COMPOSIO_TOOL_SLUGS } from "./tool-slugs";

describe("fail-closed classification gate (Phase 2.4)", () => {
  it("blocks when the DB store resolves no approved classification", () => {
    expect(() =>
      assertComposioToolAllowed(COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES, {
        policy: null,
      }),
    ).toThrow(/no approved classification/);
  });

  it("enforces destructive never-execute on DB-resolved policies", () => {
    expect(() =>
      assertComposioToolAllowed("SOME_TOOL", {
        policy: {
          slug: "SOME_TOOL",
          risk: "destructive",
          requiresHumanConfirmation: true,
        },
      }),
    ).toThrow(/destructive/);
  });

  it("enforces unattended read-only on DB-resolved policies", () => {
    expect(() =>
      assertComposioToolAllowed("SOME_TOOL", {
        policy: {
          slug: "SOME_TOOL",
          risk: "mutating",
          requiresHumanConfirmation: true,
        },
        unattended: true,
      }),
    ).toThrow(/unattended/);
  });

  it("allows an approved read policy from the DB store", () => {
    const policy = assertComposioToolAllowed("SOME_TOOL", {
      policy: {
        slug: "SOME_TOOL",
        risk: "read",
        requiresHumanConfirmation: false,
      },
      unattended: true,
    });
    expect(policy.risk).toBe("read");
  });

  it("falls back to the in-code registry only when the policy key is omitted (legacy, until Phase 2.5)", () => {
    const policy = assertComposioToolAllowed(
      COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES,
    );
    expect(policy.risk).toBe("read");
  });
});

describe("seed ↔ registry parity (Phase 2.4 acceptance)", () => {
  const seedSql =
    readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20260703220000_seed_connector_platform.sql",
      ),
      "utf8",
    ) +
    readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20260713200000_add_connector_tools.sql",
      ),
      "utf8",
    ) +
    readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20260713230000_add_calcom_tools_verified.sql",
      ),
      "utf8",
    ) +
    readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20260714000000_seed_remaining_connector_tools.sql",
      ),
      "utf8",
    );

  const registrySlugs = [...new Set(Object.values(COMPOSIO_TOOL_SLUGS))].filter(
    (slug) => getComposioToolPolicy(slug) !== null,
  );

  it("seeds every registry slug with identical risk + confirmation, approved", () => {
    for (const slug of registrySlugs) {
      const policy = getComposioToolPolicy(slug);
      expect(policy).not.toBeNull();
      const row = new RegExp(
        `VALUES \\('${slug}', '${policy!.risk}', ${policy!.requiresHumanConfirmation}, 'approved', 'seed'`,
      );
      expect(seedSql).toMatch(row);
    }
  });

  it("seeds no classification rows beyond the registry (allowing deprecated removals)", () => {
    const seededCount = (
      seedSql.match(/INSERT INTO public\.tool_classifications/g) ?? []
    ).length;
    // Allow for deprecated tools that were removed from registry but remain in old migrations
    // Original seed had 4 invalid CAL_ + 1 STRIPE_RETRIEVE_SUBSCRIPTION = 5 deprecated
    // CAL_LIST_EVENT_TYPES is also inserted twice (original seed + calcom re-verify migration)
    const deprecatedTools = 6;
    expect(seededCount).toBe(registrySlugs.length + deprecatedTools);
  });
});
