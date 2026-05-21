import { notFound } from "next/navigation";
import { MOCK_TEAMS } from "@/app/_lib/demo";
import { TeamDetailPage } from "@/app/_features/teams/components/TeamDetailPage";

export default async function TeamDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const team = MOCK_TEAMS.find((item) => item.id === id);
  if (!team) notFound();
  return <TeamDetailPage teamId={id} />;
}
