import { test, expect } from "@playwright/test";
import { gotoPlays } from "../utils/navigation";

test.use({ storageState: "./fixtures/auth.json" });

test.describe("Plays surface", () => {
  test.beforeEach(async ({ page }) => {
    await gotoPlays(page);
  });

  test("shows queue tab and review controls", async ({ page }) => {
    await expect(
      page.getByRole("navigation", { name: "Plays sections" })
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByRole("heading", { name: /plays queue/i })).toBeVisible();
    await expect(page.getByText(/plays ready to review/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /review \d+ plays?/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /create a play/i })
    ).toBeVisible();
  });

  test("Plays tabs switch sections", async ({ page }) => {
    await page.getByRole("button", { name: "Players" }).click();
    await expect(page.getByRole("heading", { name: /the players/i })).toBeVisible();

    await page.getByRole("button", { name: "Playbooks" }).click();
    await expect(page.getByRole("heading", { name: /^playbooks$/i })).toBeVisible();

    await page.getByRole("button", { name: "Activity" }).click();
    await expect(page.getByRole("heading", { name: /^activity$/i })).toBeVisible();

    await page.getByRole("button", { name: "Queue" }).click();
    await expect(page.getByRole("heading", { name: /plays queue/i })).toBeVisible();
  });

  test("Apply to Memory control when findings include memory proposals", async ({
    page,
  }) => {
    const applyButton = page.getByRole("button", { name: /apply to memory/i });
    const count = await applyButton.count();
    if (count > 0) {
      await expect(applyButton.first()).toBeVisible();
      await expect(page.getByText(/suggested memory/i).first()).toBeVisible();
    }
  });
});
