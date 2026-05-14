import { NextResponse } from "next/server";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { context } = await getTenantContext();
    const studioMembership = requireStudioMember(context);

    const { data: clients, error } = await supabase
      .from("clients")
      .select("id, name, contact_email")
      .eq("studio_id", studioMembership.id)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("name");

    if (error) {
      console.error("Error fetching clients:", error);
      return NextResponse.json(
        { error: "Failed to fetch clients" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      clients: (clients || []).map((c) => ({
        id: c.id,
        name: c.name,
        contactEmail: c.contact_email,
      })),
    });
  } catch (error) {
    console.error("Error in clients list API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
