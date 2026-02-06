"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/client";
import { activateClientMemberships } from "./actions";
import { Card, CardContent } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Spinner } from "@/app/_components/ui/spinner";
import { CheckCircle, XCircle } from "lucide-react";

// Production-safe client logging - only log in development to prevent PII leakage
const isDev = process.env.NODE_ENV === "development";
const log = {
  debug: (msg: string) => isDev && console.log(msg),
  error: (msg: string) => console.error(msg), // Always log errors, but without sensitive data
};

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
    const refreshToken = hashParams.get("refresh_token");

    if (accessToken) {
      log.debug("Token found in URL, exchanging for session...");

      if (!refreshToken) {
        log.error("Missing refresh token in magic link");
        setStatus("error");
        return;
      }

      // Set the session explicitly from URL tokens
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ data, error }) => {
        log.debug(`setSession response: hasSession=${!!data?.session}`);

        if (error && error.message) {
          log.error("Error establishing session");
          setStatus("error");
          return;
        }

        const session = data?.session;
        if (!session) {
          log.error("No session returned (tokens may be invalid or expired)");
          setStatus("error");
          return;
        }

        log.debug("Magic link session established");
        setStatus("success");

        // Activate pending memberships (don't wait for it)
        activateClientMemberships()
          .then((result) => {
            if (result?.error) {
              log.error("Error activating client membership");
            } else {
              log.debug(`Activated ${result?.activated || 0} client membership(s)`);
            }
          })
          .catch(() => {
            log.error("Error during activation");
          });

        // Redirect after a short delay to show success message
        // Use clean URL - middleware rewrites / → /bridge internally
        setTimeout(() => {
          log.debug("Redirecting to bridge home...");
          window.location.href = "/";
        }, 1500);
      }).catch(() => {
        log.error("Unexpected error during token exchange");
        setStatus("error");
      });
    } else {
      // No token in URL - might be a page refresh after successful auth
      // Check if user already has an active session
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          log.debug("Existing session found, redirecting to Bridge");
          router.push("/");
        } else {
          // Redirect to home which shows login inline
          log.debug("No access token in URL and no session, redirecting to home");
          router.push("/");
        }
      });
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center space-y-4">
          {status === "verifying" && (
            <>
              <Spinner size="lg" className="mx-auto text-primary" />
              <h2 className="text-xl font-semibold mt-4">Verifying your access...</h2>
              <p className="text-muted-foreground">Please wait while we log you in</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="h-16 w-16 text-success mx-auto" />
              <h2 className="text-xl font-semibold">Access Granted!</h2>
              <p className="text-muted-foreground">Redirecting to the Bridge...</p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-16 w-16 text-destructive mx-auto" />
              <h2 className="text-xl font-semibold">Verification Failed</h2>
              <p className="text-muted-foreground">
                There was an issue verifying your link. It may have expired.
              </p>
              <Button
                onClick={() => router.push("/")}
                className="mt-4"
              >
                Back to Bridge
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

