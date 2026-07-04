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
 * Round-trip persistence: Work detail page.
 * Fresh blank work item per run ("Add work"), created with status=active.
 * Status is flipped Active → On Hold → (restore) Active per the work_status
 * vocabulary in the taxonomy registry.
 */

const WORK_STATUS_LABELS = ["Draft", "Signed", "Active", "On Hold", "Completed", "Archived"];

test.describe("Round-trip: Work", () => {
  test("work field edits persist across reload and appear in Activity", async ({ page }) => {
    test.slow();
    const marker = `RT-work ${Date.now()}`;
    const timeline = `RT ${Date.now()} weeks`;

    // 1. Create a blank work item from the directory.
    await gotoAppRoute(page, "/work");
    await createBlankRecord(page, /add work/i, /\/work\/[0-9a-f-]{36}/);

    const panel = overviewPanel(page);
    await expect(
      panel.getByRole("button", { name: "Untitled work", exact: true }),
    ).toBeVisible({ timeout: 30_000 });

    // 2. Edit: name + timeline (free text), status (canonical select) Active → On Hold.
    await editInlineText(page, panel, nameOneOf("Untitled work"), marker);
    await editInlineText(page, panel, nameOneOf("Add timeline"), timeline);
    await pickInlineSelect(page, panel, nameOneOf(...WORK_STATUS_LABELS), "On Hold");

    // 3. Reload → persisted.
    await reloadWithRetry(page);
    const panelAfter = overviewPanel(page);
    await expect(
      panelAfter.getByRole("button", { name: marker, exact: true }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      panelAfter.getByRole("button", { name: timeline, exact: true }),
    ).toBeVisible();
    await expect(
      panelAfter.getByRole("button", { name: "On Hold", exact: true }),
    ).toBeVisible();

    // 4. Activity parity: manual Details edits write profile_field_provenance
    //    → "You updated <field>" entries. (Previously a parity gap: provenance
    //    inserts silently failed on the blueprint_slug FK when playbook seeds
    //    were missing — fixed in records-engine/write-provenance.ts.)
    await openActivityTab(page);
    await expect(
      page.getByText(/you updated (name|status|estimated timeline)/i).first(),
    ).toBeVisible({ timeout: 20_000 });

    // 5. Restore status → Active so the record reads sane if inspected later.
    await page.getByRole("tab", { name: /overview/i }).click();
    await pickInlineSelect(
      page,
      overviewPanel(page),
      nameOneOf(...WORK_STATUS_LABELS),
      "Active",
    );
  });
});
