import "server-only";

/**
 * Person Emails — multi-email identity for people.
 *
 * `person_emails` holds every address a person is known at; exactly one is
 * primary and mirrored onto `people.email` (the denormalized primary kept
 * for backward compatibility). Identity lookups should resolve by ANY of a
 * person's emails via `findPersonIdsByEmail`, not by `people.email` alone —
 * otherwise the same human at a second address births a duplicate record.
 */

import type { createAdminClient } from "@/app/_lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export type PersonEmailSource = "capture" | "manual" | "merge" | "backfill";

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Resolve an email address to person IDs in a workspace, matching against
 * both `person_emails` (any known address) and the legacy `people.email`
 * primary column (covers rows written before the backfill and keeps the
 * lookup correct even if a sync write was missed).
 */
export async function findPersonIdsByEmail(
  admin: AdminClient,
  workspaceId: string,
  email: string
): Promise<string[]> {
  const normalized = normalizeEmail(email);
  if (!normalized) return [];

  const [viaEmails, viaPrimary] = await Promise.all([
    admin
      .from("person_emails")
      .select("person_id")
      .eq("workspace_id", workspaceId)
      .eq("email", normalized),
    admin
      .from("people")
      .select("id")
      .eq("workspace_id", workspaceId)
      .ilike("email", normalized.replace(/[%_\\]/g, (m) => `\\${m}`))
      .is("deleted_at", null),
  ]);

  const ids = new Set<string>();
  const emailRows = viaEmails.data;
  const primaryRows = viaPrimary.data;
  for (const row of Array.isArray(emailRows) ? emailRows : emailRows ? [emailRows] : []) {
    const personId = (row as { person_id?: string }).person_id;
    if (personId) ids.add(personId);
  }
  for (const row of Array.isArray(primaryRows) ? primaryRows : primaryRows ? [primaryRows] : []) {
    const id = (row as { id?: string }).id;
    if (id) ids.add(id);
  }
  return [...ids];
}

/**
 * Attach an email address to a person.
 *
 * - No-op when the person already knows the address.
 * - Refuses when the address belongs to a DIFFERENT person in the workspace
 *   (that's a merge decision, not an attach).
 * - Primary handling: an explicit `primary: true`, or a person with no
 *   primary row yet, makes the new row primary and syncs `people.email`.
 */
export async function attachPersonEmail(
  admin: AdminClient,
  params: {
    workspaceId: string;
    personId: string;
    email: string;
    source: PersonEmailSource;
    primary?: boolean;
  }
): Promise<{ attached: boolean; reason?: string }> {
  const email = normalizeEmail(params.email);
  if (!email) return { attached: false, reason: "empty email" };

  const { data: existing } = await admin
    .from("person_emails")
    .select("id, person_id")
    .eq("workspace_id", params.workspaceId)
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    if (existing.person_id === params.personId) {
      return { attached: false, reason: "already attached" };
    }
    return { attached: false, reason: "email belongs to a different person" };
  }

  let makePrimary = params.primary === true;
  if (!makePrimary) {
    const { data: currentPrimary } = await admin
      .from("person_emails")
      .select("id")
      .eq("person_id", params.personId)
      .eq("is_primary", true)
      .maybeSingle();
    makePrimary = !currentPrimary;
  }

  if (makePrimary) {
    // Clear any existing primary first so the partial unique index holds.
    await admin
      .from("person_emails")
      .update({ is_primary: false })
      .eq("person_id", params.personId)
      .eq("is_primary", true);
  }

  const { error } = await admin.from("person_emails").insert({
    workspace_id: params.workspaceId,
    person_id: params.personId,
    email,
    is_primary: makePrimary,
    source: params.source,
  });

  if (error) return { attached: false, reason: error.message };

  if (makePrimary) {
    await admin
      .from("people")
      .update({ email })
      .eq("id", params.personId)
      .eq("workspace_id", params.workspaceId);
  }

  return { attached: true };
}

/**
 * Merge union: move the loser's addresses onto the winner. The winner's
 * primary wins (merges keep the surviving record's primary); loser's rows
 * arrive non-primary. Addresses the winner already has are dropped from the
 * loser to respect the (workspace_id, email) uniqueness.
 */
export async function unionPersonEmailsOnMerge(
  admin: AdminClient,
  workspaceId: string,
  winnerId: string,
  loserId: string
): Promise<void> {
  const [{ data: winnerRows }, { data: loserRows }] = await Promise.all([
    admin
      .from("person_emails")
      .select("id, email")
      .eq("person_id", winnerId)
      .eq("workspace_id", workspaceId),
    admin
      .from("person_emails")
      .select("id, email")
      .eq("person_id", loserId)
      .eq("workspace_id", workspaceId),
  ]);

  const winnerSet = new Set(
    (winnerRows ?? []).map((row) => row.email as string),
  );
  const losers = (loserRows ?? []) as Array<{ id: string; email: string }>;

  // Drop loser rows the winner already has (uniqueness), repoint the rest.
  const duplicates = losers.filter((row) => winnerSet.has(row.email));
  if (duplicates.length > 0) {
    await admin
      .from("person_emails")
      .delete()
      .in("id", duplicates.map((row) => row.id));
  }

  await admin
    .from("person_emails")
    .update({ person_id: winnerId, is_primary: false, source: "merge" })
    .eq("person_id", loserId)
    .eq("workspace_id", workspaceId);

  // Guarantee the winner ends with a primary: if neither side contributed
  // one (e.g. both records predate the backfill), promote people.email.
  const { data: winnerPrimary } = await admin
    .from("person_emails")
    .select("id")
    .eq("person_id", winnerId)
    .eq("is_primary", true)
    .maybeSingle();

  if (!winnerPrimary) {
    const { data: winner } = await admin
      .from("people")
      .select("email")
      .eq("id", winnerId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (winner?.email) {
      await attachPersonEmail(admin, {
        workspaceId,
        personId: winnerId,
        email: winner.email,
        source: "merge",
        primary: true,
      });
    }
  }
}
