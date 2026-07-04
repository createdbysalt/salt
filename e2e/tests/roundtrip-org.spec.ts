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
 * Round-trip persistence: Org detail page.
 *
 * NOTE — PRODUCT BUG (found by this suite, do not work around in app code):
 * "Add organization" on /orgs is a reproducible silent no-op once an
 * "Untitled organization" already exists: MemoryListAddButton's transition
 * swallows the thrown error (likely a duplicate slug in createOrganization,
 * which — unlike work's ensureUniqueProjectSlug — has no dedupe), so the
 * button shows no toast and never navigates. This spec therefore opens an
 * EXISTING org from the directory instead of creating one, and restores the
 * original values at the end.
 */

// Org-scoped relationship vocabulary (person-only values team/personal hidden).
const ORG_RELATIONSHIP_LABELS = [
  "Client",
  "Prospect",
  "Lead",
  "Past Client",
  "Partner",
  "Vendor",
  "Unknown",
];

// Matches the org left by earlier runs of this spec (crashed runs included).
const TARGET_ORG = /^(Untitled organization|RT-org \d+)$/;

test.describe("Round-trip: Org", () => {
  test("org field edits persist across reload and appear in Activity", async ({ page }) => {
    test.slow();
    const marker = `RT-org ${Date.now()}`;
    const billingEmail = `rt-org-${Date.now()}@roundtrip.test`;

    // 1. Open an existing org from the directory.
    await gotoAppRoute(page, "/orgs");
    const orgEntry = page.getByText(TARGET_ORG).first();
    if (!(await orgEntry.isVisible().catch(() => false))) {
      test.skip(
        true,
        "No roundtrip target org in this workspace and 'Add organization' is a known silent no-op (see spec header).",
      );
    }
    const originalName = (await orgEntry.innerText()).trim();
    await orgEntry.click();
    await page.waitForURL(/\/orgs\/[0-9a-f-]{36}/, { timeout: 60_000 });

    const panel = overviewPanel(page);
    await expect(
      panel.getByRole("button", { name: originalName, exact: true }),
    ).toBeVisible({ timeout: 30_000 });

    // Capture the current relationship for restore.
    const relTrigger = panel
      .getByRole("button", { name: nameOneOf(...ORG_RELATIONSHIP_LABELS) })
      .first();
    await expect(relTrigger).toBeVisible({ timeout: 15_000 });
    const originalRelationship = (await relTrigger.innerText()).trim();
    const targetRelationship = originalRelationship === "Vendor" ? "Partner" : "Vendor";

    // 2. Edit: name + billing email (free text), relationship (canonical select).
    await editInlineText(page, panel, nameOneOf(originalName), marker);
    await editInlineText(
      page,
      panel,
      /^(Add billing email|rt-org-\d+@roundtrip\.test)$/,
      billingEmail,
    );
    await pickInlineSelect(
      page,
      panel,
      nameOneOf(...ORG_RELATIONSHIP_LABELS),
      targetRelationship,
    );

    // 3. Reload → persisted.
    await reloadWithRetry(page);
    const panelAfter = overviewPanel(page);
    await expect(
      panelAfter.getByRole("button", { name: marker, exact: true }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      panelAfter.getByRole("button", { name: billingEmail, exact: true }),
    ).toBeVisible();
    await expect(
      panelAfter.getByRole("button", { name: targetRelationship, exact: true }),
    ).toBeVisible();

    // 4. Activity parity: org name / billing-email manual edits write
    //    profile_field_provenance → "You updated <field>" entries. (Previously
    //    a parity gap: provenance inserts silently failed on the blueprint_slug
    //    FK when playbook seeds were missing — fixed in
    //    records-engine/write-provenance.ts.) The relationship edit still
    //    renders as a lifecycle entry.
    await openActivityTab(page);
    await expect(
      page.getByText(/you updated (name|billing email)/i).first(),
    ).toBeVisible({ timeout: 20_000 });

    // 5. Restore originals (best effort) so reruns stay stable.
    await page.getByRole("tab", { name: /overview/i }).click();
    const restorePanel = overviewPanel(page);
    await editInlineText(page, restorePanel, nameOneOf(marker), originalName);
    if (ORG_RELATIONSHIP_LABELS.includes(originalRelationship)) {
      await pickInlineSelect(
        page,
        restorePanel,
        nameOneOf(...ORG_RELATIONSHIP_LABELS),
        originalRelationship,
      );
    }
  });
});
