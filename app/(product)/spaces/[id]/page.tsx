import { SpaceDetailPage } from "@/app/_features/spaces/components/SpaceDetailPage";

interface SpaceDetailRouteProps {
  params: Promise<{ id: string }>;
}

export default async function SpaceDetailRoute({ params }: SpaceDetailRouteProps) {
  const { id } = await params;
  return <SpaceDetailPage view="detail" tableId={id} />;
}
