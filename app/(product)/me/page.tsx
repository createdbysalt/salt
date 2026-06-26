import { MePage } from "@/app/_features/me/components/MePage";
import { getMeData, getOperatorNotes, getOperatorActivity } from "@/app/_features/me/queries";
import { getProfilePlaybookSettings } from "@/app/_features/plays/queries";
import { PEOPLE_PROFILE_SLUG } from "@/app/_features/plays/playbooks/profile/apply-person-profile";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";

export default async function MeRoute() {
  const [{ workspace }, data, notes, activity, settings] = await Promise.all([
    getWorkspaceContext(),
    getMeData(),
    getOperatorNotes(),
    getOperatorActivity(),
    getProfilePlaybookSettings(PEOPLE_PROFILE_SLUG),
  ]);

  return (
    <MePage
      data={data}
      notes={notes}
      activity={activity}
      contextFacts={settings?.contextFacts ?? {}}
      workspaceId={workspace.id}
    />
  );
}
