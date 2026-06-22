import { TeamDetailPage } from "@/app/_features/teams/components/TeamDetailPage";

export default async function TeamDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TeamDetailPage teamId={id} />;
}
