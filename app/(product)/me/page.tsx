import { MePage } from "@/app/_features/me/components/MePage";
import { getProfilePlaybookSettings } from "@/app/_features/plays/queries";
import { PEOPLE_PROFILE_SLUG } from "@/app/_features/plays/playbooks/profile/apply-person-profile";

export default async function MeRoute() {
  const settings = await getProfilePlaybookSettings(PEOPLE_PROFILE_SLUG);
  return <MePage contextFacts={settings?.contextFacts ?? {}} />;
}
