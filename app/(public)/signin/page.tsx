"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/app/_lib/supabase/client";
import { Provider } from "@supabase/supabase-js";
import toast from "react-hot-toast";
import config from "@/config";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Separator } from "@/app/_components/ui/separator";
import { Badge } from "@/app/_components/ui/badge";
import { ArrowLeft, Info } from "lucide-react";

// This a login/singup page for Supabase Auth.
// Successfull login redirects to /api/auth/callback where the Code Exchange is processed (see app/api/auth/callback/route.js).
export default function Login() {
  const supabase = createClient();
  const [email, setEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDisabled, setIsDisabled] = useState<boolean>(false);
  const [isBridgeSurface, setIsBridgeSurface] = useState<boolean>(false);
  const [redirectParam, setRedirectParam] = useState<string | null>(null);
  
  // Detect if we're on the Bridge surface (invite-only)
  useEffect(() => {
    const host = window.location.host;
    const pathname = window.location.pathname;
    const url = new URL(window.location.href);
    const redirect = url.searchParams.get("redirect") || url.searchParams.get("next");
    setRedirectParam(redirect);
    const isBridge = 
      host.includes("bridge.saltcore") || 
      pathname.startsWith("/bridge") ||
      // Custom domains (non-saltcore, non-localhost)
      (!host.includes("saltcore") && !host.includes("localhost"));
    setIsBridgeSurface(isBridge);
  }, []);

  const handleSignup = async (
    e: any,
    options: {
      type: string;
      provider?: Provider;
    }
  ) => {
    e?.preventDefault();

    setIsLoading(true);

    try {
      const { type, provider } = options;
      const redirectURL = window.location.origin + "/api/auth/callback";

      if (type === "oauth" && provider) {
        await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: redirectURL,
          },
        });
      } else if (type === "magic_link") {
        await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectURL,
            // Invite-only enforcement: prevent new signups on Bridge
            shouldCreateUser: !isBridgeSurface,
          },
        });

        if (isBridgeSurface) {
          toast.success("If you have access, check your email for the sign-in link!");
        } else {
          toast.success("Check your emails!");
        }

        setIsDisabled(true);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8 md:p-24">
      <div className="mb-4 text-center">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Home
          </Link>
        </Button>
      </div>
      
      <h1 className="mb-12 text-center text-3xl font-extrabold tracking-tight md:text-4xl">
        {isBridgeSurface ? "Sign in to the bridge" : `Sign in to ${config.appName}`}
      </h1>
      
      {isBridgeSurface && (
        <div className="mx-auto mb-6 flex max-w-xl items-center gap-3 rounded-lg border border-[--info] bg-[--info]/10 p-4">
          <Info className="h-5 w-5 text-[--info]" />
          <p className="text-sm text-foreground">
            Access to the bridge is invite-only. If you haven't received an invitation, contact your studio.
          </p>
        </div>
      )}

      <div className="mx-auto max-w-xl space-y-6">
        <Button
          variant="outline"
          className="w-full"
          onClick={(e) =>
            handleSignup(e, { type: "oauth", provider: "google" })
          }
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 48 48"
            >
              <path
                fill="#FFC107"
                d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
              />
              <path
                fill="#FF3D00"
                d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
              />
            </svg>
          )}
          Sign up with Google
        </Button>

        <Button
          variant="outline"
          className="w-full"
          onClick={(e) =>
            handleSignup(e, { type: "oauth", provider: "github" })
          }
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          )}
          Sign up with GitHub
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or
            </span>
          </div>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => handleSignup(e, { type: "magic_link" })}
        >
          <Input
            required
            type="email"
            value={email}
            autoComplete="email"
            placeholder="tom@cruise.com"
            onChange={(e) => setEmail(e.target.value)}
          />

          <Button
            className="w-full"
            disabled={isLoading || isDisabled}
            type="submit"
          >
            {isLoading && (
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            Send Magic Link
          </Button>
        </form>
      </div>
    </main>
  );
}
