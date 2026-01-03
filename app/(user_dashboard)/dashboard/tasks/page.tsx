import { getStudioContext } from "@/libs/user-dashboard";
import { TasksPageClient } from "./TasksPageClient";
import type { TaskWithRelations } from "@/src/features/tasks/types";

export const dynamic = "force-dynamic";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    client?: string;
    project?: string;
    status?: string;
    assigned_to?: string;
    tag?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const { search, client, project, status, assigned_to, tag } = params;
  const { studio, supabase } = await getStudioContext();

  // Build query for tasks
  let query = supabase
    .from("tasks")
    .select(
      `
      *,
      project:projects(id, name, slug),
      client:clients(id, name, slug),
      assignee:profiles!tasks_assigned_to_fkey(id, display_name, email, avatar_url)
    `
    )
    .eq("studio_id", studio.id)
    .order("created_at", { ascending: false });

  // Apply filters
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }

  if (client) {
    query = query.eq("client_id", client);
  }

  if (project) {
    query = query.eq("project_id", project);
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (assigned_to) {
    query = query.eq("assigned_to", assigned_to);
  }

  const { data: tasks, error: tasksError } = await query;

  if (tasksError) {
    console.error("Error fetching tasks:", tasksError);
  }

  // Filter by tags if provided
  let filteredTasks = tasks || [];
  if (tag) {
    const tagIds = Array.isArray(tag) ? tag : [tag];
    
    const { data: tagAssignments } = await supabase
      .from("tag_assignments")
      .select("entity_id, tag_id")
      .eq("entity_type", "task")
      .in("tag_id", tagIds);

    if (tagAssignments) {
      const taskIdsWithTags = new Set(tagAssignments.map((ta) => ta.entity_id));
      filteredTasks = filteredTasks.filter((t) => taskIdsWithTags.has(t.id));
    }
  }

  // Get clients for filter dropdown
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("studio_id", studio.id)
    .order("name");

  // Get projects for filter dropdown
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, client_id")
    .eq("studio_id", studio.id)
    .order("name");

  // Get team members for assignee filter
  const { data: teamMembers } = await supabase
    .from("studio_members")
    .select("user_id, profiles!studio_members_user_id_fkey(id, display_name, email, avatar_url)")
    .eq("studio_id", studio.id);

  const assignees = teamMembers?.map((tm: any) => ({
    id: tm.profiles.id,
    display_name: tm.profiles.display_name || tm.profiles.email,
    email: tm.profiles.email,
    avatar_url: tm.profiles.avatar_url,
  })) || [];

  // Get tags for filter
  const { data: tags } = await supabase
    .from("tags")
    .select("*")
    .eq("studio_id", studio.id)
    .eq("type", "task")
    .order("label");

  return (
    <TasksPageClient
      tasks={filteredTasks as TaskWithRelations[]}
      clients={clients || []}
      projects={projects || []}
      assignees={assignees}
      tags={tags || []}
      initialFilters={{
        search: search || "",
        client: client || "",
        project: project || "",
        status: status || "",
        assigned_to: assigned_to || "",
        tags: Array.isArray(tag) ? tag : tag ? [tag] : [],
      }}
    />
  );
}
