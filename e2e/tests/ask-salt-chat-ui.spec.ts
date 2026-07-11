import { expect, test, type Page } from "@playwright/test";
import { gotoAppRoute } from "../utils/navigation";

test.use({ storageState: "./fixtures/auth.json" });

/**
 * Opens the Ask Salt panel, retrying the trigger click — on cold dev-server
 * compiles the header button can render before hydration attaches handlers,
 * silently swallowing the first click.
 */
async function openAskSalt(page: Page) {
  await gotoAppRoute(page, "/hq");
  await expect(page).not.toHaveURL(/\/signin|\/login/, { timeout: 15_000 });

  const panel = page.getByRole("complementary", { name: "Ask Salt" });
  await expect(async () => {
    await page.getByRole("button", { name: "Ask Salt" }).first().click();
    await expect(panel).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 45_000 });

  return panel;
}

/**
 * Vercel-style chat UI in the Ask Salt panel: unified message stream,
 * bubble rendering, suggestion chips, and scroll affordance.
 */
test.describe("Ask Salt chat UI", () => {
  test("tool chat renders user bubble and streamed assistant reply", async ({ page }) => {
    const panel = await openAskSalt(page);

    const input = page.getByPlaceholder(/What should Salt handle/i);
    await input.fill("Summarize my unread email");
    await input.press("Enter");

    // The sent prompt appears as a right-aligned user bubble in the thread.
    await expect(panel.getByText("Summarize my unread email")).toBeVisible({
      timeout: 15_000,
    });

    // The assistant reply streams through the unified UIMessage path. In
    // environments without Composio or a Google connection the route streams a
    // deterministic fallback; with tools connected any reply text qualifies.
    await expect(
      panel
        .locator('[data-role="assistant"]')
        .filter({ hasText: /./ })
        .last(),
    ).toBeVisible({ timeout: 30_000 });
  });

  test("thread exposes a scroll-to-bottom affordance", async ({ page }) => {
    const panel = await openAskSalt(page);

    await expect(
      panel.getByRole("button", { name: "Scroll to bottom" }),
    ).toHaveCount(1);
  });

  test("starter action focuses the composer with suggestion chips", async ({ page }) => {
    const panel = await openAskSalt(page);

    await panel.getByRole("button", { name: "Search or add Memory" }).click();

    await expect(panel.getByTestId("ask-salt-composer-guide")).toBeVisible({
      timeout: 15_000,
    });
    await expect(panel.getByText("Search or add Memory").first()).toBeVisible();
    await expect(
      panel.getByPlaceholder(/what should i search for or add/i),
    ).toBeVisible();
    await expect(
      panel.locator('[data-testid="ask-salt-composer-guide"] button').first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(panel.getByText("Search or add Memory", { exact: true })).toHaveCount(1);
  });
});
