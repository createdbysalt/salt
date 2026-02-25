"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ActionResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface NotificationPreferences {
  batching: "immediate" | "hourly" | "daily";
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  quietHoursTimezone: string;
}

/**
 * Get user notification preferences
 */
export async function getNotificationPreferencesAction(): Promise<
  ActionResponse<NotificationPreferences>
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("notification_preferences")
      .select("batching, quiet_hours_start, quiet_hours_end, quiet_hours_timezone")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Error fetching notification preferences:", error);
      return { success: false, error: "Failed to fetch preferences" };
    }

    // Return defaults if no preferences exist
    if (!data) {
      return {
        success: true,
        data: {
          batching: "immediate",
          quietHoursStart: null,
          quietHoursEnd: null,
          quietHoursTimezone: "UTC",
        },
      };
    }

    return {
      success: true,
      data: {
        batching: data.batching as "immediate" | "hourly" | "daily",
        quietHoursStart: data.quiet_hours_start,
        quietHoursEnd: data.quiet_hours_end,
        quietHoursTimezone: data.quiet_hours_timezone,
      },
    };
  } catch (error) {
    console.error("Error in getNotificationPreferencesAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update notification batching preference
 */
export async function updateNotificationBatchingAction(
  batching: "immediate" | "hourly" | "daily"
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Validate batching value
    if (!["immediate", "hourly", "daily"].includes(batching)) {
      return { success: false, error: "Invalid batching value" };
    }

    // Upsert preferences
    const { error } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          user_id: user.id,
          batching,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (error) {
      console.error("Error updating notification batching:", error);
      return { success: false, error: "Failed to update preferences" };
    }

    revalidatePath("/settings");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error in updateNotificationBatchingAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update quiet hours preference
 */
export async function updateQuietHoursAction(
  quietHours: {
    enabled: boolean;
    start?: string;
    end?: string;
  }
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      user_id: user.id,
      updated_at: new Date().toISOString(),
    };

    if (quietHours.enabled) {
      // Validate time format (HH:MM)
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (quietHours.start && !timeRegex.test(quietHours.start)) {
        return { success: false, error: "Invalid start time format" };
      }
      if (quietHours.end && !timeRegex.test(quietHours.end)) {
        return { success: false, error: "Invalid end time format" };
      }

      updateData.quiet_hours_start = quietHours.start || "08:00";
      updateData.quiet_hours_end = quietHours.end || "20:00";
    } else {
      updateData.quiet_hours_start = null;
      updateData.quiet_hours_end = null;
    }

    // Upsert preferences
    const { error } = await supabase
      .from("notification_preferences")
      .upsert(updateData, {
        onConflict: "user_id",
      });

    if (error) {
      console.error("Error updating quiet hours:", error);
      return { success: false, error: "Failed to update quiet hours" };
    }

    revalidatePath("/settings");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error in updateQuietHoursAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
