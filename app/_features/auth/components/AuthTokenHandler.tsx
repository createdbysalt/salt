"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/client";

/**
 * Client component to handle auth tokens in URL fragments (e.g., magic links).
 * 
 * Supabase magic links include tokens in the URL fragment (#access_token=...),
 * which are only accessible client-side. This component:
 * 1. Detects tokens in the fragment
 * 2. Exchanges them for a session via Supabase client
 * 3. Cleans up the URL and refreshes the page
 */
export function AuthTokenHandler(): null {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    
    // Check if there's a token in the URL fragment
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const type = hashParams.get("type");

    if (accessToken && type === "magiclink") {
      // Supabase client automatically handles the token exchange
      // We just need to trigger a session refresh
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session) {
          // Session established successfully
          console.log("Magic link session established for:", session.user.email);
          
          // Check if this is a client user (has client_id in user metadata)
          const isClientUser = session.user.user_metadata?.client_id;
          
          // Clean up the URL (remove the fragment)
          const cleanUrl = window.location.pathname + window.location.search;
          window.history.replaceState({}, document.title, cleanUrl);
          
          // Redirect client users to the Bridge
          if (isClientUser && window.location.pathname === "/signin") {
            console.log("Redirecting client user to Bridge");
            router.push("/bridge");
          } else {
            // For other users or if already on the right page, just refresh
            router.refresh();
          }
        }
      });
    }
  }, [router]);

  return null; // This component doesn't render anything
}

