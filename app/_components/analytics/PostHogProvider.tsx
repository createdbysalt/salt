"use client";

import { User } from "@supabase/supabase-js";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { analyticsConfig } from "@/app/_lib/analytics/config";
import { shouldLoadProductAnalytics } from "@/app/_lib/analytics/surface";
import { createClient } from "@/app/_lib/supabase/client";
import { getAttributionProperties } from "@/app/_lib/analytics/attribution";
import { useCookieConsent } from "@/app/_features/marketing/components/CookieConsentProvider";

let posthogInitialized = false;

function initPostHog(): void {
  if (posthogInitialized || typeof window === "undefined") return;
  if (!analyticsConfig.enabled || !analyticsConfig.posthogKey) return;

  posthog.init(analyticsConfig.posthogKey, {
    api_host: "/ingest",
    ui_host: analyticsConfig.posthogUiHost,
    person_profiles: "identified_only",
    capture_pageview: "history_change",
  });
  posthogInitialized = true;
}

function isNewSignup(user: User): boolean {
  const createdAt = user.created_at ? Date.parse(user.created_at) : NaN;
  if (Number.isNaN(createdAt)) return false;
  return Date.now() - createdAt < 5 * 60 * 1000;
}

function PostHogAuthSync(): null {
  const pathname = usePathname();
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    if (!analyticsConfig.enabled || !hasSupabaseConfig) return;

    const host = window.location.host;
    if (!shouldLoadProductAnalytics(host, pathname)) return;

    initPostHog();
    const supabase = createClient();

    const syncUser = (user: User | null) => {
      if (!user) return;

      posthog.identify(user.id, {
        email: user.email,
        name: user.user_metadata?.full_name ?? user.user_metadata?.name,
      });

      if (isNewSignup(user)) {
        posthog.capture("signed_up", {
          plan: "free",
          ...getAttributionProperties(),
        });
      }
    };

    void supabase.auth.getUser().then(({ data: { user } }) => {
      syncUser(user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        posthog.reset();
        return;
      }
      if (session?.user) {
        syncUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [hasSupabaseConfig, pathname]);

  return null;
}

export function PostHogAnalytics({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { analytics: analyticsConsent } = useCookieConsent();
  const [active, setActive] = useState(false);

  useEffect(() => {
    // Require both: analytics enabled in config AND user consent
    if (!analyticsConfig.enabled || !analyticsConsent) {
      setActive(false);
      return;
    }
    const host = window.location.host;
    const shouldLoad = shouldLoadProductAnalytics(host, pathname);
    setActive(shouldLoad);
    if (shouldLoad) initPostHog();
  }, [pathname, analyticsConsent]);

  if (!active) return <>{children}</>;

  return (
    <PHProvider client={posthog}>
      <PostHogAuthSync />
      {children}
    </PHProvider>
  );
}
