import { test, expect } from "@playwright/test";
import { gotoAppRoute } from "../utils/navigation";

test.use({ storageState: "./fixtures/auth.json" });

test.describe("Entity Notes", () => {
  test.describe("People Notes Tab", () => {
    test("shows notes tab and empty state", async ({ page }) => {
      await gotoAppRoute(page, "/people");
      await expect(page.getByRole("heading", { name: /^people$/i })).toBeVisible({
        timeout: 15000,
      });

      // Click on first person in list
      const personLink = page.getByRole("link", { name: /[a-z]/i }).first();
      await personLink.click();

      // Wait for detail page to load
      await expect(page.getByRole("tab", { name: /overview/i })).toBeVisible({
        timeout: 15000,
      });

      // Click on Notes tab
      await page.getByRole("tab", { name: /notes/i }).click();

      // Should see search input and add note button
      await expect(page.getByPlaceholder(/search notes/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /add note/i })).toBeVisible();
    });

    test("opens add note dialog", async ({ page }) => {
      await gotoAppRoute(page, "/people");
      await expect(page.getByRole("heading", { name: /^people$/i })).toBeVisible({
        timeout: 15000,
      });

      const personLink = page.getByRole("link", { name: /[a-z]/i }).first();
      await personLink.click();

      await expect(page.getByRole("tab", { name: /notes/i })).toBeVisible({
        timeout: 15000,
      });
      await page.getByRole("tab", { name: /notes/i }).click();

      // Click add note button
      await page.getByRole("button", { name: /add note/i }).click();

      // Dialog should open
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByRole("heading", { name: /add note about/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /save note/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /cancel/i })).toBeVisible();
    });

    test("filter dropdown shows options", async ({ page }) => {
      await gotoAppRoute(page, "/people");
      await expect(page.getByRole("heading", { name: /^people$/i })).toBeVisible({
        timeout: 15000,
      });

      const personLink = page.getByRole("link", { name: /[a-z]/i }).first();
      await personLink.click();

      await expect(page.getByRole("tab", { name: /notes/i })).toBeVisible({
        timeout: 15000,
      });
      await page.getByRole("tab", { name: /notes/i }).click();

      // Click filter button
      await page.getByRole("button", { name: /all notes/i }).click();

      // Filter options should appear
      await expect(page.getByRole("button", { name: /pinned/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /^you$/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /^salt$/i })).toBeVisible();
    });
  });

  test.describe("Work Notes Tab", () => {
    test("shows notes tab on work detail page", async ({ page }) => {
      await gotoAppRoute(page, "/work");
      await expect(page.getByRole("heading", { name: /^work$/i })).toBeVisible({
        timeout: 15000,
      });

      // Work directory rows navigate via onRowClick (no anchor) — click the
      // first data row in the directory table.
      const workRow = page.getByRole("main").locator("tbody tr").first();
      test.skip((await workRow.count()) === 0, "No work rows in this environment");
      await workRow.click();
      await expect(page).toHaveURL(/\/work\/[0-9a-f-]{36}/, { timeout: 15000 });

      // Wait for detail page to load
      await expect(page.getByRole("tab", { name: /overview/i })).toBeVisible({
        timeout: 15000,
      });

      // Click on Notes tab
      await page.getByRole("tab", { name: /notes/i }).click();

      // Add note is always present (empty records render a second CTA copy —
      // assert the first); the search toolbar only renders once the record
      // has notes, so don't require it on an empty record.
      await expect(
        page.getByRole("button", { name: /add note/i }).first(),
      ).toBeVisible();
      const searchBox = page.getByPlaceholder(/search notes/i);
      if ((await searchBox.count()) > 0) {
        await expect(searchBox).toBeVisible();
      }
    });
  });

  test.describe("Orgs Notes Tab", () => {
    test("shows notes tab on org detail page", async ({ page }) => {
      await gotoAppRoute(page, "/orgs");
      await expect(page.getByRole("heading", { name: /^organizations$/i })).toBeVisible({
        timeout: 15000,
      });

      // Click on first org in list
      const orgLink = page.getByRole("link", { name: /[a-z]/i }).first();
      await orgLink.click();

      // Wait for detail page to load
      await expect(page.getByRole("tab", { name: /overview/i })).toBeVisible({
        timeout: 15000,
      });

      // Click on Notes tab
      await page.getByRole("tab", { name: /notes/i }).click();

      // Should see search input and add note button
      await expect(page.getByPlaceholder(/search notes/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /add note/i })).toBeVisible();
    });
  });
});
