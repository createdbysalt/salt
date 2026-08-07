import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/**
 * Verifies the real configured Stripe price ids, not mocked ones.
 *
 * Skips when `STRIPE_PRICE_*` is absent, so ordinary `pnpm test` and CI stay
 * green. To run it for real:
 *
 *     op run --env-file=.env.1password -- pnpm exec vitest run saas-price-wiring
 *
 * Two directions are checked because only one of them fails loudly:
 *
 * - **checkout** — `resolveSaasPriceId` must return a real id. A placeholder
 *   makes Stripe reject the session, which is obvious immediately.
 * - **upgrade webhook** — `resolveTierFromPriceId` must recover the tier. This
 *   fails *silently*: an unmatched price leaves the stored tier untouched, so a
 *   customer who upgrades pays the new amount and keeps the old bundle, with
 *   nothing logged anywhere.
 */

const PRICE_ENV_KEYS = [
  "STRIPE_PRICE_STARTER_MONTHLY",
  "STRIPE_PRICE_STARTER_ANNUAL",
  "STRIPE_PRICE_PRO_MONTHLY",
  "STRIPE_PRICE_PRO_ANNUAL",
  "STRIPE_PRICE_MAX_MONTHLY",
  "STRIPE_PRICE_MAX_ANNUAL",
] as const;

const configured = PRICE_ENV_KEYS.every((key) =>
  (process.env[key] ?? "").startsWith("price_"),
);

describe.skipIf(!configured)("configured Stripe price wiring", () => {
  it("resolves a real price id for every tier and interval", async () => {
    const { resolveSaasPriceId } = await import("./saas-price-ids");

    for (const tier of ["starter", "pro", "max"] as const) {
      for (const interval of ["month", "year"] as const) {
        const id = resolveSaasPriceId(tier, interval);
        expect(id, `${tier}/${interval} has no configured price`).toMatch(/^price_/);
      }
    }
  });

  it("recovers the tier from every configured price id", async () => {
    const { SAAS_PRICE_IDS } = await import("./saas-price-ids");
    const { resolveTierFromPriceId } = await import("./subscription-sync");

    for (const [key, priceId] of Object.entries(SAAS_PRICE_IDS)) {
      const expected = key.split("_")[0];
      expect(
        resolveTierFromPriceId(priceId),
        `${key} (${priceId}) does not map back to a tier — an upgrade to this price would silently keep the old bundle`,
      ).toBe(expected);
    }
  });

  it("uses a distinct price id for every tier and interval", async () => {
    const { SAAS_PRICE_IDS } = await import("./saas-price-ids");
    const ids = Object.values(SAAS_PRICE_IDS);
    expect(new Set(ids).size, "duplicate price ids would misroute tier recovery").toBe(
      ids.length,
    );
  });
});

describe.skipIf(configured)("configured Stripe price wiring (not configured)", () => {
  it("is skipped without STRIPE_PRICE_* in the environment", () => {
    expect(configured).toBe(false);
  });
});
