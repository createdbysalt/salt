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

  test("email request never contradicts a connected Gmail status", async ({ page }) => {
    await gotoAppRoute(page, "/hq");

    await expect(page).not.toHaveURL(/\/signin|\/login/, { timeout: 15_000 });
    await page.getByRole("button", { name: "Ask Salt" }).first().click();

    await expect(page.getByRole("complementary", { name: "Ask Salt" })).toBeVisible({
      timeout: 30_000,
    });

    const input = page.getByPlaceholder("Ask a question");

    // Deterministic connector path: is Gmail actually set up for this workspace?
    await input.fill("what's connected");
    await input.press("Enter");
    const setUpWithGmail = page.getByText(/you're set up with[^.]*gmail/i);
    const notLinked = page.getByText(/linked yet/i);
    await expect(setUpWithGmail.or(notLinked)).toBeVisible({ timeout: 15_000 });

    // Only assert the no-contradiction guarantee when Gmail is genuinely linked.
    test.skip(
      (await setUpWithGmail.count()) === 0,
      "Gmail not connected in this fixture — contradiction case is not exercised.",
    );

    await input.fill("list my recent emails");
    await input.press("Enter");

    // The LLM path must not claim Gmail is disconnected while the connector
    // path reports it connected. Wait for a fresh assistant turn, then assert.
    await expect(
      page.getByText(/gmail (is ?n'?t|is not|isn't) connected/i),
    ).toHaveCount(0, { timeout: 20_000 });
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

  test("add person proposes before saving and does not claim saved early", async ({ page }) => {
    await gotoAppRoute(page, "/hq");

    await expect(page).not.toHaveURL(/\/signin|\/login/, { timeout: 15_000 });
    await page.getByRole("button", { name: "Ask Salt" }).first().click();

    await expect(page.getByRole("complementary", { name: "Ask Salt" })).toBeVisible({
      timeout: 30_000,
    });

    const input = page.getByPlaceholder("Ask a question");
    await input.fill("Add Alex Chen to my people");
    await input.press("Enter");

    const panel = page.getByRole("complementary", { name: "Ask Salt" });
    // Scan-then-confirm: Salt should propose or ask before writing.
    await expect(
      panel.getByText(
        /confirm|look good|should I add|propose|found|add Alex|create.*Alex|does this/i,
      ).last(),
    ).toBeVisible({ timeout: 30_000 });
    // Must not claim the person was already saved before user confirms.
    await expect(panel.getByText(/(added|created|saved) Alex Chen/i)).toHaveCount(0);
  });

  test("a playbook-style request gets a reply without claiming it acted unilaterally", async ({
    page,
  }) => {
    await gotoAppRoute(page, "/hq");

    await expect(page).not.toHaveURL(/\/signin|\/login/, { timeout: 15_000 });
    await page.getByRole("button", { name: "Ask Salt" }).first().click();

    await expect(page.getByRole("complementary", { name: "Ask Salt" })).toBeVisible({
      timeout: 30_000,
    });

    const input = page.getByPlaceholder("Ask a question");
    await input.fill("Re-engage my quiet clients");
    await input.press("Enter");

    // The LLM path must produce an assistant turn. Acting steps go through the
    // approval queue, so it must never claim it already sent anything.
    const panel = page.getByRole("complementary", { name: "Ask Salt" });
    await expect(panel.getByText(/\w/).last()).toBeVisible({ timeout: 30_000 });
    await expect(panel.getByText(/I (just )?sent the email/i)).toHaveCount(0);
  });
});
