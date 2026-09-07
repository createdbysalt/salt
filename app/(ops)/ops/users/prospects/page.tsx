import { notFound } from "next/navigation";
import { getPlatformAdmin } from "@/app/_lib/admin/platform-admin";
import { getProspectsData } from "@/app/_features/admin/queries";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { UserTabs } from "../_components/UserTabs";
import { ProspectsSection } from "../_components/ProspectsSection";

export const dynamic = "force-dynamic";

/**
 * Salt Ops → Users → Prospects: pre-account pile. Today that is
 * waitlist_leads. Trial signups are People, not Prospects.
 */
export default async function UsersProspectsPage() {
  const admin = await getPlatformAdmin();
  if (!admin.ok) {
    notFound();
  }

  const data = await getProspectsData();

  return (
    <div className="space-y-8">
      <UserTabs active="/ops/users/prospects" />
      <PlaysSectionHeader title="Users" />
      <ProspectsSection data={data} />
    </div>
  );
}
