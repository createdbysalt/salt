import { notFound } from "next/navigation";
import { MOCK_TEAMS } from "@/app/_lib/demo";
import { isMockContentEnabledForUser } from "@/app/_lib/demo/mock-content.server";
import { TeamDetailPage } from "@/app/_features/teams/components/TeamDetailPage";

export default async function TeamDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const mockContent = await isMockContentEnabledForUser();
  const team = mockContent ? MOCK_TEAMS.find((item) => item.id === id) : undefined;
  if (!team) notFound();
  return <TeamDetailPage teamId={id} />;
}
