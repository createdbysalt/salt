"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/libs/supabase/client";
import { activateClientMemberships } from "./actions";

/**
 * Magic link landing page for client users
 * This page exchanges the token in the URL fragment and redirects to the Bridge
 */
export default function BridgeVerifyPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");

  useEffect(() => {
    const supabase = createClient();
    
    // Check if there's a token in the URL fragment
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const type = hashParams.get("type");

    if (accessToken) {
      console.log("🔑 Token found in URL, exchanging for session...");
      const refreshToken = hashParams.get("refresh_token");
      
      if (!refreshToken) {
        console.error("❌ Missing refresh token");
        setStatus("error");
        return;
      }
      
      // Set the session explicitly from URL tokens
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ data, error }) => {
        console.log("🔍 setSession response:", { hasSession: !!data?.session, error });
        
        if (error && error.message) {
          console.error("❌ Error establishing session:", error.message);
          setStatus("error");
          return;
        }
        
        const session = data?.session;
        if (!session) {
          console.error("❌ No session returned (tokens may be invalid or expired)");
          setStatus("error");
          return;
        }

        console.log("✅ Magic link session established for:", session.user.email);
        setStatus("success");
        
        // Activate any pending client_users memberships for this user
        // This ensures first-time users can access immediately after clicking invite link
        activateClientMemberships().then((result) => {
          if (result.error) {
            console.error("⚠️ Error activating client membership:", result.error);
          } else {
            console.log(`✅ Activated ${result.activated} client membership(s)`);
          }
          
          // Redirect after activation completes
          console.log("➡️ Redirecting to /bridge...");
          window.location.href = "/bridge";
        }).catch((err) => {
          console.error("❌ Unexpected error during activation:", err);
          // Redirect anyway - middleware might allow access or show proper error
          window.location.href = "/bridge";
        });
      }).catch((err) => {
        console.error("❌ Unexpected error during token exchange:", err);
        setStatus("error");
      });
    } else {
      console.log("⚠️ No access token found in URL, redirecting to signin");
      router.push("/signin");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card bg-base-100 shadow-xl w-full max-w-md">
        <div className="card-body text-center">
          {status === "verifying" && (
            <>
              <span className="loading loading-spinner loading-lg text-primary mx-auto"></span>
              <h2 className="card-title justify-center mt-4">Verifying your access...</h2>
              <p className="text-base-content/70">Please wait while we log you in</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="text-6xl mb-4">✅</div>
              <h2 className="card-title justify-center">Access Granted!</h2>
              <p className="text-base-content/70">Redirecting to the Bridge...</p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="text-6xl mb-4">❌</div>
              <h2 className="card-title justify-center">Verification Failed</h2>
              <p className="text-base-content/70 mb-4">
                There was an issue verifying your link. It may have expired.
              </p>
              <button 
                onClick={() => router.push("/signin")}
                className="btn btn-primary"
              >
                Go to Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

