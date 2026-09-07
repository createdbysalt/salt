import "server-only";

import { operatorProfileFullName } from "@/app/_features/me/utils/profile-name";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { DraftSender } from "./draft-preview";

/** Name + saved Me signature for inbox drafts written on the operator's behalf. */
export async function loadDraftSender(userId: string): Promise<DraftSender> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select(
      "display_name, first_name, last_name, full_name, email, preferred_name, email_signature"
    )
    .eq("id", userId)
    .maybeSingle();

  const senderName = operatorProfileFullName(data);
  return {
    senderName: senderName === "You" ? null : senderName,
    emailSignature: data?.email_signature?.trim() || null,
  };
}

/** Email on the connected inbox (Gmail / Outlook), from the connector row. */
export async function loadConnectedAccountEmail(
  workspaceId: string,
  provider: string
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("workspace_integrations")
    .select("config")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .eq("composio_status", "connected")
    .maybeSingle();
  const email = (data?.config as { email?: unknown } | null)?.email;
  return typeof email === "string" && email.includes("@") ? email : null;
}
