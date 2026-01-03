"use server";

import { createClient } from "@/libs/supabase/server";
import { revalidatePath } from "next/cache";

export type ActionResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Update user profile information
 */
export async function updateProfileAction(data: {
  firstName: string;
  lastName: string;
  bio?: string;
}): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Update user metadata with full name
    const fullName = `${data.firstName.trim()} ${data.lastName.trim()}`.trim();
    
    const { error: authError } = await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        first_name: data.firstName.trim(),
        last_name: data.lastName.trim(),
        bio: data.bio?.trim() || null,
      },
    });

    if (authError) {
      console.error("Error updating user metadata:", authError);
      return { success: false, error: authError.message };
    }

    // Also update profiles table if it exists
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (profileError) {
      console.warn("Error updating profile table:", profileError);
      // Don't fail if profiles table update fails
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");

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

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");

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

