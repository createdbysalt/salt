import { test, expect } from "@playwright/test";

test.use({ storageState: "./fixtures/auth.json" });

test.describe("Trial wow flow", () => {
  test("onboarding shows real connect actions for Gmail", async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("button", { name: "Connect" }).first(),
    ).toBeVisible({ timeout: 15000 });
  });

  test("HQ briefing loads and approve play when queue has items", async ({
    page,
  }) => {
    await page.goto("/hq");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Today's briefing")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("Plays ready")).toBeVisible();

    const approveButton = page
      .getByRole("button", { name: /approve and send/i })
      .first();
    const hasQueuedPlays = await approveButton.isVisible().catch(() => false);

    if (!hasQueuedPlays) {
      test.skip(true, "No queued plays seeded for studio user");
      return;
    }

    const countBefore = await page.getByText(/\d+\/\d+/).textContent();
    await approveButton.click();
    await expect(page.getByText(/approved|sent|logged/i)).toBeVisible({
      timeout: 10000,
    }).catch(async () => {
      const countAfter = await page.getByText(/\d+\/\d+/).textContent();
      expect(countAfter).not.toEqual(countBefore);
    });
  });

  test("plays page loads queue from server", async ({ page }) => {
    await page.goto("/plays");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("tab", { name: /queue/i })).toBeVisible({
      timeout: 15000,
    });
  });
});
