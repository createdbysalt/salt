import "server-only";

/**
 * Cross-app corroboration (registry-wiring Phase 4): a person evidenced in
 * multiple connector categories (they pay you AND meet you AND email you) is
 * a stronger admission candidate than the same signals from one app. Counts
 * the distinct capture categories with evidence for an email; the records
 * engine turns corroborationCount >= 2 into a confidence bonus.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { sourceTypesForCategory } from "@/app/_features/capture/services/gates/admission-gate";

/** Category → extracted_data key carrying the contact's email. */
const CATEGORY_PROBES: ReadonlyArray<{
  category: string;
  match: (email: string) => Record<string, unknown>;
}> = [
  { category: "billing", match: (email) => ({ customer_email: email }) },
  { category: "calendar", match: (email) => ({ attendee_emails: [email] }) },
  { category: "storage", match: (email) => ({ shared_with_emails: [email] }) },
  { category: "email", match: (email) => ({ sender_email: email }) },
  { category: "crm", match: (email) => ({ email }) },
];

export async function countCorroboratingCategories(
  workspaceId: string,
  email: string,
): Promise<number> {
  const admin = createAdminClient();
  const normalized = email.toLowerCase();

  const hits = await Promise.all(
    CATEGORY_PROBES.map(async (probe) => {
      const sourceTypes = sourceTypesForCategory(probe.category);
      if (sourceTypes.length === 0) return false;
      const { data } = await admin
        .from("capture_events")
        .select("id")
        .eq("workspace_id", workspaceId)
        .in("source_type", sourceTypes)
        .contains("extracted_data", probe.match(normalized))
        .limit(1)
        .maybeSingle();
      return data !== null;
    }),
  );

  return hits.filter(Boolean).length;
}
