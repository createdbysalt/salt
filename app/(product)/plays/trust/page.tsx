import { Suspense } from "react";
import { PageBanner } from "@repo/patterns";
import { TrustDashboard } from "@/app/_features/plays/components/TrustDashboard";
import { TrustDashboardSkeleton } from "@/app/_features/plays/components/TrustDashboardSkeleton";

export const metadata = {
  title: "Trust & Accuracy | Salt",
  description: "Monitor Salt's accuracy and review corrections",
};

export default function TrustPage() {
  return (
    <div className="container max-w-5xl py-8">
      <PageBanner
        title="Trust & Accuracy"
        subtitle="See how accurate Salt's automated decisions are and review any corrections you've made."
      />

      <Suspense fallback={<TrustDashboardSkeleton />}>
        <TrustDashboard />
      </Suspense>
    </div>
  );
}
