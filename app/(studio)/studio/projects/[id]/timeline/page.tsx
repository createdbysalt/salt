import { notFound } from "next/navigation";
import { getProjectDetail, getMilestones } from "@/app/_features/projects/queries";
import { ProjectDetailTimeline } from "@/app/_features/projects/components";

export default async function ProjectTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Use cached query - ensures consistent auth context with layout
  const project = await getProjectDetail(id);

  if (!project) {
    notFound();
  }

  // Fetch milestones
  const milestones = await getMilestones(id);

  // Transform milestones for the timeline component
  const timelineMilestones = milestones.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    status: m.status as "not_started" | "pending" | "in_progress" | "complete",
    dueAt: m.dueAt?.toISOString() || null,
    completedAt: m.completedAt?.toISOString() || null,
    orderIndex: m.orderIndex,
    taskProgress: m.taskCount !== undefined ? {
      completed: m.completedTaskCount || 0,
      total: m.taskCount,
    } : undefined,
  }));

  return (
    <ProjectDetailTimeline
      projectId={id}
      milestones={timelineMilestones}
      projectStartDate={project.start_date}
      projectDeadline={project.deadline}
    />
  );
}
