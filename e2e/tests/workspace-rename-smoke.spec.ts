import { expect, test } from "@playwright/test";
import { gotoAppRoute } from "../utils/navigation";

test.use({ storageState: "./fixtures/auth.json" });

test.describe("Workspace rename smoke", () => {
  // The Settings integrations page retired with the connector platform —
  // connectors live in Plays → Customize → Connectors, fed by the DB-driven
  // catalog and shown as a master-detail grid (cards → detail in place).
  test("loads connectors catalog from workspace tables", async ({ page }) => {
    await gotoAppRoute(page, "/plays?tab=customize&customize=connectors");

    await expect(page).not.toHaveURL(/\/signin|\/login/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Connectors" })).toBeVisible({
      timeout: 30_000,
    });
    // Cards are buttons that open the connector's detail in the same tab.
    await expect(page.getByText("Gmail").first()).toBeVisible();
    await expect(page.getByText("Stripe").first()).toBeVisible();
  });

  test("redirects /spaces to Work", async ({ page }) => {
    await gotoAppRoute(page, "/spaces");

    await expect(page).not.toHaveURL(/\/signin|\/login/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/work\/?$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Work" })).toBeVisible();
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
