import { notFound } from "next/navigation";
import { getPlatformAdmin } from "@/app/_lib/admin/platform-admin";
import { getPeopleDirectory } from "@/app/_features/admin/queries";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { UserTabs } from "../_components/UserTabs";
import { PeopleDirectory } from "../_components/PeopleDirectory";

export const dynamic = "force-dynamic";

/**
 * Salt Ops → Users → People: every account, including trial. Plan, status,
 * and usage live here. Grant access is not in v1.
 */
export default async function UsersPeoplePage() {
  const admin = await getPlatformAdmin();
  if (!admin.ok) {
    notFound();
  }

  const data = await getPeopleDirectory();

  return (
    <div className="space-y-8">
      <UserTabs active="/ops/users/people" />
      <PlaysSectionHeader title="Users" />
      <PeopleDirectory data={data} />
    </div>
  );
}
