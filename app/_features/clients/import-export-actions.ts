"use server";

import { getStudioContext } from "@/app/_lib/utils/user-dashboard";
import { revalidatePath } from "next/cache";

interface ImportClientData {
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  phone?: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
}

export async function importClients(
  clients: ImportClientData[]
): Promise<ImportResult> {
  try {
    const { studio, supabase } = await getStudioContext();

    const imported: string[] = [];
    const errors: string[] = [];

    // Get or create companies
    const companyMap = new Map<string, string>();
    const uniqueCompanies = [...new Set(clients.filter((c) => c.company).map((c) => c.company!))];

    for (const companyName of uniqueCompanies) {
      // Check if company exists
      const { data: existing } = await supabase
        .from("companies")
        .select("id")
        .eq("studio_id", studio.id)
        .eq("name", companyName)
        .single();

      if (existing) {
        companyMap.set(companyName, existing.id);
      } else {
        // Create company
        const { data: newCompany, error } = await supabase
          .from("companies")
          .insert({
            studio_id: studio.id,
            name: companyName,
          })
          .select("id")
          .single();

        if (newCompany) {
          companyMap.set(companyName, newCompany.id);
        }
      }
    }

    // Import clients
    for (const client of clients) {
      // Check if client with this email already exists
      const { data: existing } = await supabase
        .from("clients")
        .select("id")
        .eq("studio_id", studio.id)
        .eq("contact_email", client.email)
        .single();

      if (existing) {
        errors.push(`Client with email ${client.email} already exists`);
        continue;
      }

      // Create slug from name
      const slug = `${client.firstName}-${client.lastName}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const { error } = await supabase.from("clients").insert({
        studio_id: studio.id,
        name: `${client.firstName} ${client.lastName}`,
        contact_email: client.email,
        contact_phone: client.phone || null,
        company_id: client.company ? companyMap.get(client.company) : null,
        slug,
        status: "active",
      });

      if (error) {
        errors.push(`Failed to import ${client.email}: ${error.message}`);
      } else {
        imported.push(client.email);
      }
    }

    revalidatePath("/studio/clients");

    return {
      success: true,
      imported: imported.length,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      imported: 0,
      errors: ["An unexpected error occurred"],
    };
  }
}

export async function exportClientsToCSV(): Promise<{
  success: boolean;
  data?: string;
  error?: string;
}> {
  try {
    const { studio, supabase } = await getStudioContext();

    const { data: clients, error } = await supabase
      .from("clients")
      .select(`
        name,
        contact_email,
        contact_phone,
        status,
        created_at,
        companies (name)
      `)
      .eq("studio_id", studio.id)
      .order("name");

    if (error) {
      return { success: false, error: error.message };
    }

    // Build CSV
    const headers = ["Name", "Email", "Phone", "Company", "Status", "Created"];
    const rows = clients.map((client: any) => [
      client.name,
      client.contact_email || "",
      client.contact_phone || "",
      client.companies?.name || "",
      client.status,
      new Date(client.created_at).toLocaleDateString(),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    return { success: true, data: csv };
  } catch (error) {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function createClient(data: {
  firstName: string;
  lastName: string;
  email: string;
  companyId: string | null;
  newCompanyName: string | null;
}): Promise<{ success: boolean; error?: string; clientId?: string }> {
  try {
    const { studio, supabase } = await getStudioContext();

    // Handle company
    let companyId = data.companyId;

    if (data.newCompanyName) {
      const { data: newCompany, error: companyError } = await supabase
        .from("companies")
        .insert({
          studio_id: studio.id,
          name: data.newCompanyName,
        })
        .select("id")
        .single();

      if (companyError) {
        return { success: false, error: "Failed to create company" };
      }

      companyId = newCompany.id;
    }

    // Create slug
    const slug = `${data.firstName}-${data.lastName}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check for existing client with same email
    const { data: existing } = await supabase
      .from("clients")
      .select("id")
      .eq("studio_id", studio.id)
      .eq("contact_email", data.email)
      .single();

    if (existing) {
      return { success: false, error: "A client with this email already exists" };
    }

    // Create client
    const { data: client, error } = await supabase
      .from("clients")
      .insert({
        studio_id: studio.id,
        name: `${data.firstName} ${data.lastName}`,
        contact_email: data.email,
        company_id: companyId,
        slug,
        status: "active",
      })
      .select("id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/studio/clients");

    return { success: true, clientId: client.id };
  } catch (error) {
    return { success: false, error: "An unexpected error occurred" };
  }
}
