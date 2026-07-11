import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PLAYER_CAPABILITIES, type PlayerSlug } from "@/app/_features/plays/players/capabilities";
import { getPlayerContext } from "@/app/_features/plays/players/queries";
import {
  listPlaybookBlueprints,
  listPlayTemplates,
  listKeeperActivityEntries,
} from "@/app/_features/plays/queries";
import { getSaltLearningsDigest } from "@/app/_features/me/actions/salt-learnings";
import { getTenantContext, requireWorkspaceMember } from "@/app/_lib/tenancy";
import { PlayerDetailPage } from "@/app/_features/plays/components/PlayerDetailPage";
import { loadMoreKeeperActivity } from "./actions";

export default async function PlayerDetailRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!PLAYER_CAPABILITIES[slug as PlayerSlug]) {
    notFound();
  }

  const { context: tenantContext } = await getTenantContext();
  const workspace = requireWorkspaceMember(tenantContext);

  const isKeeper = slug === "keeper";

  const [playerContext, blueprints, adoptedTemplates, keeperLearnings, keeperActivity] =
    await Promise.all([
      getPlayerContext(workspace.id, slug),
      listPlaybookBlueprints(),
      listPlayTemplates(),
      isKeeper ? getSaltLearningsDigest(workspace.id) : null,
      isKeeper ? listKeeperActivityEntries(0, 50) : null,
    ]);

  const keeperData =
    isKeeper && keeperLearnings && keeperActivity
      ? {
          learnings: keeperLearnings,
          activity: keeperActivity.entries,
          activityTotalCount: keeperActivity.totalCount,
          workspaceId: workspace.id,
        }
      : undefined;

  return (
    <Suspense fallback={null}>
      <PlayerDetailPage
        playerSlug={slug as PlayerSlug}
        context={playerContext}
        blueprints={blueprints}
        adoptedTemplates={adoptedTemplates}
        keeperData={keeperData}
        loadMoreActivity={isKeeper ? loadMoreKeeperActivity : undefined}
      />
    </Suspense>
  );
}
