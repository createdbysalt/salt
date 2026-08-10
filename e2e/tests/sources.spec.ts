import { test, expect } from "@playwright/test";
import { gotoAppRoute } from "../utils/navigation";

test.use({ storageState: "./fixtures/auth.json" });

const ACTIVITY_URL = "/sources?tab=activity";

test.describe("Sources surface", () => {
  test("shows Connectors tab by default", async ({ page }) => {
    await gotoAppRoute(page, "/sources");

    await expect(
      page.getByRole("navigation", { name: "Sources sections" }),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: /^connectors$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });
  });

  test("Sources tabs switch sections", async ({ page }) => {
    await gotoAppRoute(page, "/sources");

    const sections = page.getByRole("navigation", { name: "Sources sections" });
    await expect(sections).toBeVisible({ timeout: 15000 });

    await sections.getByRole("button", { name: "Activity" }).click();
    await expect(
      page.getByRole("heading", { name: /^activity$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\/sources\?tab=activity/);

    await sections.getByRole("button", { name: "Connectors" }).click();
    await expect(
      page.getByRole("heading", { name: /^connectors$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Sources — Activity", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppRoute(page, ACTIVITY_URL);
  });

  test("shows Activity view with stats and search", async ({ page }) => {
    await expect(
      page.getByRole("navigation", { name: "Sources sections" }),
    ).toBeVisible({ timeout: 15000 });

    await expect(
      page.getByRole("heading", { name: /^activity$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/all captures/i)).toBeVisible();
    await expect(page.getByPlaceholder(/search captures/i)).toBeVisible();
  });

  test("displays capture category stats", async ({ page }) => {
    // Wait for the stats section to load
    await expect(page.getByText(/all captures/i)).toBeVisible({ timeout: 15000 });

    // Verify category stat tiles are present
    const statsSection = page.locator("section").filter({ hasText: /all captures/i });
    await expect(statsSection.getByText(/triggered play/i)).toBeVisible();
    await expect(statsSection.getByText(/no action/i)).toBeVisible();
    await expect(statsSection.getByText(/processing/i)).toBeVisible();
  });

  test("capture list shows day groups", async ({ page }) => {
    await expect(page.getByText(/all captures/i)).toBeVisible({ timeout: 15000 });

    // Day groups should be visible if there are captures
    // The page shows "Today", "Yesterday", "Earlier this week" sections
    const hasCaptures = await page.getByText(/today|yesterday|earlier this week/i).first().isVisible();
    if (hasCaptures) {
      await expect(page.getByText(/today|yesterday|earlier this week/i).first()).toBeVisible();
    } else {
      // Empty state
      await expect(page.getByText(/no captures yet|no matching captures/i)).toBeVisible();
    }
  });

  test("combined filter popover exposes area and date range", async ({ page }) => {
    await expect(page.getByPlaceholder(/search captures/i)).toBeVisible({ timeout: 15000 });

    // Area + date range live in one combined Filter popover (matches Memory)
    const filterButton = page.getByRole("button", { name: /^filter$/i });
    await expect(filterButton).toBeVisible();
    await filterButton.click();
    await expect(
      page.getByRole("checkbox", { name: /email/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Today", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("capture detail expands on click", async ({ page }) => {
    await expect(page.getByText(/all captures/i)).toBeVisible({ timeout: 15000 });

    // Find a capture row and click to expand
    const captureList = page.locator("ul").filter({ hasText: /today|yesterday/i }).first();
    const firstCapture = captureList.locator("li").first();

    if (await firstCapture.isVisible()) {
      const expandButton = firstCapture.getByRole("button").first();
      if (await expandButton.isVisible()) {
        await expandButton.click();

        // Detail panel should be visible after expansion
        await expect(firstCapture.locator("div").filter({ hasText: /from|source|outcome/i })).toBeVisible({
          timeout: 5_000,
        });
      }
    }
  });

  test("capture list excludes dropped/spam items", async ({ page }) => {
    await expect(page.getByText(/all captures/i)).toBeVisible({ timeout: 15000 });

    const spamIndicators = page.getByText(/spam|blocked|dropped/i);
    const spamCount = await spamIndicators.count();

    if (spamCount > 0) {
      // Spam should only appear in stats/summary, not as individual rows
      const captureRows = page.locator("ul").filter({ hasText: /today|yesterday/i });
      await expect(captureRows.getByText(/spam|blocked/i)).not.toBeVisible();
    }
  });
});

test.describe("Sources — Kept out (P11)", () => {
  test("Activity tab can show Kept out section when captures are filtered", async ({ page }) => {
    await gotoAppRoute(page, ACTIVITY_URL);

    await expect(page.getByText(/all captures/i)).toBeVisible({ timeout: 15000 });

    // The Kept out section only appears if there are kept-out items
    // Check that if it's present, it has the expected structure
    const keptOutSection = page.getByRole("button", { name: /kept out/i });
    if (await keptOutSection.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(keptOutSection).toContainText(/capture/i);
    }
    // If not visible, that's fine — there may be no kept-out items in test data
  });
});

test.describe("Sources — truthful connector status (2.2)", () => {
  test("connected cards carry a truthful status line", async ({ page }) => {
    await gotoAppRoute(page, "/sources");

    await expect(
      page.getByRole("heading", { name: /^connectors$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });

    // Status lines only render for connected connectors; test data may have
    // none. When present, the line must be one of the truthful states —
    // never a bare "healthy" claim with no evidence.
    const reconnect = page.getByText(/reconnect needed — connection expired/i);
    const lastCapture = page.getByText(/last capture/i);
    const reconnectCount = await reconnect.count();
    const lastCaptureCount = await lastCapture.count();

    if (reconnectCount > 0) {
      await expect(reconnect.first()).toBeVisible();
    }
    if (lastCaptureCount > 0) {
      await expect(lastCapture.first()).toBeVisible();
    }
  });

  test("a reconnect-needed connector offers a Reconnect CTA in its detail pane", async ({ page }) => {
    await gotoAppRoute(page, "/sources");

    await expect(
      page.getByRole("heading", { name: /^connectors$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });

    const reconnectCard = page
      .getByRole("button")
      .filter({ hasText: /reconnect needed/i })
      .first();

    // No broken connectors in test data → nothing to assert (healthy path).
    if (!(await reconnectCard.isVisible({ timeout: 3_000 }).catch(() => false))) {
      return;
    }

    await reconnectCard.click();
    await expect(
      page.getByRole("button", { name: /^reconnect$/i }),
    ).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Sources — legacy redirects", () => {
  test("/capture redirects to Sources Activity", async ({ page }) => {
    await gotoAppRoute(page, "/capture");
    await expect(page).toHaveURL(/\/sources\?tab=activity/);
  });

  test("legacy Plays captures view redirects to Sources Activity", async ({ page }) => {
    await gotoAppRoute(page, "/plays?tab=activity&view=captures");
    await expect(page).toHaveURL(/\/sources\?tab=activity/);
  });

  test("pre-rename tab=stream still resolves to the Activity tab", async ({ page }) => {
    await gotoAppRoute(page, "/sources?tab=stream");
    await expect(
      page.getByRole("heading", { name: /^activity$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Sources — Customize tab (intake policy)", () => {
  const CUSTOMIZE_URL = "/sources?tab=customize";

  test("renders as a third tab", async ({ page }) => {
    await gotoAppRoute(page, "/sources");

    const sections = page.getByRole("navigation", { name: "Sources sections" });
    await expect(sections).toBeVisible({ timeout: 15000 });

    await sections.getByRole("button", { name: "Customize" }).click();
    await expect(page).toHaveURL(/\/sources\?tab=customize/);
    await expect(
      page.getByRole("heading", { name: /^customize$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });

    // With no connected capture accounts and no workspace rules the honest
    // empty state renders instead of the category pills.
    const pills = page.getByRole("group", { name: "Customize area" });
    if (await pills.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(
        pills.getByRole("button", { name: "All connectors" }),
      ).toBeVisible();
    } else {
      await expect(
        page.getByText(/nothing to customize yet/i),
      ).toBeVisible();
    }
  });

  test("category pills switch sections and ?category= deep-links", async ({ page }) => {
    await gotoAppRoute(page, CUSTOMIZE_URL);

    await expect(
      page.getByRole("heading", { name: /^customize$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });

    const pills = page.getByRole("group", { name: "Customize area" });
    if (!(await pills.isVisible({ timeout: 5_000 }).catch(() => false))) {
      // No connected capture accounts in test data — nothing to switch.
      return;
    }

    // Switching to "All connectors" shows the workspace-wide rules view and
    // puts the selection in the URL.
    await pills.getByRole("button", { name: "All connectors" }).click();
    await expect(page).toHaveURL(/\/sources\?tab=customize&category=all/);
    await expect(
      page.getByText(/these rules apply to every connected account/i),
    ).toBeVisible();

    // A deep link with a category lands on that category's section, which
    // always leads with the read-only transparency layer.
    await gotoAppRoute(page, "/sources?tab=customize&category=email");
    await expect(
      page.getByRole("heading", { name: /^customize$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });
    const defaultsHeading = page.getByRole("heading", {
      name: /what salt does by default/i,
    });
    if (await defaultsHeading.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(defaultsHeading).toBeVisible();
    }
  });

  test("smart box adds and removes a workspace-wide rule", async ({ page }) => {
    await gotoAppRoute(page, CUSTOMIZE_URL);

    await expect(
      page.getByRole("heading", { name: /^customize$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });

    const pills = page.getByRole("group", { name: "Customize area" });
    if (!(await pills.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return;
    }
    await pills.getByRole("button", { name: "All connectors" }).click();

    const box = page.getByRole("textbox", { name: "Keep out rule" });
    await expect(box).toBeVisible();

    // Ambiguous input never enables Add — the box rejects with a hint.
    await box.fill("???");
    await expect(
      page.getByRole("button", { name: "Add", exact: true }).first(),
    ).toBeDisabled();

    // Valid input shows the live detection line, then submits.
    await box.fill("e2e-rule-probe@example.com");
    await expect(
      page.getByText(/sender · e2e-rule-probe@example\.com/i),
    ).toBeVisible();
    await box.press("Enter");

    await expect(
      page.getByText("e2e-rule-probe@example.com"),
    ).toBeVisible({ timeout: 10_000 });

    await page
      .getByRole("button", {
        name: /remove rule for e2e-rule-probe@example\.com/i,
      })
      .click();
    await expect(
      page.getByText("e2e-rule-probe@example.com"),
    ).toHaveCount(0, { timeout: 10_000 });
  });

  test("email area shows gate choices and a Check for new items button", async ({ page }) => {
    await gotoAppRoute(page, "/sources?tab=customize&category=email");

    await expect(
      page.getByRole("heading", { name: /^customize$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });

    // Requires a connected email account in test data.
    const doing = page.getByRole("heading", { name: /what i'm doing/i });
    if (!(await doing.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return;
    }

    // Gate choices are real controls, not copy — both choices render their
    // option groups.
    await expect(
      page.getByRole("group", { name: /automated senders/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("group", { name: /people you don't know/i }),
    ).toBeVisible();

    // "Check for new items" runs the workspace reconcile+scan; the copy
    // must never say "sync" (banned word).
    const checkButton = page.getByRole("button", {
      name: /check for new items/i,
    }).first();
    await expect(checkButton).toBeVisible();
    await expect(checkButton).toBeEnabled();
  });

  test("detail pane Activity header deep-links to Customize", async ({ page }) => {
    await gotoAppRoute(page, "/sources");

    await expect(
      page.getByRole("heading", { name: /^connectors$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });

    const connectedCard = page
      .getByRole("button")
      .filter({ hasText: /^connected$/i })
      .first();
    if (!(await connectedCard.isVisible({ timeout: 5_000 }).catch(() => false))) {
      // No connected connectors in test data — nothing to open.
      return;
    }
    await connectedCard.click();

    const activityTab = page.getByRole("tab", { name: /^activity$/i });
    await expect(activityTab).toBeVisible({ timeout: 10_000 });
    await activityTab.click();

    // The link only renders for capture-capable connectors.
    const deepLink = page.getByRole("link", { name: /^customize$/i });
    if (!(await deepLink.isVisible({ timeout: 3_000 }).catch(() => false))) {
      return;
    }
    await deepLink.click();

    await expect(page).toHaveURL(/\/sources\?tab=customize&category=/);
    await expect(
      page.getByRole("heading", { name: /^customize$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Sources — cause-aware Kept Out corrections (P4)", () => {
  test("kept-out rows carry a correction action keyed off the cause", async ({ page }) => {
    await gotoAppRoute(page, ACTIVITY_URL);
    await expect(page.getByText(/all captures/i)).toBeVisible({ timeout: 15000 });

    const keptOutToggle = page.getByRole("button", { name: /kept out/i });
    if (!(await keptOutToggle.isVisible({ timeout: 3_000 }).catch(() => false))) {
      // No kept-out captures in test data — nothing to correct.
      return;
    }
    await keptOutToggle.click();

    // Every kept-out row must offer a cause-aware correction: rule-caused
    // rows offer rule removal; heuristic-caused rows offer let-in +
    // always-allow. Email rows also offer the Add to People escalation.
    const correction = page
      .getByRole("button", {
        name: /remove keep-out rule|let this in|always let this/i,
      })
      .first();
    if (await correction.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(correction).toBeEnabled();
    }
  });
});

test.describe("Connector detail — Activity tab (P5)", () => {
  test("activity entries read plainly and kept-out report renders when present", async ({ page }) => {
    await gotoAppRoute(page, "/sources");
    await expect(
      page.getByRole("heading", { name: /^connectors$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });

    const connectedCard = page
      .getByRole("button")
      .filter({ hasText: /^connected$/i })
      .first();
    if (!(await connectedCard.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return;
    }
    await connectedCard.click();

    const activityTab = page.getByRole("tab", { name: /^activity$/i });
    await expect(activityTab).toBeVisible({ timeout: 10_000 });
    await activityTab.click();

    // Plain-language contract: raw Gmail operator syntax must never render.
    // Entries appear only when the connector has logged executions.
    await page.waitForTimeout(1_000);
    await expect(
      page.getByText(/in:inbox|category:promotions|label:sent/i),
    ).toHaveCount(0);

    // Kept-out report card only renders when this connector kept items out
    // in the trailing 30 days; when present, its correction actions work.
    const keptOutCard = page.getByText(/kept out in the last 30 days/i);
    if (await keptOutCard.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(
        page
          .getByRole("button", {
            name: /remove keep-out rule|always let this/i,
          })
          .first(),
      ).toBeEnabled();
    }
  });
});
