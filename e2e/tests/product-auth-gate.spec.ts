import { test, expect } from "@playwright/test";

test.describe("Product auth gate", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("sign-in page is available when product auth is enabled", async ({
    page,
  }) => {
    await page.goto("/signin", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("button", { name: /continue with email/i })
    ).toBeVisible();
  });

  test("unauthenticated app routes redirect to sign-in when auth is enabled", async ({
    page,
  }) => {
    await page.goto("/hq", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/signin/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/signin/);
  });

  test("waitlist stays public when product auth is disabled", async ({
    page,
  }) => {
    test.skip(
      process.env.NEXT_PUBLIC_PRODUCT_AUTH_ENABLED !== "false",
      "Run with NEXT_PUBLIC_PRODUCT_AUTH_ENABLED=false to verify production lock"
    );

    await page.goto("/waitlist", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /join the salt waitlist/i })
    ).toBeVisible();
  });

  test("sign-in redirects to waitlist when product auth is disabled", async ({
    page,
  }) => {
    test.skip(
      process.env.NEXT_PUBLIC_PRODUCT_AUTH_ENABLED !== "false",
      "Run with NEXT_PUBLIC_PRODUCT_AUTH_ENABLED=false to verify production lock"
    );

    await page.goto("/signin", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/waitlist/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/waitlist/);
  });
});
