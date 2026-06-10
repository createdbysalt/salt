"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/client";
import { logger } from "@/app/_lib/logger";

/**
 * Client component to handle auth tokens in URL fragments (e.g., magic links).
 *
 * Supabase may return tokens or errors in the URL fragment (#access_token=... or #error=...),
 * which are only accessible client-side. This component:
 * 1. Surfaces hash errors on /signin
 * 2. Exchanges fragment tokens for a session when needed
 * 3. Redirects to the app after a successful magic link
 */
export function AuthTokenHandler(): null {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const hash = window.location.hash.substring(1);
    if (!hash) return;

    const hashParams = new URLSearchParams(hash);
    const error = hashParams.get("error");
    const errorDescription = hashParams.get("error_description");

    if (error) {
      logger.warn("Magic link auth error in URL hash", {
        error,
        errorDescription,
      });
      const params = new URLSearchParams({ error });
      if (errorDescription) {
        params.set("message", errorDescription);
      }
      const cleanPath = window.location.pathname;
      window.history.replaceState({}, document.title, cleanPath);
      router.replace(`${cleanPath}?${params.toString()}`);
      return;
    }

    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const type = hashParams.get("type");

    if (!accessToken || !refreshToken || type !== "magiclink") {
      return;
    }

    void (async () => {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        logger.error("Failed to establish magic link session", {
          message: sessionError.message,
        });
        router.replace(
          `/signin?error=auth_callback_failed&message=${encodeURIComponent(sessionError.message)}`
        );
        return;
      }

      logger.info("Magic link session established from URL fragment");
      // Full navigation so SSR on /hq receives auth cookies (soft router.replace can race)
      window.location.assign("/hq");
    })();
  }, [router]);

  return null;
}
