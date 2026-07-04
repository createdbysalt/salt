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
 * Round-trip persistence: Meeting detail page.
 * "Add meeting" creates a blank internal meeting (type=other, status=scheduled).
 */

const MEETING_TYPE_LABELS = [
  "Discovery",
  "Kickoff",
  "Check-in",
  "Review",
  "Presentation",
  "Workshop",
  "Interview",
  "Other",
];

test.describe("Round-trip: Meeting", () => {
  test("meeting field edits persist across reload; Activity shows contracted entries", async ({
    page,
  }) => {
    // PRODUCT BUG (found by this suite — reproducible on a warm server):
    // Title and Type edits on a freshly created meeting report success on the
    // client (no error toast; updateMeeting returns { success: true }) but the
    // row is unchanged after reload. updateMeeting performs the UPDATE with the
    // RLS user client and never checks affected rows, so an RLS-blocked
    // 0-row update is indistinguishable from success — the definitional
    // silent no-op editor. Un-fixme once meetings UPDATE persists
    // (verify with: create meeting → edit title → reload).
    test.slow();
    const marker = `RT-meeting ${Date.now()}`;

    // 1. Create a blank meeting from the directory.
    await gotoAppRoute(page, "/meetings");
    await createBlankRecord(page, /add meeting/i, /\/meetings\/[0-9a-f-]{36}/);

    const panel = overviewPanel(page);
    await expect(
      panel.getByRole("button", { name: "Untitled meeting", exact: true }),
    ).toBeVisible({ timeout: 30_000 });

    // 2. Edit: title (free text), type (canonical meeting_type select) Other → Discovery.
    await editInlineText(page, panel, nameOneOf("Untitled meeting"), marker);
    await pickInlineSelect(page, panel, nameOneOf(...MEETING_TYPE_LABELS), "Discovery");

    // 3. Reload → persisted.
    await reloadWithRetry(page);
    const panelAfter = overviewPanel(page);
    await expect(
      panelAfter.getByRole("button", { name: marker, exact: true }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      panelAfter.getByRole("button", { name: "Discovery", exact: true }),
    ).toBeVisible();

    // 4. Activity: inline meeting field edits write NO provenance yet —
    //    profile_field_provenance's entity_type CHECK admits
    //    person/organization/work/operator/workspace only (documented gap in
    //    app/_features/meetings/utils/activity.ts). What IS contracted: the
    //    Activity tab renders (decisions/action items/notes/connections feed,
    //    or its empty state).
    //    TODO(field-contracts Phase 3): assert "You updated meeting type"
    //    once meeting provenance lands.
    await openActivityTab(page);
    await expect(
      page.getByText(/no activity yet|created|scheduled|added|updated/i).first(),
    ).toBeVisible({ timeout: 20_000 });

    // 5. No restore needed: fresh record each run (left behind with RT- marker).
  });
});
