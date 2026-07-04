"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";

const TEST_ORG_NAMES = ["Harbor & Co", "Northwind Creative", "Bluebird Studio", "Cedar Lane Media", "Summit Works"];

/**
 * Seeds test data for dashboard visualization
 * Run this once to populate billing records, projects, and milestones.
 * Seeds organizations directly (the legacy clients table is no longer minted).
 */
export async function seedDashboardTestData() {
  const { context } = await getTenantContext();
  const studio = requireWorkspaceMember(context);
  const supabase = await createClient();

  const now = new Date();
  const results: string[] = [];

  // Get existing organizations; create test orgs if none exist
  let { data: orgs } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("workspace_id", studio.id)
    .is("deleted_at", null)
    .limit(10);

  if (!orgs || orgs.length === 0) {
    const { data: createdOrgs, error: orgError } = await supabase
      .from("organizations")
      .insert(
        TEST_ORG_NAMES.map((name, i) => ({
          workspace_id: studio.id,
          name,
          slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}-${i}`,
        })),
      )
      .select("id, name");

    if (orgError) {
      return { success: false, message: `Failed to seed organizations: ${orgError.message}` };
    }

    orgs = createdOrgs;
    results.push(`Created ${createdOrgs?.length || 0} test organizations`);
  }

  if (!orgs || orgs.length === 0) {
    return { success: false, message: "No organizations found and none could be created." };
  }

  // 1. Create test billing records with various statuses and dates
  const billingRecordData = [];
  const orgsForInvoices = orgs.slice(0, Math.min(5, orgs.length));

  for (let i = 0; i < orgsForInvoices.length; i++) {
    const org = orgsForInvoices[i];

    // Create a paid receivable (for wins + revenue chart)
    const paidDaysAgo = Math.floor(Math.random() * 30) + 1;
    const paidDate = new Date(now);
    paidDate.setDate(now.getDate() - paidDaysAgo);
    const paidAmountCents = (Math.floor(Math.random() * 50) + 10) * 10000; // $1,000 - $6,000

    billingRecordData.push({
      workspace_id: studio.id,
      organization_id: org.id,
      direction: "receivable" as const,
      status: "paid" as const,
      amount_cents: paidAmountCents,
      amount_paid_cents: paidAmountCents,
      currency: "USD",
      number: `INV-${Date.now()}-${i}`,
      vendor_label: org.name,
      issued_at: new Date(paidDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      due_at: paidDate.toISOString(),
      paid_at: paidDate.toISOString(),
      provider: "manual" as const,
      source: "user" as const,
      origin: "added" as const,
      created_at: paidDate.toISOString(),
    });

    // Create an overdue/due receivable (for action items)
    if (i < 3) {
      const dueDaysAgo = i === 0 ? 10 : i === 1 ? 3 : -5; // 10 days overdue, 3 days overdue, due in 5 days
      const dueDate = new Date(now);
      dueDate.setDate(now.getDate() - dueDaysAgo);

      billingRecordData.push({
        workspace_id: studio.id,
        organization_id: org.id,
        direction: "receivable" as const,
        status: dueDaysAgo > 0 ? ("overdue" as const) : ("due" as const),
        amount_cents: (Math.floor(Math.random() * 30) + 5) * 10000, // $500 - $3,500
        amount_paid_cents: 0,
        currency: "USD",
        number: `INV-${Date.now()}-${i}-pending`,
        vendor_label: org.name,
        issued_at: new Date(dueDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        due_at: dueDate.toISOString(),
        paid_at: null,
        provider: "manual" as const,
        source: "user" as const,
        origin: "added" as const,
        created_at: new Date(dueDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  }

  try {
    const { data: createdRecords, error: billingError } = await supabase
      .from("billing_records")
      .insert(billingRecordData)
      .select();

    if (billingError) {
      results.push(`Billing record error: ${billingError.message}`);
    } else {
      results.push(`Created ${createdRecords?.length || 0} test billing records`);
    }
  } catch (e) {
    results.push(`Billing records table might not exist: ${e}`);
  }

  // 2. Get or create projects
  let { data: projects } = await supabase
    .from("work")
    .select("id, name, organization_id")
    .eq("workspace_id", studio.id)
    .limit(3);

  // If no projects exist, create some
  if (!projects || projects.length === 0) {
    const projectsToCreate = orgs.slice(0, Math.min(3, orgs.length)).map((org, i) => ({
      workspace_id: studio.id,
      organization_id: org.id,
      name: i === 0 ? "Website Redesign" : i === 1 ? "Brand Identity" : "Marketing Campaign",
      slug: i === 0 ? "website-redesign" : i === 1 ? "brand-identity" : "marketing-campaign",
      description: i === 0
        ? "Complete website redesign with modern UI/UX"
        : i === 1
        ? "Full brand identity including logo, colors, and guidelines"
        : "Q1 marketing campaign across digital channels",
      status: i === 0 ? "active" : i === 1 ? "active" : "draft",
    }));

    const { data: createdProjects, error: projectError } = await supabase
      .from("work")
      .insert(projectsToCreate)
      .select();

    if (projectError) {
      results.push(`Project creation error: ${projectError.message}`);
    } else {
      projects = createdProjects;
      results.push(`Created ${createdProjects?.length || 0} test projects`);
    }
  }

  if (projects && projects.length > 0) {
    const milestoneData = [];

    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      const dueDaysFromNow = i === 0 ? -2 : i === 1 ? 2 : 7; // overdue, due soon, pending
      const dueDate = new Date(now);
      dueDate.setDate(now.getDate() + dueDaysFromNow);

      milestoneData.push({
        work_id: project.id,
        title: i === 0 ? "Design Review" : i === 1 ? "Final Delivery" : "Client Feedback",
        due_at: dueDate.toISOString(),
        status: "not_started", // valid values: 'not_started', 'in_progress', 'complete'
        order_index: i, // required field
        created_at: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    try {
      const { data: createdMilestones, error: milestoneError } = await supabase
        .from("work_delivery_milestones")
        .insert(milestoneData)
        .select();

      if (milestoneError) {
        results.push(`Milestone error: ${milestoneError.message}`);
      } else {
        results.push(`Created ${createdMilestones?.length || 0} test milestones`);
      }
    } catch (e) {
      results.push(`Milestones table might not exist: ${e}`);
    }
  }

  // 3. Mark one project as completed (for wins)
  if (projects && projects.length > 0) {
    const completedDate = new Date(now);
    completedDate.setDate(now.getDate() - 5);

    await supabase
      .from("work")
      .update({
        status: "completed",
        updated_at: completedDate.toISOString()
      })
      .eq("id", projects[0].id);

    results.push(`Marked project "${projects[0].name}" as completed`);
  }

  // 4. Create retainer work (for MRR/recurring revenue)
  const orgsForRetainers = orgs.slice(0, Math.min(3, orgs.length));

  if (orgsForRetainers.length > 0) {
    const retainerAmounts = [150000, 250000, 100000]; // $1,500, $2,500, $1,000 per month
    const retainerStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); // Started 60 days ago

    const retainerData = orgsForRetainers.map((org, i) => ({
      workspace_id: studio.id,
      organization_id: org.id,
      name: `${org.name} - Monthly Retainer`,
      slug: `retainer-${Date.now()}-${i}`,
      description: `Monthly retainer for ${org.name}`,
      work_type: "retainer" as const,
      status: "active",
      retainer_mrr_cents: retainerAmounts[i % retainerAmounts.length],
      retainer_start_date: retainerStart.toISOString().split("T")[0],
      created_at: retainerStart.toISOString(),
    }));

    try {
      const { data: createdRetainers, error: retainerError } = await supabase
        .from("work")
        .insert(retainerData)
        .select();

      if (retainerError) {
        results.push(`Retainer error: ${retainerError.message}`);
      } else {
        const totalMrr = retainerData.reduce((sum, r) => sum + r.retainer_mrr_cents, 0) / 100;
        results.push(`Created ${createdRetainers?.length || 0} retainer work items (MRR: $${totalMrr.toLocaleString()})`);
      }
    } catch (e) {
      results.push(`Projects table might not exist: ${e}`);
    }
  }

  return {
    success: true,
    message: results.join("\n"),
    organizationCount: orgs.length
  };
}
