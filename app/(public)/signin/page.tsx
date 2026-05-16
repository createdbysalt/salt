"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { createClient } from "@/app/_lib/supabase/client";
import { Provider } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Info, Loader2 } from "lucide-react";
import { cn } from "@repo/utils";

export default function SignInPage() {
  const supabase = createClient();
  const [email, setEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDisabled, setIsDisabled] = useState<boolean>(false);
  const [isTableSurface, setIsBridgeSurface] = useState<boolean>(false);
  const [loadingProvider, setLoadingProvider] = useState<
    Provider | "magic_link" | null
  >(null);

  // Detect if we're on the Bridge surface (invite-only)
  // Bridge is ONLY: table.usesalt.io, table.localhost, table.lvh.me, or /table/* paths
  // The main site (usesalt.io, app.usesalt.io) should NOT be Bridge
  useEffect(() => {
    const host = window.location.host;
    const pathname = window.location.pathname;
    const isTable =
      host.startsWith("table.") ||
      pathname.startsWith("/table");
    setIsBridgeSurface(isTable);
  }, []);

  const handleSignup = async (
    e: any,
    options: {
      type: string;
      provider?: Provider;
    }
  ) => {
    e?.preventDefault();

    // Validate email for magic link
    if (options.type === "magic_link" && !email.trim()) {
      toast.error("Please enter your email address.");
      return;
    }

    if (options.type === "magic_link" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    setLoadingProvider(options.provider || "magic_link");

    try {
      const { type, provider } = options;
      const redirectURL = window.location.origin + "/api/auth/callback";

      if (type === "oauth" && provider) {
        // For Google, request additional scopes for Gmail and Calendar
        const scopes = provider === "google"
          ? [
              "https://www.googleapis.com/auth/gmail.send",
              "https://www.googleapis.com/auth/gmail.readonly",
              "https://www.googleapis.com/auth/gmail.modify",
              "https://www.googleapis.com/auth/calendar.readonly",
              "https://www.googleapis.com/auth/calendar.events",
            ].join(" ")
          : undefined;

        await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: redirectURL,
            scopes,
          },
        });
      } else if (type === "magic_link") {
        await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectURL,
            shouldCreateUser: !isTableSurface,
          },
        });

        if (isTableSurface) {
          toast.success(
            "If you have access, check your email for the sign-in link!"
          );
        } else {
          toast.success("Check your email for the magic link!");
        }

        setIsDisabled(true);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
      setLoadingProvider(null);
    }
  };

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden bg-background p-6 md:p-10">
      {/* Subtle animated background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute h-[600px] w-[600px] rounded-full opacity-[0.03] blur-[100px]"
          style={{
            background: "radial-gradient(circle, currentColor 0%, transparent 70%)",
            animation: "drift1 25s ease-in-out infinite",
          }}
        />
        <div
          className="absolute h-[500px] w-[500px] rounded-full opacity-[0.03] blur-[100px]"
          style={{
            background: "radial-gradient(circle, currentColor 0%, transparent 70%)",
            animation: "drift2 30s ease-in-out infinite",
          }}
        />
        <div
          className="absolute h-[400px] w-[400px] rounded-full opacity-[0.02] blur-[80px]"
          style={{
            background: "radial-gradient(circle, currentColor 0%, transparent 70%)",
            animation: "drift3 20s ease-in-out infinite",
          }}
        />
      </div>

      <style jsx>{`
        @keyframes drift1 {
          0%, 100% { top: -10%; left: -10%; }
          33% { top: 30%; left: 60%; }
          66% { top: 60%; left: 20%; }
        }
        @keyframes drift2 {
          0%, 100% { top: 60%; right: -10%; }
          33% { top: 10%; right: 30%; }
          66% { top: 40%; right: 60%; }
        }
        @keyframes drift3 {
          0%, 100% { bottom: -10%; left: 30%; }
          50% { bottom: 40%; left: 60%; }
        }
      `}</style>

      <div className="relative w-full max-w-md">
        <div className={cn("flex flex-col gap-7")}>
          {/* Icon & Header */}
          <div className="flex flex-col items-center gap-5 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Link
              href="/"
              className="group flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-foreground/85 transition-all duration-300 hover:scale-105 hover:bg-foreground"
            >
              <Image
                src="/salt-icon-white.svg"
                alt="SALT"
                width={44}
                height={44}
                className="transition-transform duration-300 group-hover:rotate-3 dark:invert"
                priority
              />
            </Link>
            {isTableSurface ? (
              <h1 className="text-xl font-bold">Welcome to the Bridge</h1>
            ) : (
              <Image
                src="/welcome-to-salt.svg"
                alt="Welcome to SALT"
                width={400}
                height={48}
                className="invert dark:invert-0"
                priority
              />
            )}
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signin" className="underline underline-offset-4">
                Sign up
              </Link>
            </p>
          </div>

          {isTableSurface && (
            <div className="flex items-start gap-3 rounded-lg border border-info/30 bg-info/10 p-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
              <p className="text-xs text-foreground">
                Access is invite-only. Contact your studio if you haven't
                received an invitation.
              </p>
            </div>
          )}

          {/* Email Form */}
          <form
            noValidate
            onSubmit={(e) => handleSignup(e, { type: "magic_link" })}
            className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both"
          >
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={isDisabled}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || isDisabled}
            >
              {loadingProvider === "magic_link" && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {isDisabled ? "Check your email" : "Continue with email"}
            </Button>
          </form>

          {/* Separator */}
          <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border animate-in fade-in duration-500 delay-200 fill-mode-both">
            <span className="relative z-10 bg-background px-2 text-muted-foreground">
              Or
            </span>
          </div>

          {/* OAuth Buttons - Outside form */}
          <div className="grid gap-4 sm:grid-cols-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">
            <Button
              variant="outline"
              onClick={(e) =>
                handleSignup(e, { type: "oauth", provider: "google" })
              }
              disabled={isLoading}
            >
              {loadingProvider === "google" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                >
                  <path
                    d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                    fill="currentColor"
                  />
                </svg>
              )}
              Google
            </Button>
            <Button
              variant="outline"
              onClick={(e) =>
                handleSignup(e, { type: "oauth", provider: "github" })
              }
              disabled={isLoading}
            >
              {loadingProvider === "github" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="currentColor"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              )}
              GitHub
            </Button>
          </div>

          {/* Terms */}
          <p className="px-6 text-center text-xs text-muted-foreground animate-in fade-in duration-500 delay-[450ms] fill-mode-both">
            By clicking continue, you agree to our{" "}
            <Link
              href="/tos"
              className="underline underline-offset-4 hover:text-primary"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy-policy"
              className="underline underline-offset-4 hover:text-primary"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
