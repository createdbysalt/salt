"use server";

import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { initiateConnection } from "@/app/_lib/composio/connections";
import { startStripeConnectOnboardingAction } from "@/app/actions/integrations/stripe-connect-actions";

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

export async function connectStripeFromOnboarding(): Promise<
  | { success: true; url: string }
  | { success: false; error: string }
> {
  const result = await startStripeConnectOnboardingAction();
  if (!result.success) {
    return { success: false, error: result.error };
  }
  return { success: true, url: result.data.url };
}
