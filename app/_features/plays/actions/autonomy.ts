"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/app/_lib/tenancy/context";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import {
  grantAutonomy,
  declineAutonomyOffer,
  revokeAutonomy,
} from "@/app/_features/plays/services/earned-autonomy";

/**
 * Customize-tab wrappers around the earned-autonomy service. The service is
 * admin-client based; these actions add the tenancy guard and revalidation.
 */

export async function grantPlaybookAutonomyAction(
  playbookSlug: string,
  toolSlug: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    await grantAutonomy(workspace.id, playbookSlug, toolSlug);
    revalidatePath(`/plays/playbooks/${playbookSlug}`);
    return { success: true };
  } catch (err) {
    console.error("grantPlaybookAutonomy error:", err);
    return { success: false, error: "Failed to grant autonomy" };
  }
}

export async function declinePlaybookAutonomyOfferAction(
  playbookSlug: string,
  toolSlug: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    await declineAutonomyOffer(workspace.id, playbookSlug, toolSlug);
    revalidatePath(`/plays/playbooks/${playbookSlug}`);
    return { success: true };
  } catch (err) {
    console.error("declinePlaybookAutonomyOffer error:", err);
    return { success: false, error: "Failed to decline offer" };
  }
}

export async function revokePlaybookAutonomyAction(
  playbookSlug: string,
  toolSlug: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    await revokeAutonomy(workspace.id, playbookSlug, toolSlug);
    revalidatePath(`/plays/playbooks/${playbookSlug}`);
    return { success: true };
  } catch (err) {
    console.error("revokePlaybookAutonomy error:", err);
    return { success: false, error: "Failed to revoke autonomy" };
  }
}
