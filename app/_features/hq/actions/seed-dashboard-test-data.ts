"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";

/**
 * Seeds test data for dashboard visualization
 * Run this once to populate invoices, proposals, and update client stages
 */
export async function seedDashboardTestData() {
  const { context } = await getTenantContext();
  const studio = requireWorkspaceMember(context);
  const supabase = await createClient();

  const now = new Date();
  const results: string[] = [];

  // Get existing clients
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, lifecycle_stage")
    .eq("workspace_id", studio.id)
    .limit(10);

  if (!clients || clients.length === 0) {
    return { success: false, message: "No clients found. Create some clients first." };
  }

  // 1. Update some clients to different lifecycle stages
  const stageUpdates = [
    { stage: "lead", count: 0 },
    { stage: "discovery", count: 0 },
    { stage: "pitch", count: 0 },
    { stage: "client", count: 0 },
  ];

  for (let i = 0; i < clients.length; i++) {
    const stageIndex = i % 4;
    const stage = stageUpdates[stageIndex].stage;

    // Set stage_entered_at to various days ago for variety
    const daysAgo = stageIndex === 0 ? 45 : stageIndex === 1 ? 14 : stageIndex === 2 ? 3 : 0;
    const stageEnteredAt = new Date(now);
    stageEnteredAt.setDate(now.getDate() - daysAgo);

    await supabase
      .from("clients")
      .update({
        lifecycle_stage: stage,
        stage_entered_at: stageEnteredAt.toISOString()
      })
      .eq("id", clients[i].id);

    stageUpdates[stageIndex].count++;
  }
  results.push(`Updated client stages: ${stageUpdates.map(s => `${s.count} ${s.stage}`).join(", ")}`);

  // 2. Create test invoices with various statuses and dates
  const invoiceData = [];
  const clientsForInvoices = clients.slice(0, Math.min(5, clients.length));

  for (let i = 0; i < clientsForInvoices.length; i++) {
    const client = clientsForInvoices[i];

    // Create a paid invoice (for wins + revenue chart)
    const paidDaysAgo = Math.floor(Math.random() * 30) + 1;
    const paidDate = new Date(now);
    paidDate.setDate(now.getDate() - paidDaysAgo);

    invoiceData.push({
      workspace_id: studio.id,
      client_id: client.id,
      amount_cents: (Math.floor(Math.random() * 50) + 10) * 10000, // $1,000 - $6,000
      status: "paid",
      paid_at: paidDate.toISOString(),
      due_date: paidDate.toISOString().split('T')[0], // date type, not timestamptz
      invoice_number: `INV-${Date.now()}-${i}`,
      created_at: paidDate.toISOString(),
    });

    // Create an overdue/sent invoice (for action items)
    if (i < 3) {
      const dueDaysAgo = i === 0 ? 10 : i === 1 ? 3 : -5; // 10 days overdue, 3 days overdue, due in 5 days
      const dueDate = new Date(now);
      dueDate.setDate(now.getDate() - dueDaysAgo);

      invoiceData.push({
        workspace_id: studio.id,
        client_id: client.id,
        amount_cents: (Math.floor(Math.random() * 30) + 5) * 10000, // $500 - $3,500
        status: dueDaysAgo > 0 ? "overdue" : "sent",
        due_date: dueDate.toISOString().split('T')[0], // date type, not timestamptz
        invoice_number: `INV-${Date.now()}-${i}-pending`,
        created_at: new Date(dueDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  }

  try {
    const { data: createdInvoices, error: invoiceError } = await supabase
      .from("portal_invoices")
      .insert(invoiceData)
      .select();

    if (invoiceError) {
      results.push(`Invoice error: ${invoiceError.message}`);
    } else {
      results.push(`Created ${createdInvoices?.length || 0} test invoices`);
    }
  } catch (e) {
    results.push(`Invoice table might not exist: ${e}`);
  }

  // 3. Create test proposals
  const proposalData = [];
  const clientsForProposals = clients.slice(0, Math.min(4, clients.length));

  for (let i = 0; i < clientsForProposals.length; i++) {
    const client = clientsForProposals[i];

    if (i < 2) {
      // Sent proposals (for action items + pipeline)
      const sentDaysAgo = i === 0 ? 12 : 3;
      const sentDate = new Date(now);
      sentDate.setDate(now.getDate() - sentDaysAgo);

      proposalData.push({
        workspace_id: studio.id,
        client_id: client.id,
        title: `${client.name} - Website Redesign`,
        total_amount: (Math.floor(Math.random() * 100) + 20) * 100, // $2,000 - $12,000 (numeric, in dollars)
        status: "sent",
        sent_at: sentDate.toISOString(),
        created_at: sentDate.toISOString(),
        updated_at: sentDate.toISOString(),
      });
    } else {
      // Accepted proposals (for wins)
      const acceptedDaysAgo = Math.floor(Math.random() * 10) + 1;
      const acceptedDate = new Date(now);
      acceptedDate.setDate(now.getDate() - acceptedDaysAgo);

      proposalData.push({
        workspace_id: studio.id,
        client_id: client.id,
        title: `${client.name} - Brand Package`,
        total_amount: (Math.floor(Math.random() * 80) + 30) * 100, // $3,000 - $11,000 (numeric, in dollars)
        status: "accepted",
        sent_at: new Date(acceptedDate.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: acceptedDate.toISOString(),
        created_at: new Date(acceptedDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  }

  try {
    const { data: createdProposals, error: proposalError } = await supabase
      .from("proposals")
      .insert(proposalData)
      .select();

    if (proposalError) {
      results.push(`Proposal error: ${proposalError.message}`);
    } else {
      results.push(`Created ${createdProposals?.length || 0} test proposals`);
    }
  } catch (e) {
    results.push(`Proposals table might not exist: ${e}`);
  }

  // 4. Get or create projects
  let { data: projects } = await supabase
    .from("projects")
    .select("id, name, client_id")
    .eq("workspace_id", studio.id)
    .limit(3);

  // If no projects exist, create some
  if (!projects || projects.length === 0) {
    const projectsToCreate = clients.slice(0, Math.min(3, clients.length)).map((client, i) => ({
      workspace_id: studio.id,
      client_id: client.id,
      name: i === 0 ? "Website Redesign" : i === 1 ? "Brand Identity" : "Marketing Campaign",
      slug: i === 0 ? "website-redesign" : i === 1 ? "brand-identity" : "marketing-campaign",
      description: i === 0
        ? "Complete website redesign with modern UI/UX"
        : i === 1
        ? "Full brand identity including logo, colors, and guidelines"
        : "Q1 marketing campaign across digital channels",
      status: i === 0 ? "active" : i === 1 ? "active" : "draft",
      project_type: i === 0 ? "Web Design" : i === 1 ? "Branding" : "Marketing",
    }));

    const { data: createdProjects, error: projectError } = await supabase
      .from("projects")
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
        project_id: project.id,
        title: i === 0 ? "Design Review" : i === 1 ? "Final Delivery" : "Client Feedback",
        due_at: dueDate.toISOString(),
        status: "not_started", // valid values: 'not_started', 'in_progress', 'complete'
        order_index: i, // required field
        created_at: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    try {
      const { data: createdMilestones, error: milestoneError } = await supabase
        .from("project_milestones")
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

  // 5. Mark one project as completed (for wins)
  if (projects && projects.length > 0) {
    const completedDate = new Date(now);
    completedDate.setDate(now.getDate() - 5);

    await supabase
      .from("projects")
      .update({
        status: "completed",
        updated_at: completedDate.toISOString()
      })
      .eq("id", projects[0].id);

    results.push(`Marked project "${projects[0].name}" as completed`);
  }

  // 6. Create retainer subscriptions (for MRR/recurring revenue)
  const clientsInClientStage = clients.filter(c => c.lifecycle_stage === "client" || stageUpdates[3].count > 0);
  const clientsForRetainers = clientsInClientStage.slice(0, Math.min(3, clientsInClientStage.length));

  if (clientsForRetainers.length > 0) {
    const subscriptionData = [];
    const periodStart = new Date(now);
    periodStart.setDate(1); // First of this month
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    periodEnd.setDate(1); // First of next month

    const retainerAmounts = [150000, 250000, 100000]; // $1,500, $2,500, $1,000 per month

    for (let i = 0; i < clientsForRetainers.length; i++) {
      const client = clientsForRetainers[i];
      subscriptionData.push({
        workspace_id: studio.id,
        client_id: client.id,
        stripe_subscription_id: `sub_test_${Date.now()}_${i}`,
        stripe_customer_id: `cus_test_${client.id.slice(0, 8)}`,
        status: "active",
        amount_cents: retainerAmounts[i % retainerAmounts.length],
        currency: "usd",
        interval: "month",
        interval_count: 1,
        description: `Monthly retainer for ${client.name}`,
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        created_at: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(), // Started 60 days ago
      });
    }

    try {
      const { data: createdSubs, error: subError } = await supabase
        .from("portal_client_subscriptions")
        .insert(subscriptionData)
        .select();

      if (subError) {
        results.push(`Subscription error: ${subError.message}`);
      } else {
        const totalMrr = subscriptionData.reduce((sum, s) => sum + s.amount_cents, 0) / 100;
        results.push(`Created ${createdSubs?.length || 0} retainer subscriptions (MRR: $${totalMrr.toLocaleString()})`);
      }
    } catch (e) {
      results.push(`Subscriptions table might not exist: ${e}`);
    }
  }

  return {
    success: true,
    message: results.join("\n"),
    clientCount: clients.length
  };
}
