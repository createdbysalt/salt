import { getStudioContext } from "@/libs/user-dashboard";
import StudioPageClient from "./StudioPageClient";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const { studio, supabase } = await getStudioContext();

  const { data: studioRow } = await supabase
    .from("studios")
    .select("name")
    .eq("id", studio.id)
    .single();

  return <StudioPageClient studioName={studioRow?.name} />;
}

