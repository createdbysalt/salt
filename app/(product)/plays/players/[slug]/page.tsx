import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  PlayerDetailPage,
  resolveDemoPlayer,
} from "@/app/_features/plays/components/PlayerDetailPage";

export default async function PlayerDetailRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const player = resolveDemoPlayer(slug);

  if (!player) {
    notFound();
  }

  return (
    <Suspense fallback={null}>
      <PlayerDetailPage player={player} />
    </Suspense>
  );
}
