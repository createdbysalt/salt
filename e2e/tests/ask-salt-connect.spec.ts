import { expect, test } from "@playwright/test";
import { gotoAppRoute } from "../utils/navigation";

test.use({ storageState: "./fixtures/auth.json" });

test.describe("Ask Salt connectors", () => {
  test("does not show Connect a tool starter", async ({ page }) => {
    await gotoAppRoute(page, "/hq");

    await expect(page).not.toHaveURL(/\/signin|\/login/, { timeout: 15_000 });
    await page.getByRole("button", { name: "Ask Salt" }).first().click();

    await expect(page.getByRole("complementary", { name: "Ask Salt" })).toBeVisible({
      timeout: 30_000,
    });

    await expect(page.getByRole("button", { name: "Connect a tool" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Create a new Play" })).toBeVisible();
  });

  test("connect gmail shows inline connect affordance", async ({ page }) => {
    await gotoAppRoute(page, "/hq");

    await expect(page).not.toHaveURL(/\/signin|\/login/, { timeout: 15_000 });
    await page.getByRole("button", { name: "Ask Salt" }).first().click();

    await expect(page.getByRole("complementary", { name: "Ask Salt" })).toBeVisible({
      timeout: 30_000,
    });

    const input = page.getByPlaceholder("Ask a question");
    await input.fill("Connect Gmail");
    await input.press("Enter");

    await expect(
      page.getByText(/I'll need Gmail|Gmail is already connected/i),
    ).toBeVisible({ timeout: 15_000 });
    // A "Connect Gmail" suggestion chip can render alongside the inline CTA,
    // so assert on the first matching affordance instead of a unique match.
    await expect(
      page.getByRole("button", { name: /connect gmail/i }).first(),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("link", { name: "Open in Connectors" })).toHaveCount(0);
  });

  test("connect calendar routes to the Google Calendar connector", async ({ page }) => {
    await gotoAppRoute(page, "/hq");

    await expect(page).not.toHaveURL(/\/signin|\/login/, { timeout: 15_000 });
    await page.getByRole("button", { name: "Ask Salt" }).first().click();

    await expect(page.getByRole("complementary", { name: "Ask Salt" })).toBeVisible({
      timeout: 30_000,
    });

    const input = page.getByPlaceholder("Ask a question");
    await input.fill("Connect Google Calendar");
    await input.press("Enter");

    await expect(
      page.getByText(/I'll need Google Calendar|Google Calendar is already connected/i),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("connector status uses conversational copy", async ({ page }) => {
    await gotoAppRoute(page, "/hq");

    await expect(page).not.toHaveURL(/\/signin|\/login/, { timeout: 15_000 });
    await page.getByRole("button", { name: "Ask Salt" }).first().click();

    await expect(page.getByRole("complementary", { name: "Ask Salt" })).toBeVisible({
      timeout: 30_000,
    });

    const input = page.getByPlaceholder("Ask a question");
    await input.fill("what's connected");
    await input.press("Enter");

    await expect(
      page.getByText(/linked yet|you're set up with|tell me what you want/i),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("create play starter shows suggestion chips", async ({ page }) => {
    await gotoAppRoute(page, "/hq");

    await expect(page).not.toHaveURL(/\/signin|\/login/, { timeout: 15_000 });
    await page.getByRole("button", { name: "Ask Salt" }).first().click();

    await expect(page.getByRole("complementary", { name: "Ask Salt" })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole("button", { name: "Create a new Play" }).click();

    await expect(page.getByText(/what should this play accomplish/i)).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("button", { name: "Email quiet clients every Monday" })).toBeVisible();
  });
});
