import { test, expect } from "@playwright/test";

test.describe("segment landing pages", () => {
  test("coaches page matches homepage shell with segment hero copy", async ({
    page,
  }) => {
    await page.goto("/for/coaches");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Salt runs your practice between sessions/i,
      })
    ).toBeVisible();

    await expect(page.getByText(/For coaches/i)).toBeVisible();

    await expect(
      page.getByRole("heading", {
        level: 2,
        name: /Salt runs the work\. You run the business\./i,
      })
    ).toBeVisible();

    await expect(page.getByText("Integrations")).toBeVisible();

    await expect(
      page.getByRole("heading", {
        level: 2,
        name: /You can prove transformation in the room/i,
      })
    ).toBeVisible();

    await expect(page.getByLabel("Email address")).toHaveCount(2);

    await expect(
      page.getByRole("link", { name: /Take the 2-minute quiz/i })
    ).toBeVisible();
  });

  test("invalid segment returns 404", async ({ page }) => {
    const response = await page.goto("/for/not-a-segment");
    expect(response?.status()).toBe(404);
  });
});
