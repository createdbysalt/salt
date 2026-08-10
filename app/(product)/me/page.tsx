import { MePage } from "@/app/_features/me/components/MePage";
import { getMeData, getOperatorNotes, getOperatorActivity, getICPSegments } from "@/app/_features/me/queries";
import { getProfilePlaybookSettings } from "@/app/_features/plays/queries";
import { PEOPLE_PROFILE_SLUG } from "@/app/_features/plays/playbooks/records-engine/apply-person-profile";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import { getWorkspaceFiles } from "@/app/_features/resources/directory-queries";
import { getVoices } from "@/app/_features/me/voices/queries";

export default async function MeRoute() {
  const [{ workspace }, data, notes, activity, settings, icpSegments, files, voiceProfiles] = await Promise.all([
    getWorkspaceContext(),
    getMeData(),
    getOperatorNotes(),
    getOperatorActivity(),
    getProfilePlaybookSettings(PEOPLE_PROFILE_SLUG),
    getICPSegments(),
    getWorkspaceFiles(),
    getWorkspaceContext().then(({ workspace }) => getVoices(workspace.id)),
  ]);

  return (
    <MePage
      data={data}
      notes={notes}
      activity={activity}
      contextFacts={settings?.contextFacts ?? {}}
      icpSegments={icpSegments}
      workspaceId={workspace.id}
      files={files.filter((file) => file.isOperatorAsset)}
      voiceProfiles={voiceProfiles}
    />
  );
}
