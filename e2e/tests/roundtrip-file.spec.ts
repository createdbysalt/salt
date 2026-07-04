import { test, expect } from "@playwright/test";
import { gotoAppRoute } from "../utils/navigation";
import {
  createBlankRecord,
  editInlineText,
  nameOneOf,
  pickInlineSelect,
  reloadWithRetry,
} from "../utils/roundtrip";

test.use({ storageState: "./fixtures/auth.json" });

/**
 * Round-trip persistence: File detail (preview modal at /files?preview=<id>).
 * "Add file" creates a blank link-kind file via UI (no upload needed).
 *
 * Field contract notes (keeper-field-contracts canon):
 * - Kind is system_derived (read-only editor) — not exercised.
 * - Description is the allow-listed ask-first text field.
 * - Category is a canonical vocabulary (file_category).
 */

const FILE_CATEGORY_LABELS = [
  "Brand Asset",
  "Deliverable",
  "Contract",
  "Invoice",
  "Proposal",
  "Reference",
  "Media",
  "Notes",
  "Process",
  "Screenshot",
  "Other",
];

const BLANK_FILE_DESCRIPTION = "Add a link or replace this placeholder URL.";

test.describe("Round-trip: File", () => {
  test("file field edits persist across reload and appear in Activity", async ({ page }) => {
    test.slow();
    const marker = `RT-file ${Date.now()}`;
    const description = `RT description ${Date.now()}`;

    // 1. Create a blank link-kind file from the directory.
    await gotoAppRoute(page, "/files");
    await createBlankRecord(page, /add file/i, /\/files\?preview=/);

    // The file detail is a modal dialog (first dialog; select popovers stack after it).
    const modal = page.getByRole("dialog").first();
    await expect(
      modal.getByRole("button", { name: "Untitled file", exact: true }),
    ).toBeVisible({ timeout: 30_000 });

    // 2. Edit: name + description (free text), category (canonical select) Other → Reference.
    await editInlineText(page, modal, nameOneOf("Untitled file"), marker);
    await editInlineText(
      page,
      modal,
      nameOneOf(BLANK_FILE_DESCRIPTION, "Add description..."),
      description,
    );
    await pickInlineSelect(page, modal, nameOneOf(...FILE_CATEGORY_LABELS), "Reference");

    // 3. Reload (preview param keeps the modal open) → persisted.
    await reloadWithRetry(page);
    const modalAfter = page.getByRole("dialog").first();
    await expect(
      modalAfter.getByRole("button", { name: marker, exact: true }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      modalAfter.getByRole("button", { name: description, exact: true }),
    ).toBeVisible();
    // .first(): the Tags section renders a suggested-tag chip also named
    // "Reference"; the Category select trigger comes first in the dialog.
    await expect(
      modalAfter.getByRole("button", { name: "Reference", exact: true }).first(),
    ).toBeVisible();

    // 4. Activity: inline file field edits write NO provenance yet —
    //    profile_field_provenance's entity_type CHECK does not admit files
    //    (documented gap in app/_features/files/utils/activity.ts). What IS
    //    contracted: file_activities / bootstrap entries (creation, metadata
    //    snapshots) render on the Activity tab.
    //    TODO(field-contracts Phase 3): assert "You updated description"
    //    once file provenance lands.
    await modalAfter.getByRole("button", { name: /^activity$/i }).click();
    await expect(
      modalAfter.getByText(/added|created|updated|uploaded/i).first(),
    ).toBeVisible({ timeout: 20_000 });

    // 5. No restore needed: fresh record each run (left behind with RT- marker).
  });
});
