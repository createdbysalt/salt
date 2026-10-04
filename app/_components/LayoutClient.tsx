"use client";

import { User } from "@supabase/supabase-js";
import { createClient } from "@/app/_lib/supabase/client";
import { useEffect, useState, ReactNode } from "react";
import { usePathname } from "next/navigation";
import Gleap from "gleap";
import NextTopLoader from "nextjs-toploader";
import { SonnerToaster, TooltipProvider } from "@repo/ui";
import { Tooltip } from "react-tooltip";
import config from "@/config";
import { AttributionCapture } from "@/app/_components/analytics/AttributionCapture";
import { PostHogAnalytics } from "@/app/_components/analytics/PostHogProvider";
import { MarketingTagManager } from "@/app/_components/analytics/MarketingTagManager";
import { analyticsConfig } from "@/app/_lib/analytics/config";
import {
  CookieConsentProvider,
  useCookieConsent,
} from "@/app/_features/marketing/components/CookieConsentProvider";

// Gleap customer support: chat, bug reporting, and feedback
const GleapSupport = (): null => {
  const { marketing } = useCookieConsent();
  const [data, setData] = useState<{ user: User } | null>(null);
  const [gleapReady, setGleapReady] = useState(false);

  // Skip Supabase client creation if env vars are missing (e.g., in Sanity Studio)
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Get user data from Supabase Auth to identify users in Gleap
  useEffect(() => {
    if (!hasSupabaseConfig) return;

    const getUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setData({ user });
      }
    };
    getUser();
  }, [hasSupabaseConfig]);

  // Initialize Gleap (requires marketing consent)
  useEffect(() => {
    if (!marketing || !config?.gleap?.apiKey) {
      setGleapReady(false);
      return;
    }

    Gleap.initialize(config.gleap.apiKey);
    setGleapReady(true);
  }, [marketing]);

  // Identify user in Gleap for better support context
  useEffect(() => {
    if (gleapReady && data?.user && config?.gleap?.apiKey) {
      Gleap.identify(data.user.id, {
        email: data.user.email,
      });
    }
  }, [gleapReady, data]);

  return null;
};

// All the client wrappers are here (they can't be in server components)
// 1. NextTopLoader: Show a progress bar at the top when navigating between pages
// 2. Toaster: Show Success/Error messages anywhere from the app with toast()
// 3. Tooltip: Show tooltips if any JSX elements has these 2 attributes: data-tooltip-id="tooltip" data-tooltip-content=""
// 4. CrispChat: Set Crisp customer chat support (see above)
const ClientLayout = ({ children }: { children: ReactNode }) => {
  return (
    <CookieConsentProvider>
      {/* Show a progress bar at the top when navigating between pages */}
      <NextTopLoader color={config.colors.main} showSpinner={false} />

      <AttributionCapture />

      {/* Radix TooltipProvider for shadcn/ui Tooltip components */}
      <TooltipProvider>
        <PostHogAnalytics>
          {children}
        </PostHogAnalytics>
      </TooltipProvider>

      {/* Sonner Toast notifications (shadcn style) */}
      <SonnerToaster position="bottom-right" />

      {/* Show tooltips if any JSX elements has these 2 attributes: data-tooltip-id="tooltip" data-tooltip-content="" */}
      <Tooltip
        id="tooltip"
        className="z-[60] !opacity-100 max-w-sm shadow-lg"
      />

      {/* Gleap: support chat, bug reporting, feedback (marketing consent only) */}
      <GleapSupport />

      {/* GTM: marketing analytics (consent-gated) */}
      <MarketingTagManager gtmId={analyticsConfig.gtmId} />
    </CookieConsentProvider>
  );
};

export default ClientLayout;
