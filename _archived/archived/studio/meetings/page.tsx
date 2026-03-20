import { MeetingsPageClient } from "./MeetingsPageClient";
import { getMeetings } from "@/app/_features/calendar/queries";
import { getStudioContext } from "@/app/_lib/utils/user-dashboard";

export const dynamic = "force-dynamic";

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    new?: string;
    view?: string;
    date?: string;
    client?: string;
  }>;
}) {
  const params = await searchParams;
  const { studio, supabase } = await getStudioContext();
  
  // Determine date range based on view (default to today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let startDate = today;
  let endDate = new Date(today);
  endDate.setHours(23, 59, 59, 999);
  
  // Adjust range based on view
  const view = params.view || "today";
  if (view === "week") {
    const dayOfWeek = today.getDay();
    startDate = new Date(today);
    startDate.setDate(today.getDate() - dayOfWeek);
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  } else if (view === "month") {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (view === "agenda") {
    // Show all future meetings
    startDate = today;
    endDate = new Date(today);
    endDate.setFullYear(today.getFullYear() + 1); // Next year
  }
  
  // Fetch meetings from DB
  const meetings = await getMeetings({
    startDate,
    endDate,
    clientId: params.client,
  });
  
  // Get clients for the create dialog
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("studio_id", studio.id)
    .order("name");
  
  // Get projects for the create dialog
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, client_id")
    .eq("studio_id", studio.id)
    .order("name");
  
  return (
    <MeetingsPageClient
      initialView={params.view as "today" | "week" | "month" | "agenda" | undefined}
      initialDate={params.date}
      openCreateDialog={params.new === "1"}
      meetings={meetings}
      clients={clients || []}
      projects={projects || []}
    />
  );
}

