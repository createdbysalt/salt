"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ActionResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Update user profile information
 */
export async function updateProfileAction(data: {
  firstName?: string;
  lastName?: string;
  bio?: string;
  phone?: string;
  companyName?: string;
  jobTitle?: string;
  timezone?: string;
  preferredContactMethod?: "email" | "phone" | "portal";
}): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Build profile update object with only provided fields
    const profileUpdate: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Handle name fields
    if (data.firstName !== undefined || data.lastName !== undefined) {
      const firstName = data.firstName?.trim() || "";
      const lastName = data.lastName?.trim() || "";
      const fullName = `${firstName} ${lastName}`.trim();

      // Update auth user metadata for name
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
        },
      });

      if (authError) {
        console.error("Error updating user metadata:", authError);
        return { success: false, error: authError.message };
      }

      // Note: full_name is a generated column, so we only update first_name and last_name
      profileUpdate.first_name = firstName;
      profileUpdate.last_name = lastName;
    }

    // Handle other optional fields
    if (data.bio !== undefined) {
      profileUpdate.bio = data.bio?.trim() || null;
    }
    if (data.phone !== undefined) {
      profileUpdate.phone = data.phone?.trim() || null;
    }
    if (data.companyName !== undefined) {
      profileUpdate.company_name = data.companyName?.trim() || null;
    }
    if (data.jobTitle !== undefined) {
      profileUpdate.job_title = data.jobTitle?.trim() || null;
    }
    if (data.timezone !== undefined) {
      profileUpdate.timezone = data.timezone;
    }
    if (data.preferredContactMethod !== undefined) {
      profileUpdate.preferred_contact_method = data.preferredContactMethod;
    }

    // Update profiles table
    const { error: profileError } = await supabase
      .from("profiles")
      .update(profileUpdate)
      .eq("id", user.id);

    if (profileError) {
      console.warn("Error updating profile table:", profileError);
      return { success: false, error: profileError.message };
    }

    // Revalidate standard settings paths
    revalidatePath("/studio/settings");
    revalidatePath("/studio");
    revalidatePath("/table/settings");

    // Revalidate client detail pages for any clients this user belongs to
    // This ensures the People tab in studio shows updated contact info
    const { data: clientUsers } = await supabase
      .from("client_users")
      .select("client_id")
      .eq("user_id", user.id);

    if (clientUsers && clientUsers.length > 0) {
      for (const cu of clientUsers) {
        revalidatePath(`/studio/clients/${cu.client_id}`);
      }
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error in updateProfileAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Upload user avatar (placeholder for future implementation)
 */
export async function uploadAvatarAction(
  formData: FormData
): Promise<ActionResponse<string>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const file = formData.get("avatar") as File;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return { success: false, error: "File must be an image" };
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: "File size must be less than 5MB" };
    }

    // Upload to Supabase Storage
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("user-assets")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading avatar:", uploadError);
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("user-assets").getPublicUrl(filePath);

    // Update user metadata with avatar URL
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        avatar_url: publicUrl,
      },
    });

    if (updateError) {
      console.error("Error updating user avatar URL:", updateError);
      return { success: false, error: updateError.message };
    }

    // Also update profiles table
    await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    // Revalidate standard settings paths
    revalidatePath("/studio/settings");
    revalidatePath("/studio");
    revalidatePath("/table/settings");

    // Revalidate client detail pages for any clients this user belongs to
    // This ensures the People tab in studio shows updated avatar
    const { data: clientUsers } = await supabase
      .from("client_users")
      .select("client_id")
      .eq("user_id", user.id);

    if (clientUsers && clientUsers.length > 0) {
      for (const cu of clientUsers) {
        revalidatePath(`/studio/clients/${cu.client_id}`);
      }
    }

    return { success: true, data: publicUrl };
  } catch (error) {
    console.error("Error in uploadAvatarAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Change user email (requires verification)
 */
export async function changeEmailAction(
  newEmail: string
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return { success: false, error: "Invalid email format" };
    }

    // Check if email is the same as current
    if (user.email === newEmail) {
      return { success: false, error: "This is already your current email" };
    }

    // Request email change (will send verification email to new address)
    const { error } = await supabase.auth.updateUser({
      email: newEmail,
    });

    if (error) {
      console.error("Error changing email:", error);
      return { success: false, error: error.message };
    }

    // Note: User will need to verify the new email address
    // The email won't be changed until they click the verification link
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error in changeEmailAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get user theme settings
 */
export async function getThemeSettingsAction(): Promise<
  ActionResponse<{ ui_theme: string; reduced_motion: boolean }>
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
      .from("profiles")
      .select("ui_theme, reduced_motion")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching theme settings:", error);
      return { success: false, error: "Failed to fetch theme settings" };
    }

    return {
      success: true,
      data: {
        ui_theme: data.ui_theme || "dark",
        reduced_motion: data.reduced_motion || false,
      },
    };
  } catch (error) {
    console.error("Error in getThemeSettingsAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update user theme settings
 */
export async function updateThemeSettingsAction(settings: {
  ui_theme?: "light" | "dark";
  reduced_motion?: boolean;
}): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Validate input
    if (settings.ui_theme && !["light", "dark"].includes(settings.ui_theme)) {
      return { success: false, error: "Invalid theme value" };
    }

    // Only update fields that were provided
    const updateData: Record<string, unknown> = {};
    if (settings.ui_theme !== undefined) {
      updateData.ui_theme = settings.ui_theme;
    }
    if (settings.reduced_motion !== undefined) {
      updateData.reduced_motion = settings.reduced_motion;
    }

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: "No valid fields to update" };
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (error) {
      console.error("Error updating theme settings:", error);
      return { success: false, error: "Failed to update theme settings" };
    }

    revalidatePath("/studio/settings");

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error in updateThemeSettingsAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

