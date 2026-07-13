"use server";

import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { initiateConnection } from "@/app/_lib/composio/connections";
import { connectorsPageUrl } from "@/app/_features/connectors/constants";

export async function connectGmailFromOnboarding(): Promise<
  | { success: true; url: string }
  | { success: false; error: string }
> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  if (!context.userId) {
    return { success: false, error: "Not authenticated" };
  }

  return initiateConnection("gmail", workspace.id, context.userId, "/onboarding");
}

export async function connectCalendarFromOnboarding(): Promise<
  | { success: true; url: string }
  | { success: false; error: string }
> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  if (!context.userId) {
    return { success: false, error: "Not authenticated" };
  }

  return initiateConnection(
    "googlecalendar",
    workspace.id,
    context.userId,
    "/onboarding",
  );
}

/**
 * Stripe connects with an API key (Composio), not a hosted onboarding flow —
 * send the user to the Connectors surface where the inline connect form lives.
 */
export async function connectStripeFromOnboarding(): Promise<
  | { success: true; url: string }
  | { success: false; error: string }
> {
  const { context } = await getTenantContext();
  requireWorkspaceMember(context);
  if (!context.userId) {
    return { success: false, error: "Not authenticated" };
  }

  return { success: true, url: connectorsPageUrl() };
}
