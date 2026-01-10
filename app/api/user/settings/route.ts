import { createClient } from "@/libs/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

// Validation schema for theme settings
const ThemeSettingsSchema = z.object({
  ui_theme: z.enum(["light", "dark"]).optional(),
  reduced_motion: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = ThemeSettingsSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const settings = validationResult.data;
    
    // Only update fields that were provided
    const updateData: Record<string, any> = {};
    if (settings.ui_theme !== undefined) {
      updateData.ui_theme = settings.ui_theme;
    }
    if (settings.reduced_motion !== undefined) {
      updateData.reduced_motion = settings.reduced_motion;
    }
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Update user profile
    const { data, error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating theme settings:", error);
      return NextResponse.json(
        { error: "Failed to update theme settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: data,
    });

  } catch (error) {
    console.error("Theme settings API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch current theme settings
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("ui_theme, reduced_motion")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching theme settings:", error);
      return NextResponse.json(
        { error: "Failed to fetch theme settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ui_theme: data.ui_theme || "dark",
      reduced_motion: data.reduced_motion || false,
    });

  } catch (error) {
    console.error("Theme settings API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
