/**
 * Marketing Feature - Server Actions
 *
 * Actions for marketing-related functionality like lead capture.
 */

"use server";

import { createAdminClient } from "@/app/_lib/supabase/admin";

export type ActionResponse<T = void> =
  | { success: true; data: T; alreadyJoined?: boolean }
  | { success: false; error: string };

/**
 * Capture a lead from the landing page
 * Used by ButtonLead component for waitlist signups
 */
export async function captureLeadAction(data: {
  email: string;
  source?: string;
  roleSegment?: string;
}): Promise<ActionResponse<void>> {
  try {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const email = data.email?.trim();

    if (!email || !emailRegex.test(email)) {
      return { success: false, error: "Enter a valid email address." };
    }

    const normalizedEmail = email.toLowerCase();
    const source = data.source?.trim() || "homepage";
    const roleSegment = data.roleSegment?.trim();
    const metadata =
      roleSegment && roleSegment.length > 0
        ? { role_segment: roleSegment }
        : {};
    const supabase = createAdminClient();

    const { data: insertedLead, error } = await supabase
      .from("waitlist_leads")
      .upsert(
        {
          email,
          normalized_email: normalizedEmail,
          source,
          metadata,
        },
        {
          onConflict: "normalized_email",
          ignoreDuplicates: true,
        }
      )
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Error saving waitlist lead:", error);
      return {
        success: false,
        error: "We could not save your spot. Please try again.",
      };
    }

    return {
      success: true,
      data: undefined,
      alreadyJoined: !insertedLead,
    };
  } catch (error) {
    console.error("Error in captureLeadAction:", error);
    return {
      success: false,
      error: "We could not save your spot. Please try again.",
    };
  }
}
