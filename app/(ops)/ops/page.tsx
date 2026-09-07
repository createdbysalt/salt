import { notFound } from "next/navigation";
import { getPlatformAdmin } from "@/app/_lib/admin/platform-admin";
import {
  getAdminOverview,
  getSignupSeries,
  getSpendRollup,
} from "@/app/_features/admin/queries";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { OverviewSection } from "./_components/OverviewSection";
import { SignupChart } from "./_components/SignupChart";
import { SpendSection } from "./_components/SpendSection";

export const dynamic = "force-dynamic";

/**
 * Founder ops hub (Founder Ops Phase 2) — read-only platform health.
 * Runs in the Salt Ops shell (app/(ops)), not the product chrome.
 * Reachable only by PLATFORM_ADMIN_EMAILS; everyone else 404s.
 * Each deployment's /ops reads whichever Supabase it is connected
 * to: app.usesalt.io/ops is the real ops surface, staging's verifies.
 */
export default async function AdminOverviewPage() {
  const admin = await getPlatformAdmin();
  if (!admin.ok) {
    notFound();
  }

  const [overview, signupSeries, spend] = await Promise.all([
    getAdminOverview(),
    getSignupSeries(),
    getSpendRollup(),
  ]);

  return (
    <div className="space-y-8">
      <PlaysSectionHeader title="Dashboard" />
      <OverviewSection data={overview} />
      {signupSeries && <SignupChart data={signupSeries.points} />}
      <SpendSection data={spend} />
    </div>
  );
}
