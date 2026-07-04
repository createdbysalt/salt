import { test, expect } from "@playwright/test";
import { gotoAppRoute } from "../utils/navigation";
import {
  createBlankRecord,
  displayDate,
  editInlineDate,
  editInlineText,
  nameOneOf,
  openActivityTab,
  overviewPanel,
  pickInlineSelect,
  reloadWithRetry,
} from "../utils/roundtrip";

test.use({ storageState: "./fixtures/auth.json" });

/**
 * Round-trip persistence: Billing detail page.
 * "Add invoice" creates a blank receivable draft record via UI (no seed
 * endpoint needed). Exercises the new allow-listed updateBillingRecordField
 * action (status validated against the billing_status vocabulary, provenance
 * written per memory-activity parity).
 */

const BILLING_STATUS_LABELS = [
  "Draft",
  "Due",
  "Overdue",
  "Paid",
  "Partial",
  "Refunded",
  "Disputed",
];

test.describe("Round-trip: Billing", () => {
  test("billing field edits persist across reload and appear in Activity", async ({ page }) => {
    test.slow();
    const invoiceNumber = `RT-INV-${Date.now()}`;
    const dueIso = "2026-08-14";

    // 1. Create a blank invoice from the billing directory (receivable tab is default).
    await gotoAppRoute(page, "/billing");
    await createBlankRecord(page, /add invoice/i, /\/billing\/[0-9a-f-]{36}/);

    // Blank billing drafts are pre-filled (buildBlankBillingDraft): number
    // "INV-<year>-<n>", status Draft, issued today, due today+14.
    const panel = overviewPanel(page);
    const numberMatcher = /^(Add number|INV-\S+|RT-INV-\d+)$/;
    await expect(panel.getByRole("button", { name: numberMatcher }).first()).toBeVisible({
      timeout: 30_000,
    });

    // 2. Edit: invoice number (free text), status (canonical select) Draft → Due,
    //    due date (date field — initial value is issued+14d, distinct from Issued).
    const blankDue = new Date();
    blankDue.setDate(blankDue.getDate() + 14);
    const blankDueLabel = blankDue.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    await editInlineText(page, panel, numberMatcher, invoiceNumber);
    await pickInlineSelect(page, panel, nameOneOf(...BILLING_STATUS_LABELS), "Due");
    await editInlineDate(page, panel, nameOneOf("Add due date", blankDueLabel), dueIso);
    await expect(
      panel.getByRole("button", { name: displayDate(dueIso), exact: true }),
    ).toBeVisible({ timeout: 10_000 });

    // 3. Reload → persisted.
    await reloadWithRetry(page);
    const panelAfter = overviewPanel(page);
    await expect(
      panelAfter.getByRole("button", { name: invoiceNumber, exact: true }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(panelAfter.getByRole("button", { name: "Due", exact: true })).toBeVisible();
    await expect(
      panelAfter.getByRole("button", { name: displayDate(dueIso), exact: true }),
    ).toBeVisible();

    // 4. Activity parity: updateBillingRecordField writes provenance
    //    (entity_type billing_record) → "You updated <field>".
    await openActivityTab(page);
    await expect(page.getByText(/you updated/i).first()).toBeVisible({ timeout: 20_000 });

    // 5. Restore status → Draft so the fresh record stays a draft
    //    (billing directory stats treat Due as outstanding revenue).
    await page.getByRole("tab", { name: /overview/i }).click();
    await pickInlineSelect(
      page,
      overviewPanel(page),
      nameOneOf(...BILLING_STATUS_LABELS),
      "Draft",
    );
  });
});
