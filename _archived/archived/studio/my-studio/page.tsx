import { Suspense } from "react";
import { createClient } from "@/app/_lib/supabase/server";
import { redirect } from "next/navigation";
import { getStudioContext, getStudioDetails } from "@/app/_lib/utils/user-dashboard";
import { MyStudioPageClient } from "./MyStudioPageClient";
import { MyStudioSkeleton } from "./MyStudioSkeleton";

export const dynamic = "force-dynamic";

async function MyStudioContent() {
  const { studio: studioMembership, supabase } = await getStudioContext();

  // Get full studio details (name, description, logo_url, etc.)
  const studio = await getStudioDetails(studioMembership.id);

  // Fetch studio brand config
  const { data: brandConfig } = await supabase
    .from("studio_brand_config")
    .select("*")
    .eq("studio_id", studio.id)
    .single();

  // Fetch studio services count
  const { count: servicesCount } = await supabase
    .from("studio_services")
    .select("*", { count: "exact", head: true })
    .eq("studio_id", studio.id);

  // Fetch portfolio count
  const { count: portfolioCount } = await supabase
    .from("studio_portfolio")
    .select("*", { count: "exact", head: true })
    .eq("studio_id", studio.id);

  // Calculate setup progress
  const setupChecks = {
    hasLogo: !!studio.logo_url || !!brandConfig?.logo_light_url,
    hasDescription: !!studio.description,
    hasBrandVoice: (brandConfig?.voice_tone?.length ?? 0) > 0,
    hasColors: !!brandConfig?.color_primary,
    hasServices: (servicesCount ?? 0) > 0,
    hasPortfolio: (portfolioCount ?? 0) > 0,
  };

  const completedSteps = Object.values(setupChecks).filter(Boolean).length;
  const totalSteps = Object.keys(setupChecks).length;
  const setupProgress = Math.round((completedSteps / totalSteps) * 100);

  return (
    <MyStudioPageClient
      studio={studio}
      brandConfig={brandConfig}
      setupProgress={setupProgress}
      setupChecks={setupChecks}
    />
  );
}

export default async function MyStudioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  return (
    <div className="space-y-6">
      <Suspense fallback={<MyStudioSkeleton />}>
        <MyStudioContent />
      </Suspense>
    </div>
  );
}
