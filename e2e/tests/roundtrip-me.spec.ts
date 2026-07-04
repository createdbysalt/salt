import { test, expect } from "@playwright/test";
import { gotoAppRoute } from "../utils/navigation";
import {
  editInlineText,
  nameOneOf,
  openActivityTab,
  overviewPanel,
  pickInlineSelect,
  reloadWithRetry,
} from "../utils/roundtrip";

test.use({ storageState: "./fixtures/auth.json" });

/**
 * Round-trip persistence: Me (operator record).
 *
 * Me is a singleton — there is nothing to create, so this spec edits existing
 * fields and RESTORES the originals at the end (best effort) to keep reruns
 * stable. Field matchers accept the empty-state placeholder, any vocabulary
 * label, or an RT- sentinel left by a crashed previous run.
 */

const WORKING_HOURS_PLACEHOLDER = "9am–6pm ET";
const PAYMENT_TERMS_PLACEHOLDER = "Select terms";
const PAYMENT_TERMS_LABELS = [
  "Due on Receipt",
  "Net 15",
  "Net 30",
  "Net 45",
  "Net 60",
  "Custom",
];

test.describe("Round-trip: Me", () => {
  test("me field edits persist across reload and appear in Activity", async ({ page }) => {
    test.slow();
    const marker = `RT-me hours ${Date.now()}`;

    await gotoAppRoute(page, "/me");
    const panel = overviewPanel(page);

    // --- Working hours (free text, user_only per canon) ---
    const hoursMatcher = new RegExp(
      `^(${WORKING_HOURS_PLACEHOLDER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}|RT-me hours .*)$`,
    );
    const hoursButton = panel.getByRole("button", { name: hoursMatcher }).first();
    await expect(hoursButton).toBeVisible({ timeout: 30_000 });
    const originalHours = (await hoursButton.innerText()).trim();

    await editInlineText(page, panel, hoursMatcher, marker);

    // --- Default payment terms (canonical payment_terms vocabulary) ---
    const termsMatcher = nameOneOf(PAYMENT_TERMS_PLACEHOLDER, ...PAYMENT_TERMS_LABELS);
    const termsButton = panel.getByRole("button", { name: termsMatcher }).first();
    await expect(termsButton).toBeVisible({ timeout: 15_000 });
    const originalTerms = (await termsButton.innerText()).trim();
    const targetTerms = originalTerms === "Net 15" ? "Net 30" : "Net 15";

    await pickInlineSelect(page, panel, termsMatcher, targetTerms);

    // Reload → persisted.
    await reloadWithRetry(page);
    const panelAfter = overviewPanel(page);
    await expect(
      panelAfter.getByRole("button", { name: marker, exact: true }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      panelAfter.getByRole("button", { name: targetTerms, exact: true }),
    ).toBeVisible();

    // Activity parity: operator/workspace provenance → "You updated <field>".
    await openActivityTab(page);
    await expect(page.getByText(/you updated/i).first()).toBeVisible({ timeout: 20_000 });

    // Restore originals (best effort).
    await page.getByRole("tab", { name: /overview/i }).click();
    const restorePanel = overviewPanel(page);

    // Working hours: back to original value, or cleared if it was the placeholder.
    const restoreHoursValue = originalHours === WORKING_HOURS_PLACEHOLDER ? "" : originalHours;
    await editInlineText(
      page,
      restorePanel,
      nameOneOf(marker),
      restoreHoursValue,
    );

    // Payment terms: the select has no "unset" option, so only restore when
    // the original state was a real vocabulary value.
    if (PAYMENT_TERMS_LABELS.includes(originalTerms)) {
      await pickInlineSelect(page, restorePanel, termsMatcher, originalTerms);
    }
  });
});
