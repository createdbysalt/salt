import { test, expect } from "@playwright/test";
import { gotoAppRoute } from "../utils/navigation";
import {
  createBlankRecord,
  editInlineText,
  nameOneOf,
  openActivityTab,
  overviewPanel,
  pickInlineSelect,
  reloadWithRetry,
} from "../utils/roundtrip";

test.use({ storageState: "./fixtures/auth.json" });

/**
 * Round-trip persistence: Person detail page.
 *
 * Kills the silent no-op-editor bug class: edit → reload → value survived →
 * Activity shows the edit (keeper-field-contracts canon, memory-activity parity).
 *
 * Creates a fresh blank person each run ("Add person" → blank record), so
 * reruns are serial-safe without restore. The record is left behind, named
 * with an RT- marker for identification.
 */

const RELATIONSHIP_LABELS = [
  "Client",
  "Prospect",
  "Lead",
  "Past Client",
  "Team",
  "Partner",
  "Vendor",
  "Personal",
  "Unknown",
];

test.describe("Round-trip: Person", () => {
  test("person field edits persist across reload and appear in Activity", async ({ page }) => {
    test.slow();
    const marker = `RT-person ${Date.now()}`;
    const email = `rt-${Date.now()}@roundtrip.test`;
    const jobTitle = `RT title ${Date.now()}`;

    // 1. Create a blank person from the directory.
    await gotoAppRoute(page, "/people");
    await createBlankRecord(page, /add person/i, /\/people\/[0-9a-f-]{36}/);

    const panel = overviewPanel(page);
    await expect(panel.getByRole("button", { name: "Untitled", exact: true })).toBeVisible({
      timeout: 30_000,
    });

    // 2. Edit: name (free text), email (free text), job title (free text),
    //    relationship (canonical vocabulary select) → Lead.
    await editInlineText(page, panel, nameOneOf("Untitled"), marker);
    await editInlineText(page, panel, nameOneOf("Add email"), email);
    await editInlineText(page, panel, nameOneOf("Add job title"), jobTitle);
    await pickInlineSelect(page, panel, nameOneOf(...RELATIONSHIP_LABELS), "Lead");

    // 3. Reload → values persisted (server round-trip, not client state).
    await reloadWithRetry(page);
    const panelAfter = overviewPanel(page);
    await expect(
      panelAfter.getByRole("button", { name: marker, exact: true }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(panelAfter.getByRole("button", { name: email, exact: true })).toBeVisible();
    await expect(panelAfter.getByRole("button", { name: jobTitle, exact: true })).toBeVisible();
    await expect(panelAfter.getByRole("button", { name: "Lead", exact: true })).toBeVisible();

    // 4. Activity parity: manual field edits write profile_field_provenance
    //    → "You updated <field>" entries.
    await openActivityTab(page);
    await expect(
      page.getByText(/you updated (email|job title|relationship)/i).first(),
    ).toBeVisible({ timeout: 20_000 });

    // 5. No restore needed: this spec created its own record. (TrustRow
    //    Archive/Delete are now wired to the real trash actions if cleanup is
    //    ever wanted here.)
  });
});
