import { test, expect } from "@playwright/test";

test.use({ storageState: "./fixtures/auth.json" });

test.describe("HQ dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/hq");
    await page.waitForLoadState("networkidle");
  });

  test("shows the briefing hero and play queue", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /good morning/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("Today's briefing")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /needs you/i })
    ).toBeVisible();
    await expect(page.getByText(/\d+\/\d+/)).toBeVisible();
    const approveButton = page.getByRole("button", { name: /approve/i }).first();
    const emptyQueue = page.getByText(/inbox zero/i);
    await expect(approveButton.or(emptyQueue)).toBeVisible();
  });

  test("shows side rail cards", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /today's schedule/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole("heading", { name: /heads up/i })).toBeVisible();
    await expect(page.getByText("Time saved", { exact: true })).toBeVisible();
  });

  test("HQ tabs switch sections", async ({ page }) => {
    await expect(page.getByRole("navigation", { name: "HQ sections" })).toBeVisible({
      timeout: 15000,
    });

    await page.getByRole("button", { name: "Upcoming" }).click();
    await expect(page.getByRole("heading", { name: /the road ahead/i })).toBeVisible();

    await page.getByRole("button", { name: "Stats" }).click();
    await expect(
      page.getByRole("heading", { name: /how the business is moving/i })
    ).toBeVisible();

    await page.getByRole("button", { name: "Today" }).click();
    await expect(
      page.getByRole("heading", { name: /needs you/i })
    ).toBeVisible();
  });
});
