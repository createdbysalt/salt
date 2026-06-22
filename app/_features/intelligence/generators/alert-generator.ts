/**
 * Alert Insight Generator
 *
 * Generates actionable alert insights from real database data.
 * Alerts are only created when there's something that requires attention.
 */

import { createClient } from "@/app/_lib/supabase/server";
import { calculateClientHealthScore } from "@/app/_features/people/actions/clients/calculate-health-score";
import type {
  AlertInsight,
  DataSource,
  InsightSentiment,
  InsightUrgency,
} from "../types/ambient-intelligence";

// ============================================================================
// Client Alert Generators
// ============================================================================

/**
 * Generate alerts for clients needing attention
 * Triggers: Low health score, no contact in 30+ days, overdue invoices
 */
export async function generateClientAttentionAlerts(
  studioId: string
): Promise<AlertInsight[]> {
  const alerts: AlertInsight[] = [];
  const now = new Date();

  try {
    const supabase = await createClient();

    // Get all active clients
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name, last_contact_at, status, settings")
      .eq("studio_id", studioId)
      .is("archived_at", null);

    if (!clients) return [];

    const activeClients = clients.filter(
      (c) => (c.status || c.settings?.status || "active") === "active"
    );

    for (const client of activeClients) {
      // Check health score
      try {
        const healthResult = await calculateClientHealthScore(client.id);

        if (healthResult.score < 50) {
          alerts.push({
            id: `alert-health-critical-${client.id}-${now.getTime()}`,
            category: "alert",
            sentiment: "negative",
            priority: 10,
            generatedAt: now,
            alert: {
              title: `${client.name} needs attention`,
              description: `Health score is ${healthResult.score}% - consider reaching out.`,
              entityType: "client",
              entityId: client.id,
              entityName: client.name,
              dataSource: {
                table: "clients, portal_invoices",
                computation: `calculateClientHealthScore('${client.id}') = ${healthResult.score}`,
                computedAt: now,
                entityIds: [client.id],
              },
            },
            meaning: {
              plainEnglish: `${client.name}'s health score has dropped to ${healthResult.score}%.`,
              whyItMatters:
                "Clients with scores below 50% are at high risk of churning.",
            },
            action: {
              label: "View client",
              href: `/people/${client.id}`,
              urgency: "high",
              icon: "User",
            },
          });
        }
      } catch (e) {
        // Skip if health calculation fails
      }

      // Check last contact
      const lastContact =
        client.last_contact_at || client.settings?.lastContact;
      if (lastContact) {
        const daysSinceContact = Math.floor(
          (now.getTime() - new Date(lastContact).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        if (daysSinceContact >= 30) {
          const urgency: InsightUrgency =
            daysSinceContact >= 60 ? "high" : "medium";
          const sentiment: InsightSentiment =
            daysSinceContact >= 60 ? "negative" : "warning";

          alerts.push({
            id: `alert-contact-${client.id}-${now.getTime()}`,
            category: "alert",
            sentiment,
            priority: daysSinceContact >= 60 ? 8 : 6,
            generatedAt: now,
            alert: {
              title: `No contact with ${client.name}`,
              description: `Last contact was ${daysSinceContact} days ago.`,
              entityType: "client",
              entityId: client.id,
              entityName: client.name,
              dataSource: {
                table: "clients",
                computation: `DATEDIFF(NOW(), last_contact_at) = ${daysSinceContact}`,
                computedAt: now,
                entityIds: [client.id],
              },
            },
            meaning: {
              plainEnglish: `You haven't been in touch with ${client.name} for ${daysSinceContact} days.`,
              whyItMatters:
                "Regular contact helps maintain healthy client relationships and prevents churn.",
            },
            action: {
              label: "Send message",
              href: `/people/${client.id}?tab=messages`,
              urgency,
              icon: "MessageSquare",
            },
          });
        }
      }
    }

    // Sort by priority (highest first) and limit
    return alerts.sort((a, b) => b.priority - a.priority).slice(0, 5);
  } catch (error) {
    console.error("Error generating client attention alerts:", error);
    return [];
  }
}

/**
 * Generate alerts for overdue invoices
 */
export async function generateOverdueInvoiceAlerts(
  studioId: string
): Promise<AlertInsight[]> {
  const alerts: AlertInsight[] = [];
  const now = new Date();

  try {
    const supabase = await createClient();

    // Get overdue invoices
    const { data: overdueInvoices } = await supabase
      .from("portal_invoices")
      .select(
        `
        id,
        amount_cents,
        due_date,
        client_id,
        clients!inner(id, name)
      `
      )
      .eq("studio_id", studioId)
      .eq("status", "sent")
      .lt("due_date", now.toISOString())
      .order("due_date", { ascending: true });

    if (!overdueInvoices) return [];

    for (const invoice of overdueInvoices) {
      const daysOverdue = Math.floor(
        (now.getTime() - new Date(invoice.due_date).getTime()) /
          (1000 * 60 * 60 * 24)
      );

      const amount = invoice.amount_cents / 100;
      const formattedAmount =
        amount >= 1000 ? `$${(amount / 1000).toFixed(1)}k` : `$${amount}`;

      const clientName = (invoice as any).clients.name;
      const urgency: InsightUrgency =
        daysOverdue >= 30 ? "critical" : daysOverdue >= 14 ? "high" : "medium";
      const sentiment: InsightSentiment =
        daysOverdue >= 14 ? "negative" : "warning";

      alerts.push({
        id: `alert-invoice-${invoice.id}-${now.getTime()}`,
        category: "alert",
        sentiment,
        priority: daysOverdue >= 30 ? 10 : daysOverdue >= 14 ? 8 : 6,
        generatedAt: now,
        alert: {
          title: `Invoice overdue from ${clientName}`,
          description: `${formattedAmount} is ${daysOverdue} days overdue.`,
          entityType: "invoice",
          entityId: invoice.id,
          entityName: `Invoice for ${clientName}`,
          dataSource: {
            table: "portal_invoices",
            computation: `SELECT * WHERE status = 'sent' AND due_date < NOW()`,
            computedAt: now,
            entityIds: [invoice.id, invoice.client_id],
          },
        },
        meaning: {
          plainEnglish: `${clientName} has an unpaid invoice of ${formattedAmount} that's ${daysOverdue} days overdue.`,
          whyItMatters:
            "Overdue invoices impact your cash flow and can signal client relationship issues.",
        },
        action: {
          label: "Send reminder",
          href: `/people/${invoice.client_id}?tab=invoices`,
          urgency,
          icon: "Send",
        },
      });
    }

    return alerts.sort((a, b) => b.priority - a.priority).slice(0, 5);
  } catch (error) {
    console.error("Error generating overdue invoice alerts:", error);
    return [];
  }
}

/**
 * Generate alerts for upcoming meetings (today)
 */
export async function generateUpcomingMeetingAlerts(
  studioId: string
): Promise<AlertInsight[]> {
  const alerts: AlertInsight[] = [];
  const now = new Date();

  try {
    const supabase = await createClient();

    // Get today's start and end
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // Get meetings for today
    const { data: meetings } = await supabase
      .from("calendar_events")
      .select(
        `
        id,
        title,
        starts_at,
        client_id,
        clients(id, name)
      `
      )
      .eq("studio_id", studioId)
      .gte("starts_at", todayStart.toISOString())
      .lte("starts_at", todayEnd.toISOString())
      .order("starts_at", { ascending: true });

    if (!meetings) return [];

    for (const meeting of meetings) {
      const meetingTime = new Date(meeting.starts_at);
      const minutesUntil = Math.floor(
        (meetingTime.getTime() - now.getTime()) / (1000 * 60)
      );

      // Only alert for meetings in the future (or within last 5 minutes)
      if (minutesUntil < -5) continue;

      const timeStr = meetingTime.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      const clientName = (meeting as any).clients?.name;
      const urgency: InsightUrgency =
        minutesUntil <= 15 ? "high" : minutesUntil <= 60 ? "medium" : "low";

      alerts.push({
        id: `alert-meeting-${meeting.id}-${now.getTime()}`,
        category: "alert",
        sentiment: "neutral",
        priority: minutesUntil <= 15 ? 9 : minutesUntil <= 60 ? 7 : 5,
        generatedAt: now,
        alert: {
          title: meeting.title,
          description: clientName
            ? `With ${clientName} at ${timeStr}`
            : `At ${timeStr}`,
          entityType: "meeting" as any,
          entityId: meeting.id,
          entityName: meeting.title,
          dataSource: {
            table: "calendar_events",
            computation: `SELECT * WHERE starts_at BETWEEN '${todayStart.toISOString()}' AND '${todayEnd.toISOString()}'`,
            computedAt: now,
            entityIds: [meeting.id],
          },
        },
        meaning: {
          plainEnglish:
            minutesUntil <= 0
              ? "This meeting is starting now."
              : minutesUntil <= 15
                ? `This meeting starts in ${minutesUntil} minutes.`
                : `You have a meeting at ${timeStr}.`,
          whyItMatters:
            "Being prepared for meetings helps maintain professional relationships.",
        },
        action: {
          label: "View meeting",
          href: "/meetings",
          urgency,
          icon: "Calendar",
        },
      });
    }

    return alerts.sort((a, b) => b.priority - a.priority).slice(0, 3);
  } catch (error) {
    console.error("Error generating meeting alerts:", error);
    return [];
  }
}

// ============================================================================
// Project Alert Generators
// ============================================================================

/**
 * Generate alerts for projects with blockers or overdue milestones
 */
export async function generateProjectAlerts(
  studioId: string,
  projectId?: string
): Promise<AlertInsight[]> {
  const alerts: AlertInsight[] = [];
  const now = new Date();

  try {
    const supabase = await createClient();

    // Build query
    let query = supabase
      .from("projects")
      .select(
        `
        id,
        name,
        status,
        client_id,
        clients(id, name)
      `
      )
      .eq("studio_id", studioId)
      .is("archived_at", null);

    if (projectId) {
      query = query.eq("id", projectId);
    }

    const { data: projects } = await query;

    if (!projects) return [];

    // Check for stalled projects (no activity in 14+ days)
    // This would require an activity log table - for now, check updated_at
    for (const project of projects) {
      // Check for overdue tasks
      const { data: overdueTasks, count: overdueCount } = await supabase
        .from("tasks")
        .select("id", { count: "exact" })
        .eq("project_id", project.id)
        .eq("status", "todo")
        .lt("due_date", now.toISOString());

      if (overdueCount && overdueCount > 0) {
        alerts.push({
          id: `alert-project-tasks-${project.id}-${now.getTime()}`,
          category: "alert",
          sentiment: "warning",
          priority: overdueCount >= 3 ? 8 : 6,
          generatedAt: now,
          alert: {
            title: `${overdueCount} overdue task${overdueCount > 1 ? "s" : ""} in ${project.name}`,
            description: `Project has tasks past their due date.`,
            entityType: "project",
            entityId: project.id,
            entityName: project.name,
            dataSource: {
              table: "tasks",
              computation: `COUNT(*) WHERE project_id = '${project.id}' AND status = 'todo' AND due_date < NOW()`,
              computedAt: now,
              entityIds: [project.id],
            },
          },
          meaning: {
            plainEnglish: `${project.name} has ${overdueCount} task${overdueCount > 1 ? "s" : ""} that ${overdueCount > 1 ? "are" : "is"} overdue.`,
            whyItMatters:
              "Overdue tasks can delay project completion and impact client satisfaction.",
          },
          action: {
            label: "View tasks",
          href: "/work",
            urgency: overdueCount >= 3 ? "high" : "medium",
            icon: "CheckSquare",
          },
        });
      }
    }

    return alerts.sort((a, b) => b.priority - a.priority).slice(0, 5);
  } catch (error) {
    console.error("Error generating project alerts:", error);
    return [];
  }
}

// ============================================================================
// Aggregated Alert Generator
// ============================================================================

/**
 * Generate all relevant alerts for a studio
 * Combines client, invoice, meeting, and project alerts
 */
export async function generateAllAlerts(
  studioId: string
): Promise<AlertInsight[]> {
  const [clientAlerts, invoiceAlerts, meetingAlerts, projectAlerts] =
    await Promise.all([
      generateClientAttentionAlerts(studioId),
      generateOverdueInvoiceAlerts(studioId),
      generateUpcomingMeetingAlerts(studioId),
      generateProjectAlerts(studioId),
    ]);

  // Combine and sort by priority
  const allAlerts = [
    ...clientAlerts,
    ...invoiceAlerts,
    ...meetingAlerts,
    ...projectAlerts,
  ];

  return allAlerts.sort((a, b) => b.priority - a.priority);
}
