"use client";

import Link from "next/link";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/client";
import { Provider } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Info, Loader2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DotGridCanvas } from "@/app/_features/marketing/landing2/DotGridCanvas";
import "@/app/_features/marketing/landing2/landing2.css";

const CATCHPHRASES = [
  "You can clock out. Salt never sleeps.",
  "Salt runs the work. You run the business.",
  "Surfaces what needs you. Automates what doesn't.",
  "Reads every tool your business runs on.",
];

const SIGNIN_ERROR_MESSAGES: Record<string, string> = {
  auth_callback_failed:
    "We could not complete sign-in from that link. Request a new magic link and open it in the same browser.",
  no_studio_access:
    "You are signed in, but this account is not linked to a workspace yet. Use a seeded QA account or ask an admin to add workspace access.",
  no_workspace_access:
    "You are signed in, but this account is not linked to a workspace yet. Use a seeded QA account or ask an admin to add workspace access.",
  otp_expired: "That magic link expired. Request a new one and open it right away.",
  access_denied: "Sign-in was denied. Request a new magic link and try again.",
};

function SignInPageContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDisabled, setIsDisabled] = useState<boolean>(false);
  const [isTableSurface, setIsBridgeSurface] = useState<boolean>(false);
  const [loadingProvider, setLoadingProvider] = useState<
    Provider | "magic_link" | null
  >(null);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(
      () => setPhraseIndex((i) => (i + 1) % CATCHPHRASES.length),
      4500
    );
    return () => clearInterval(id);
  }, [reduceMotion]);

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

  useEffect(() => {
    const errorCode = searchParams.get("error");
    if (!errorCode) return;

    const message =
      searchParams.get("message") ??
      SIGNIN_ERROR_MESSAGES[errorCode] ??
      "Sign-in failed. Please try again.";

    toast.error(message);
  }, [searchParams]);

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
        // Sign-in is identity-only; Gmail/Calendar access is granted per
        // connector through Composio, never at login.
        await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: redirectURL,
          },
        });
      } else if (type === "magic_link") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectURL,
            shouldCreateUser: !isTableSurface,
          },
        });

        if (error) {
          const message =
            error.message?.includes("rate limit") ||
            error.message?.includes("Email rate limit")
              ? "Too many sign-in emails sent. Wait a few minutes and try again, or ask your admin to configure custom SMTP on Supabase."
              : error.message || "Could not send magic link. Please try again.";
          toast.error(message);
          return;
        }

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
      console.error(error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
      setLoadingProvider(null);
    }
  };

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden p-6 md:p-10">
      <DotGridCanvas />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-40"
        style={{
          background:
            "linear-gradient(to top, var(--background) 20%, transparent 100%)",
        }}
      />

      <Link
        href="/"
        className="absolute left-6 top-6 z-10 flex shrink-0 items-center py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 md:left-10 md:top-10"
        aria-label="Salt home"
      >
        <span
          aria-hidden
          className="block h-6 w-[3.25rem] bg-foreground sm:h-[22px] sm:w-[52px]"
          style={{
            maskImage: "url(/salt-logo.svg)",
            WebkitMaskImage: "url(/salt-logo.svg)",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskSize: "contain",
            WebkitMaskSize: "contain",
            maskPosition: "center",
            WebkitMaskPosition: "center",
          }}
        />
      </Link>

      <div className="relative z-10 flex w-full max-w-sm flex-col gap-6 md:max-w-5xl">
        <div className="flex flex-col gap-6">
          <div className="grid overflow-hidden rounded-2xl border border-border/80 bg-card/80 shadow-[var(--shadow-card)] backdrop-blur-xl backdrop-saturate-[180%] md:grid-cols-2">
            <form
              noValidate
              onSubmit={(e) => handleSignup(e, { type: "magic_link" })}
              className="flex flex-col gap-6 p-6 md:p-8"
            >
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="font-display text-3xl font-medium tracking-[-0.03em] sm:text-4xl">
                  {isTableSurface ? "Welcome to the Bridge" : "Welcome back"}
                </h1>
                <p className="text-balance text-sm leading-relaxed text-muted-foreground">
                  {isTableSurface
                    ? "Enter your email below to sign in"
                    : "Sign in to your Salt account"}
                </p>
              </div>

              {isTableSurface && (
                <div className="flex items-start gap-3 rounded-lg border border-info/30 bg-info/10 p-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                  <p className="text-xs text-foreground">
                    Access is invite-only. Contact your workspace admin if you
                    haven&apos;t received an invitation.
                  </p>
                </div>
              )}

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

              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                Or continue with
                <span className="h-px flex-1 bg-border" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  type="button"
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
                  <span className="sr-only">Login with Google</span>
                </Button>
                <Button
                  type="button"
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
                  <span className="sr-only">Login with GitHub</span>
                </Button>
              </div>

              {!isTableSurface && (
                <div className="text-center text-sm">
                  Don&apos;t have an account?{" "}
                  <Link href="/signin" className="underline underline-offset-4">
                    Sign up
                  </Link>
                </div>
              )}
            </form>

            {/* Right pane — animated aurora + rotating catchphrase */}
            <div className="landing2-home surface-aurora relative hidden md:block">
              <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="aurora-blob aurora-blob-1" />
                <div className="aurora-blob aurora-blob-2" />
                <div className="aurora-blob aurora-blob-3" />
                <div className="aurora-blob aurora-blob-4" />
              </div>
              <div className="relative z-10 flex h-full items-center justify-center p-10">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={phraseIndex}
                    initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
                    transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                    className="max-w-xs text-balance text-center font-display text-2xl leading-snug tracking-[-0.02em] text-white [text-shadow:0_1px_24px_oklch(0_0_0/0.25)]"
                  >
                    {CATCHPHRASES[phraseIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>
              <style jsx>{`
                .aurora-blob {
                  position: absolute;
                  border-radius: 9999px;
                  filter: blur(90px);
                  mix-blend-mode: screen;
                  will-change: transform;
                }
                .aurora-blob-1 {
                  width: 60%;
                  height: 60%;
                  left: -15%;
                  top: -10%;
                  background: var(--sky);
                  opacity: 0.45;
                  animation: aurora-drift-1 26s ease-in-out infinite alternate;
                }
                .aurora-blob-2 {
                  width: 50%;
                  height: 50%;
                  right: -10%;
                  top: 20%;
                  background: var(--violet);
                  opacity: 0.4;
                  animation: aurora-drift-2 32s ease-in-out infinite alternate;
                }
                .aurora-blob-3 {
                  width: 45%;
                  height: 45%;
                  left: 10%;
                  bottom: -15%;
                  background: var(--flame);
                  opacity: 0.35;
                  animation: aurora-drift-3 38s ease-in-out infinite alternate;
                }
                .aurora-blob-4 {
                  width: 40%;
                  height: 40%;
                  right: 15%;
                  bottom: 5%;
                  background: oklch(0.6 0.15 190);
                  opacity: 0.35;
                  animation: aurora-drift-4 29s ease-in-out infinite alternate;
                }
                @keyframes aurora-drift-1 {
                  from { transform: translate(0, 0) scale(1); }
                  to { transform: translate(30%, 25%) scale(1.2); }
                }
                @keyframes aurora-drift-2 {
                  from { transform: translate(0, 0) scale(1.1); }
                  to { transform: translate(-25%, 30%) scale(0.95); }
                }
                @keyframes aurora-drift-3 {
                  from { transform: translate(0, 0) scale(1); }
                  to { transform: translate(35%, -20%) scale(1.15); }
                }
                @keyframes aurora-drift-4 {
                  from { transform: translate(0, 0) scale(1.05); }
                  to { transform: translate(-30%, -25%) scale(1); }
                }
                @media (prefers-reduced-motion: reduce) {
                  .aurora-blob {
                    animation: none;
                  }
                }
              `}</style>
            </div>
          </div>

          <p className="px-6 text-center text-xs text-muted-foreground">
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

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SignInPageContent />
    </Suspense>
  );
}
