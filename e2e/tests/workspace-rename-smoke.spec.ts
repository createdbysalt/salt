import { expect, test } from "@playwright/test";
import { gotoAppRoute } from "../utils/navigation";

test.use({ storageState: "./fixtures/auth.json" });

test.describe("Workspace rename smoke", () => {
  test("loads integrations settings from workspace tables", async ({ page }) => {
    await gotoAppRoute(page, "/settings/integrations");

    await expect(page).not.toHaveURL(/\/signin|\/login/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Integrations" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Google")).toBeVisible();
    await expect(page.getByText("Cal.com")).toBeVisible();
    await expect(page.getByText("Stripe")).toBeVisible();
  });

  test("loads Spaces after the roundtables rename", async ({ page }) => {
    await gotoAppRoute(page, "/spaces");

    await expect(page).not.toHaveURL(/\/signin|\/login/, { timeout: 15_000 });
    await expect(page.getByRole("navigation", { name: "Spaces sections" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("heading", { name: "Spaces" })).toBeVisible();
  });

  test("opens Ask Salt compact panel and fullscreen history", async ({ page }) => {
    await gotoAppRoute(page, "/hq");

    await expect(page).not.toHaveURL(/\/signin|\/login/, { timeout: 15_000 });
    await page.getByRole("button", { name: "Ask Salt" }).first().click();

    await expect(page.getByRole("complementary", { name: "Ask Salt" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/how can I help/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Switch to full screen" })).toBeVisible();

    await page.getByRole("button", { name: "Switch to full screen" }).click();

    await expect(page.getByRole("heading", { name: "Chat history" })).toBeVisible();
    await expect(page.getByPlaceholder("Search")).toBeVisible();
    // getByLabel targets the header compose button — history items can also be
    // titled "New chat", which makes a role+name query ambiguous.
    await expect(page.getByLabel("New chat")).toBeVisible();
  });
});
