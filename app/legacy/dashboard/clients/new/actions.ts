"use server";

import { createClient as createSupabaseClient } from "@/libs/supabase/server";
import { getTenantContext } from "@/libs/tenancy";
import { requireStudioMember } from "@/libs/tenancy/guards";
import { redirect } from "next/navigation";
import { z } from "zod";

const clientSchema = z.object({
  name: z.string().min(1, "Client name is required").max(100),
  slug: z.string().min(1, "Slug is required").max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  contact_email: z.string().email("Valid email required").optional().or(z.literal("")),
  contact_phone: z.string().max(50).optional().or(z.literal("")),
});

export async function createClient(formData: FormData) {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createSupabaseClient();
    
    // Validate form data
    const rawData = {
      name: formData.get("name") as string,
      slug: formData.get("slug") as string,
      contact_email: formData.get("contact_email") as string,
      contact_phone: formData.get("contact_phone") as string,
    };
    
    const validatedData = clientSchema.parse(rawData);
    
    // Check if slug already exists for this studio
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("studio_id", studio.id)
      .eq("slug", validatedData.slug)
      .single();
    
    if (existingClient) {
      return { error: "A client with this slug already exists" };
    }
    
    // Create client
    const { data: newClient, error: clientError } = await supabase
      .from("clients")
      .insert({
        studio_id: studio.id,
        name: validatedData.name,
        slug: validatedData.slug,
        contact_email: validatedData.contact_email || null,
        contact_phone: validatedData.contact_phone || null,
      })
      .select()
      .single();
    
    if (clientError) {
      console.error("Error creating client:", clientError);
      return { error: "Failed to create client" };
    }
    
    // Auto-create Bridge portal for this client
    const { error: portalError } = await supabase
      .from("bridge_portals")
      .insert({
        client_id: newClient.id,
        studio_id: studio.id,
        status: "active",
      });
    
    if (portalError) {
      console.error("Error creating bridge portal:", portalError);
      // Don't fail the whole operation, just log it
    }
    
    // Redirect to client detail page
    redirect(`/dashboard/clients/${newClient.id}`);
  } catch (error) {
    // Re-throw redirect errors (they're not actually errors, just Next.js navigation)
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

