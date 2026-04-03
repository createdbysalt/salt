"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import type { MetricCard, ActionItem, RecentWin } from "./types";

export interface ProjectStatusBreakdown {
  name: string;
  count: number;
}

export interface MilestoneStatusData {
  completed: number;
  upcoming: number;
  overdue: number;
  future: number;
}

export interface WorkDashboardData {
  metrics: {
    activeProjects: MetricCard;
    activeRetainers: MetricCard;
    milestonesThisWeek: MetricCard;
    overdueItems: MetricCard;
  };
  projectStatus: ProjectStatusBreakdown[];
  milestoneStatus: MilestoneStatusData;
  actionItems: ActionItem[];
  recentWins: RecentWin[];
  generatedAt: string;
}

export async function getWorkDashboardData(): Promise<WorkDashboardData> {
  const { context } = await getTenantContext();
  const studio = requireStudioMember(context);
  const supabase = await createClient();

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(now.getDate() - 14);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  // Fetch all data in parallel
  const [projectsResult, retainersResult, tasksResult, milestonesResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, status, created_at, updated_at, clients(id, name)")
      .eq("studio_id", studio.id),
    supabase
      .from("projects")
      .select("id, name, status, retainer_end_date, clients(id, name)")
      .eq("studio_id", studio.id)
      .eq("is_retainer", true),
    supabase
      .from("tasks")
      .select("id, title, status, due_date, completed_at, projects(id, name)")
      .eq("studio_id", studio.id),
    supabase
      .from("milestones")
      .select("id, title, status, due_date, completed_at, projects(id, name)")
      .eq("studio_id", studio.id),
  ]);

  const projects = projectsResult.data || [];
  const retainers = retainersResult.data || [];
  const tasks = tasksResult.data || [];
  const milestones = milestonesResult.data || [];

  // Calculate project status breakdown
  const statusCounts = new Map<string, number>();
  const allStatuses = ["active", "on_hold", "completed", "cancelled"];
  for (const status of allStatuses) {
    statusCounts.set(status, 0);
  }

  for (const project of projects) {
    const status = project.status || "active";
    const currentCount = statusCounts.get(status) || 0;
    statusCounts.set(status, currentCount + 1);
  }

  const projectStatus: ProjectStatusBreakdown[] = [
    { name: "Active", count: statusCounts.get("active") || 0 },
    { name: "On Hold", count: statusCounts.get("on_hold") || 0 },
    { name: "Completed", count: statusCounts.get("completed") || 0 },
    { name: "Cancelled", count: statusCounts.get("cancelled") || 0 },
  ];

  // Calculate milestone status breakdown
  const thirtyDaysFromNow = new Date(now);
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  const milestoneStatus: MilestoneStatusData = {
    completed: milestones.filter((m) => m.status === "completed").length,
    upcoming: milestones.filter((m) => {
      if (m.status === "completed") return false;
      if (!m.due_date) return false;
      const dueDate = new Date(m.due_date);
      return dueDate >= now && dueDate <= thirtyDaysFromNow;
    }).length,
    overdue: milestones.filter((m) => {
      if (m.status === "completed") return false;
      if (!m.due_date) return false;
      const dueDate = new Date(m.due_date);
      return dueDate < now;
    }).length,
    future: milestones.filter((m) => {
      if (m.status === "completed") return false;
      if (!m.due_date) return true; // No due date = future
      const dueDate = new Date(m.due_date);
      return dueDate > thirtyDaysFromNow;
    }).length,
  };

  // Calculate metrics
  const activeProjects = projects.filter((p) => p.status === "active" || !p.status).length;
  const activeRetainersCount = retainers.filter(
    (r) => r.status === "active" || !r.status
  ).length;

  // Milestones due this week
  const milestonesThisWeek = milestones.filter((m) => {
    if (m.status === "completed") return false;
    if (!m.due_date) return false;
    const dueDate = new Date(m.due_date);
    return dueDate >= startOfWeek && dueDate < endOfWeek;
  }).length;

  // Overdue items (milestones past due date)
  const overdueCount = milestones.filter((m) => {
    if (m.status === "completed") return false;
    if (!m.due_date) return false;
    const dueDate = new Date(m.due_date);
    return dueDate < now;
  }).length;

  // Build metric cards (NO money data)
  const activeProjectsCard: MetricCard = {
    title: "Active Projects",
    value: activeProjects.toString(),
    rawValue: activeProjects,
    badge: {
      value: activeProjects > 0 ? "In progress" : "None active",
      trend: activeProjects > 0 ? "up" : "neutral",
    },
    context: {
      line1: `${projects.length} total projects`,
      line2: activeProjects > 0 ? "Track progress in Projects" : "Create a project to get started",
    },
  };

  const activeRetainersCard: MetricCard = {
    title: "Active Retainers",
    value: activeRetainersCount.toString(),
    rawValue: activeRetainersCount,
    badge: {
      value: activeRetainersCount > 0 ? "Ongoing" : "None active",
      trend: activeRetainersCount > 0 ? "up" : "neutral",
    },
    context: {
      line1: `${retainers.length} total retainers`,
      line2: activeRetainersCount > 0 ? "Recurring client work" : "Set up retainers for repeat clients",
    },
  };

  const milestonesThisWeekCard: MetricCard = {
    title: "Milestones This Week",
    value: milestonesThisWeek.toString(),
    rawValue: milestonesThisWeek,
    badge: {
      value: milestonesThisWeek > 0 ? "Due soon" : "All clear",
      trend: milestonesThisWeek > 3 ? "down" : "neutral",
    },
    context: {
      line1: milestonesThisWeek > 0 ? "Review upcoming deliverables" : "No deadlines this week",
      line2: `${milestones.filter((m) => m.status !== "completed").length} total open milestones`,
    },
  };

  const overdueItemsCard: MetricCard = {
    title: "Overdue",
    value: overdueCount.toString(),
    rawValue: overdueCount,
    badge: {
      value: overdueCount === 0 ? "On track" : overdueCount === 1 ? "1 item" : `${overdueCount} items`,
      trend: overdueCount === 0 ? "up" : "down",
    },
    context: {
      line1: overdueCount === 0 ? "All milestones on schedule" : "Milestones past due date",
      line2: overdueCount > 0 ? "Review and update timelines" : "Keep up the momentum",
    },
  };

  // Build action items (work-focused)
  const actionItems: ActionItem[] = [];

  // Overdue tasks
  for (const task of tasks) {
    if (task.status === "completed" || !task.due_date) continue;
    const dueDate = new Date(task.due_date);
    if (dueDate < now) {
      const daysOverdue = Math.floor(
        (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const project = task.projects as unknown as { id: string; name: string } | null;
      actionItems.push({
        id: `task-${task.id}`,
        type: "milestone",
        title: task.title,
        subtitle: project?.name || "No project",
        status: "overdue",
        daysOverdue,
        href: project ? `/work/projects/${project.id}` : "/work/projects",
      });
    }
  }

  // Overdue milestones
  for (const milestone of milestones) {
    if (milestone.status === "completed" || !milestone.due_date) continue;
    const dueDate = new Date(milestone.due_date);
    if (dueDate < now) {
      const daysOverdue = Math.floor(
        (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const project = milestone.projects as unknown as { id: string; name: string } | null;
      actionItems.push({
        id: `milestone-${milestone.id}`,
        type: "milestone",
        title: milestone.title,
        subtitle: project?.name || "No project",
        status: "overdue",
        daysOverdue,
        href: project ? `/work/projects/${project.id}` : "/work/projects",
      });
    }
  }

  // Tasks due soon (next 3 days)
  const threeDaysFromNow = new Date(now);
  threeDaysFromNow.setDate(now.getDate() + 3);
  for (const task of tasks) {
    if (task.status === "completed" || !task.due_date) continue;
    const dueDate = new Date(task.due_date);
    if (dueDate >= now && dueDate <= threeDaysFromNow) {
      const project = task.projects as unknown as { id: string; name: string } | null;
      actionItems.push({
        id: `task-soon-${task.id}`,
        type: "milestone",
        title: task.title,
        subtitle: project?.name || "No project",
        status: "due_soon",
        dueDate,
        href: project ? `/work/projects/${project.id}` : "/work/projects",
      });
    }
  }

  // Sort by severity (overdue first, then due_soon)
  actionItems.sort((a, b) => {
    if (a.status === "overdue" && b.status !== "overdue") return -1;
    if (b.status === "overdue" && a.status !== "overdue") return 1;
    return (b.daysOverdue || 0) - (a.daysOverdue || 0);
  });

  // Build recent wins
  const recentWins: RecentWin[] = [];

  // Recently completed projects
  const recentCompletedProjects = projects
    .filter(
      (p) =>
        p.status === "completed" &&
        new Date(p.updated_at) >= fourteenDaysAgo
    )
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  for (const project of recentCompletedProjects) {
    const client = project.clients as unknown as { id: string; name: string } | null;
    recentWins.push({
      id: `project-${project.id}`,
      type: "project_completed",
      title: "Project completed",
      subtitle: project.name,
      timestamp: new Date(project.updated_at),
      href: `/work/projects/${project.id}`,
    });
  }

  // Recently completed tasks
  const recentCompletedTasks = tasks
    .filter(
      (t) =>
        t.status === "completed" &&
        t.completed_at &&
        new Date(t.completed_at) >= fourteenDaysAgo
    )
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())
    .slice(0, 5);

  for (const task of recentCompletedTasks) {
    const project = task.projects as unknown as { id: string; name: string } | null;
    recentWins.push({
      id: `task-done-${task.id}`,
      type: "project_completed",
      title: "Task completed",
      subtitle: task.title,
      timestamp: new Date(task.completed_at!),
      href: project ? `/work/projects/${project.id}` : "/work/projects",
    });
  }

  recentWins.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return {
    metrics: {
      activeProjects: activeProjectsCard,
      activeRetainers: activeRetainersCard,
      milestonesThisWeek: milestonesThisWeekCard,
      overdueItems: overdueItemsCard,
    },
    projectStatus,
    milestoneStatus,
    actionItems: actionItems.slice(0, 10),
    recentWins: recentWins.slice(0, 5),
    generatedAt: now.toISOString(),
  };
}
