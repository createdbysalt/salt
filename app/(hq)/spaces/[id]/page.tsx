import { notFound } from "next/navigation";
import { SpaceDetailPage } from "@/app/_features/spaces/components/SpaceDetailPage";
import { isMockContentEnabledForUser } from "@/app/_lib/demo/mock-content.server";

interface SpaceDetailRouteProps {
  params: Promise<{ id: string }>;
}

export default async function SpaceDetailRoute({ params }: SpaceDetailRouteProps) {
  const { id } = await params;
  const mockContent = await isMockContentEnabledForUser();

  if (!mockContent) notFound();

  return <SpaceDetailPage view="detail" tableId={id} />;
}
