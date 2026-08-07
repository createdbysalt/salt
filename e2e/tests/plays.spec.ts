import { test, expect } from "@playwright/test";
import { gotoAppRoute, gotoPlays } from "../utils/navigation";

test.use({ storageState: "./fixtures/auth.json" });

test.describe("Plays surface", () => {
  test.beforeEach(async ({ page }) => {
    await gotoPlays(page);
  });

  test("shows queue tab with Needs You / Auto-handled toggle", async ({ page }) => {
    await expect(
      page.getByRole("navigation", { name: "Plays sections" })
    ).toBeVisible({ timeout: 15000 });

    // Queue header and toggle
    await expect(page.getByRole("heading", { name: /needs you/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /needs you/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /auto-handled/i })).toBeVisible();

    // Development queue action
    await expect(
      page.getByRole("button", { name: /sync & scan/i })
    ).toBeVisible();
  });

  test("Plays tabs switch sections", async ({ page }) => {
    const sections = page.getByRole("navigation", { name: "Plays sections" });

    await sections.getByRole("button", { name: "Playbooks" }).click();
    await expect(page.getByRole("heading", { name: /^playbooks$/i })).toBeVisible();

    await sections.getByRole("button", { name: "Activity" }).click();
    await expect(page.getByRole("heading", { name: /^activity$/i })).toBeVisible();

    await sections.getByRole("button", { name: "Queue" }).click();
    await expect(page.getByRole("heading", { name: /needs you/i })).toBeVisible();
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

  test("PlayCard anatomy is consistent across card types", async ({ page }) => {
    // Check if there are any cards in the queue
    const cards = page.locator("article.glass-card, article.group");
    const cardCount = await cards.count();

    if (cardCount === 0) {
      // Queue is empty - verify empty state
      await expect(page.getByText(/queue clear/i)).toBeVisible();
      return;
    }

    // For each visible card, verify the canonical anatomy:
    // Header: Player icon + name · Playbook name
    // Meta: age, trigger, confidence
    // Subject: title
    // Footer: actions (Dismiss, Edit with Salt, primary action)
    const firstCard = cards.first();

    // Header should have player attribution (not just a category chip)
    await expect(
      firstCard.getByText(/billing|keeper|follow-up|client-risk|brief/i).first()
    ).toBeVisible();

    // Footer should have consistent actions
    await expect(
      firstCard.getByRole("button", { name: /dismiss/i })
    ).toBeVisible();
    await expect(
      firstCard.getByRole("button", { name: /edit with salt/i })
    ).toBeVisible();
  });

  test("Auto-handled cards show Undo and Correct actions", async ({ page }) => {
    // Switch to Auto-handled view
    await page.getByRole("button", { name: /auto-handled/i }).click();
    await expect(page.getByRole("heading", { name: /auto-handled/i })).toBeVisible();

    // Check if there are any auto-handled cards
    const cards = page.locator("article.group");
    const cardCount = await cards.count();

    if (cardCount === 0) {
      // No auto-handled items - verify empty state
      await expect(
        page.getByText(/nothing auto-handled recently/i)
      ).toBeVisible();
      return;
    }

    const firstCard = cards.first();

    // Auto-handled cards should show "Handled" marker
    await expect(firstCard.getByText(/handled/i)).toBeVisible();

    // Footer should have Undo and Fix with Salt (not Approve)
    await expect(
      firstCard.getByRole("button", { name: /undo/i })
    ).toBeVisible();
    await expect(
      firstCard.getByRole("button", { name: /fix with salt/i })
    ).toBeVisible();
  });
});

test.describe("Plays — legacy redirects", () => {
  test("tab=customize redirects to Playbooks", async ({ page }) => {
    await gotoAppRoute(page, "/plays?tab=customize");
    await expect(page).toHaveURL(/\/plays\?tab=playbooks/);
  });

  test("customize=connectors redirects to Sources", async ({ page }) => {
    await gotoAppRoute(page, "/plays?tab=customize&customize=connectors");
    await expect(page).toHaveURL(/\/sources/);
  });

  test("filter=learning redirects to Memory Filter", async ({ page }) => {
    await gotoAppRoute(page, "/plays?tab=queue&filter=learning");
    await expect(page).toHaveURL(/\/memory\?tab=filter/);
  });
});
