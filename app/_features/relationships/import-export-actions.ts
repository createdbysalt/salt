"use server";

import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
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
    const { workspace, supabase } = await getWorkspaceContext();

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
        .eq("studio_id", workspace.id)
        .eq("name", companyName)
        .single();

      if (existing) {
        companyMap.set(companyName, existing.id);
      } else {
        // Create company
        const { data: newCompany, error } = await supabase
          .from("companies")
          .insert({
            studio_id: workspace.id,
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
        .eq("studio_id", workspace.id)
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
        studio_id: workspace.id,
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

    revalidatePath("/people");

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
    const { workspace, supabase } = await getWorkspaceContext();

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
      .eq("studio_id", workspace.id)
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

// Legacy createClient for NewClientDialog (backwards compatible)
export async function createClient(data: {
  firstName: string;
  lastName: string;
  email: string;
  companyId: string | null;
  newCompanyName: string | null;
}): Promise<{ success: boolean; error?: string; clientId?: string }> {
  return createClientWithIntent({
    intent: "quick",
    clientType: "individual",
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    companyId: data.companyId,
    newCompanyName: data.newCompanyName,
  });
}

// New intent-based client creation for AddClientSheet
// Note: "client" intent creates a paying client (lifecycle_stage "client")
// "prospect" intent creates a lead (lifecycle_stage "lead")
export type ClientIntent = "prospect" | "client" | "quick";
export type ClientType = "individual" | "organization";

export interface CreateClientData {
  intent: ClientIntent;
  clientType: ClientType;
  // Individual fields
  firstName?: string;
  lastName?: string;
  // Organization fields
  companyName?: string;
  contactName?: string;
  // Common fields
  email: string;
  phone?: string;
  address?: string;
  companyId?: string | null;
  newCompanyName?: string | null;
  notes?: string;
  // Options
  inviteToBridge?: boolean;
}

export async function createClientWithIntent(
  data: CreateClientData
): Promise<{ success: boolean; error?: string; clientId?: string }> {
  try {
    const { workspace, supabase } = await getWorkspaceContext();

    // Determine lifecycle stage based on intent
    const lifecycleStage = data.intent === "client" ? "client" : "lead";

    // Build client name based on type
    let clientName: string;
    let slug: string;

    if (data.clientType === "organization") {
      clientName = data.companyName || "";
      slug = clientName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    } else {
      const firstName = data.firstName || "";
      const lastName = data.lastName || "";
      clientName = `${firstName} ${lastName}`.trim();
      slug = `${firstName}-${lastName}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    }

    if (!clientName) {
      return { success: false, error: "Client name is required" };
    }

    // Handle company for individuals
    let companyId = data.companyId || null;

    if (data.clientType === "individual" && data.newCompanyName) {
      const { data: newCompany, error: companyError } = await supabase
        .from("companies")
        .insert({
          studio_id: workspace.id,
          name: data.newCompanyName,
        })
        .select("id")
        .single();

      if (companyError) {
        return { success: false, error: "Failed to create company" };
      }

      companyId = newCompany.id;
    }

    // Check for existing client with same email
    const { data: existing } = await supabase
      .from("clients")
      .select("id")
      .eq("studio_id", workspace.id)
      .eq("contact_email", data.email)
      .single();

    if (existing) {
      return { success: false, error: "A client with this email already exists" };
    }

    // Create client with lifecycle stage and stage_entered_at
    const now = new Date().toISOString();
    const insertData = {
      studio_id: workspace.id,
      name: clientName,
      contact_email: data.email,
      contact_phone: data.phone || null,
      address: data.address || null,
      contact_name: data.clientType === "organization" ? data.contactName : null,
      company_id: companyId,
      slug,
      status: "active",
      lifecycle_stage: lifecycleStage,
      stage_entered_at: now,
      client_type: data.clientType,
      notes: data.notes || null,
    };

    console.log("[createClientWithIntent] Inserting client:", insertData);

    const { data: client, error } = await supabase
      .from("clients")
      .insert(insertData)
      .select("id")
      .single();

    if (error) {
      console.error("[createClientWithIntent] Error:", error);
      return { success: false, error: error.message };
    }

    console.log("[createClientWithIntent] Success, clientId:", client.id);

    revalidatePath("/people");
    revalidatePath("/studio/pipeline");
    revalidatePath("/studio/work/pipeline");

    return { success: true, clientId: client.id };
  } catch (error) {
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Get companies for the studio (used by AddClientSheet)
export async function getCompanies(): Promise<{ id: string; name: string }[]> {
  try {
    const { workspace, supabase } = await getWorkspaceContext();

    const { data, error } = await supabase
      .from("companies")
      .select("id, name")
      .eq("studio_id", workspace.id)
      .order("name");

    if (error) {
      console.error("[getCompanies] Error:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[getCompanies] Error:", error);
    return [];
  }
}
