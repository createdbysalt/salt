import "server-only";

/**
 * Org recency rollup (Track D of the zero-pills sourcing plan).
 *
 * A touchpoint with a person is a touchpoint with their org: when the
 * person-field producer lands a newer last_contact_at, the newest value
 * rolls up to every linked org. Direct writes with explicit max semantics
 * (never regress the clock during backfills), provenance naming the
 * `org_person_contacted` fill rule — same pattern as the person's own
 * contact timestamps.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { memoryUpdateField } from "@/app/_lib/memory-tools";
import { getFieldsForEntity } from "@/app/_features/memory/taxonomy/field-registry";

export async function produceOrgRecencyRollup(input: {
  workspaceId: string;
  personId: string;
  /** The person's newest touchpoint (ISO). */
  contactAt: string;
  /** Producer label for evidence, e.g. the connector sourceType. */
  source: string;
  captureId?: string;
}): Promise<{ updated: string[] }> {
  const admin = createAdminClient();

  const { data: links } = await admin
    .from("organization_people")
    .select("organization_id")
    .eq("person_id", input.personId);
  const orgIds = ((links as Array<{ organization_id: string }> | null) ?? []).map(
    (link) => link.organization_id,
  );
  if (orgIds.length === 0) return { updated: [] };

  const rule = getFieldsForEntity("org")
    .find((field) => field.key === "lastContactedAt")
    ?.fillRules?.find((r) => r.signal === "org_person_contacted");

  const updated: string[] = [];
  for (const orgId of orgIds) {
    const { data: org } = await admin
      .from("organizations")
      .select("id, last_contact_at")
      .eq("id", orgId)
      .eq("workspace_id", input.workspaceId)
      .maybeSingle();
    if (!org) continue;
    const current = (org as { last_contact_at: string | null }).last_contact_at;
    if (current && current >= input.contactAt) continue;

    const result = await memoryUpdateField({
      workspaceId: input.workspaceId,
      entityType: "organization",
      entityId: orgId,
      field: "last_contact_at",
      value: input.contactAt,
      confidence: rule?.confidence ?? 100,
      because: rule?.because ?? "Someone at this org was contacted",
      source: "enrichment",
      sourceDetails: {
        playbookSlug: "memory-records",
        captureId: input.captureId,
        ruleId: "org-lastContactedAt-org_person_contacted",
      },
    });
    if (result.action === "applied") updated.push(orgId);
  }

  return { updated };
}
