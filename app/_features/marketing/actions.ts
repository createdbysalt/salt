/**
 * Marketing Feature - Server Actions
 *
 * Actions for marketing-related functionality like lead capture.
 */

"use server";

import { createClient } from "@/libs/supabase/server";

export type ActionResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Capture a lead from the landing page
 * Used by ButtonLead component for waitlist signups
 */
export async function captureLeadAction(data: {
  email: string;
}): Promise<ActionResponse<void>> {
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) {
      return { success: false, error: "Invalid email format" };
    }

    // Normalize email
    const email = data.email.toLowerCase().trim();

    // Here you can add your own logic:
    // - Save to database
    // - Send a welcome email
    // - Add to a mailing list

    // Example: Save to Supabase (uncomment if you have a leads table)
    // const supabase = await createClient();
    // const { error } = await supabase.from("leads").insert({ email });
    // if (error && error.code !== "23505") { // Ignore duplicate key errors
    //   console.error("Error saving lead:", error);
    //   return { success: false, error: "Failed to save lead" };
    // }

    // Example: Send welcome email (uncomment if you have email configured)
    // import { sendEmail } from "@/libs/resend";
    // await sendEmail({
    //   to: email,
    //   subject: "Welcome to the waitlist!",
    //   text: "Thanks for joining our waitlist. We'll keep you updated.",
    // });

    console.log("Lead captured:", email);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error in captureLeadAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
