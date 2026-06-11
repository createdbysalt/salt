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

    const input = page.getByPlaceholder("Ask a question");
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

  test("starter action appends to the thread and shows suggestion chips", async ({ page }) => {
    const panel = await openAskSalt(page);

    await panel.getByRole("button", { name: "Capture to Memory" }).click();

    await expect(panel.getByText(/what should i remember/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      panel.getByRole("button", { name: "Client prefers email over text" }),
    ).toBeVisible();
  });
});
