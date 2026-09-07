import { notFound } from "next/navigation";
import { getPlatformAdmin } from "@/app/_lib/admin/platform-admin";
import { getUsersOverview } from "@/app/_features/admin/queries";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { UserTabs } from "./_components/UserTabs";
import { UsersOverviewSection } from "./_components/UsersOverviewSection";

export const dynamic = "force-dynamic";

/**
 * Salt Ops → Users → Overview: trial-first pulse. Waitlist is a leftover
 * count, not the spine. Detail lives on Prospects and People.
 */
export default async function UsersOverviewPage() {
  const admin = await getPlatformAdmin();
  if (!admin.ok) {
    notFound();
  }

  const data = await getUsersOverview();

  return (
    <div className="space-y-8">
      <UserTabs active="/ops/users" />
      <PlaysSectionHeader title="Users" />
      <UsersOverviewSection data={data} />
    </div>
  );
}
