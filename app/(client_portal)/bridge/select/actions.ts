"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getTenantContext } from "@/app/_lib/tenancy";

const selectClientSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
});

/**
 * Set the active client for a multi-client user.
 * Sets a cookie and redirects to the Bridge home.
 */
export async function selectClient(formData: FormData) {
  try {
    const { context } = await getTenantContext();
    
    // Ensure user is authenticated
    if (!context.userId) {
      return { error: "Not authenticated" };
    }
    
    // Validate input
    const rawData = {
      clientId: formData.get("clientId") as string,
    };
    
    const validatedData = selectClientSchema.parse(rawData);
    
    // Verify this client is in the user's memberships
    const membership = context.clientMemberships?.find(
      m => m.clientId === validatedData.clientId
    );
    
    if (!membership) {
      return { error: "Invalid client selection" };
    }
    
    // Set the active client cookie
    const cookieStore = await cookies();
    cookieStore.set("bridge_active_client_id", validatedData.clientId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });
    
    // Redirect to bridge home
    redirect("/bridge");
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

