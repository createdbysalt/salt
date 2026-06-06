import { test, expect } from "@playwright/test";

test.describe("Waitlist flow", () => {
  test("homepage email redirects to qualification and completes signup", async ({
    page,
  }) => {
    const uniqueEmail = `waitlist-e2e-${Date.now()}@example.com`;

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.getByLabel("Email address").first().fill(uniqueEmail);
    await page
      .getByRole("button", { name: /join the waitlist/i })
      .first()
      .click();

    await expect(page).toHaveURL(/\/waitlist/);
    await expect(
      page.getByRole("heading", { name: /primary business/i })
    ).toBeVisible();

    await page.getByRole("button", { name: /creative services/i }).click();
    await page.getByRole("button", { name: /\$50k–\$100k/i }).click();
    await page.getByRole("button", { name: /follow-ups slip/i }).click();

    await page.getByRole("button", { name: /stripe \/ payments/i }).click();
    await page.getByRole("button", { name: /^continue$/i }).click();

    await page.getByRole("button", { name: /search engine/i }).click();

    await expect(
      page.getByRole("heading", { name: /you're on the list/i })
    ).toBeVisible({ timeout: 15000 });
  });

  test("aurora waitlist section submits on Enter and preserves source", async ({
    page,
  }) => {
    const uniqueEmail = `waitlist-aurora-${Date.now()}@example.com`;

    await page.goto("/#waitlist");
    await page.waitForLoadState("networkidle");

    const auroraForm = page.locator("#waitlist").getByLabel("Email address");
    await auroraForm.fill(uniqueEmail);
    await auroraForm.press("Enter");

    await expect(page).toHaveURL(/\/waitlist/);
    const params = new URL(page.url()).searchParams;
    expect(params.get("email")).toBe(uniqueEmail.toLowerCase());
    expect(params.get("source")).toBe("landing2-close");
    await expect(
      page.getByRole("heading", { name: /primary business/i })
    ).toBeVisible();
  });

  test("direct waitlist page accepts email and starts qualification", async ({
    page,
  }) => {
    await page.goto("/waitlist");
    await page.waitForLoadState("networkidle");

    await page.getByLabel("Email address").fill("direct-waitlist@example.com");
    await page.getByRole("button", { name: /^continue$/i }).click();

    await expect(
      page.getByRole("heading", { name: /primary business/i })
    ).toBeVisible();
  });
});
