"use client";

import { type FormEvent, useState } from "react";
import { MailIcon, Loader2Icon } from "lucide-react";
import { createClient } from "@/app/_lib/supabase/client";
import { Button, Input, Label } from "@repo/ui";
import type { ResolvedBrandingConfig } from "@/app/_lib/bridge/branding-config";

interface BridgeLoginFormProps {
  /**
   * Studio name to display in the welcome message.
   * Defaults to "Your Studio" if not provided.
   */
  studioName?: string;
  /**
   * Studio support email for the footer contact link.
   */
  supportEmail?: string | null;
  /**
   * Resolved branding configuration (logo, colors, footer).
   */
  branding?: ResolvedBrandingConfig;
  /**
   * When true, the form renders without the full-page wrapper.
   * Used when embedding inline in another page.
   */
  inline?: boolean;
}

/**
 * Bridge login form component.
 * Can be used standalone or embedded inline in the Bridge home page.
 *
 * On Bridge subdomain (bridge.saltcore.io), magic link redirects to /verify
 * which gets rewritten to /bridge/verify internally by middleware.
 */
export function BridgeLoginForm({
  studioName = "Your Studio",
  supportEmail,
  branding,
  inline = false,
}: BridgeLoginFormProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract branding values with fallbacks
  const accentColor = branding?.colors?.accent || "#6366F1";
  const logoUrl = branding?.logo?.darkUrl || branding?.logo?.lightUrl;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      // Use clean URL - middleware rewrites /verify → /bridge/verify internally
      const emailRedirectTo = `${window.location.origin}/verify`;

      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo,
        },
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      setEmailSent(true);
    } catch (err) {
      console.error("BridgeLoginForm signInWithOtp error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // Email sent confirmation view
  const emailSentContent = (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <MailIcon className="size-6" />
        </div>
        <h1 className="text-2xl font-bold">Check your inbox</h1>
        <p className="text-sm text-balance text-muted-foreground">
          We sent a secure link to <strong>{email}</strong>
        </p>
      </div>
      <div className="grid gap-4">
        <p className="text-sm text-center text-muted-foreground">
          Click the link to access your portal. It expires in 1 hour.
        </p>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setEmail("");
            setEmailSent(false);
            setError(null);
          }}
        >
          Use a different email
        </Button>
      </div>
    </div>
  );

  // Login form view
  const loginFormContent = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Welcome to {studioName}</h1>
        <p className="text-sm text-balance text-muted-foreground">
          Enter your email and we&apos;ll send you a secure link to access your
          portal.
        </p>
      </div>
      <div className="grid gap-6">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect="off"
            required
            disabled={isLoading}
          />
        </div>
        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || !email}
          style={
            {
              "--btn-bg": accentColor,
              backgroundColor: "var(--btn-bg)",
            } as React.CSSProperties
          }
        >
          {isLoading && <Loader2Icon className="mr-2 size-4 animate-spin" />}
          Sign in with Email
        </Button>
      </div>
      <p className="text-center text-sm text-muted-foreground">
        No password needed—we&apos;ll send a link to your email.
      </p>
    </form>
  );

  const formContent = emailSent ? emailSentContent : loginFormContent;

  // Footer with support contact
  const footer = supportEmail ? (
    <p className="text-xs text-muted-foreground text-center">
      Questions?{" "}
      <a href={`mailto:${supportEmail}`} className="underline hover:text-foreground">
        Contact {studioName}
      </a>
    </p>
  ) : null;

  // Inline mode: simplified centered layout
  if (inline) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-xs">
          {formContent}
          {footer && <div className="mt-6">{footer}</div>}
        </div>
      </div>
    );
  }

  // Standalone mode: two-column layout with branding panel
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left column - Logo + Form */}
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="/" className="flex items-center gap-2 font-medium">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={studioName}
                className="h-6 w-auto object-contain"
                style={{ maxWidth: branding?.logo?.width || 120 }}
              />
            ) : (
              <>
                <div
                  className="flex size-6 items-center justify-center rounded-md text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  <span className="text-xs font-bold">
                    {studioName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span>{studioName}</span>
              </>
            )}
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            {formContent}
            {footer && <div className="mt-6">{footer}</div>}
          </div>
        </div>
      </div>

      {/* Right column - Brand panel */}
      <div
        className="relative hidden lg:block"
        style={{
          backgroundColor: accentColor,
          backgroundImage: `linear-gradient(135deg, ${accentColor} 0%, ${adjustBrightness(accentColor, -20)} 100%)`,
        }}
      >
        {/* Optional: Add subtle pattern or content here */}
        <div className="absolute inset-0 flex items-end p-10">
          <blockquote className="space-y-2 text-white/90">
            <p className="text-lg">
              &ldquo;Your projects. Your files. Your space.&rdquo;
            </p>
            <footer className="text-sm text-white/70">
              — {studioName} Client Portal
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}

/**
 * Adjust hex color brightness.
 * Positive amount lightens, negative darkens.
 */
function adjustBrightness(hex: string, amount: number): string {
  // Remove # if present
  const color = hex.replace("#", "");

  // Parse RGB
  const r = Math.max(0, Math.min(255, parseInt(color.substring(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(color.substring(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(color.substring(4, 6), 16) + amount));

  // Convert back to hex
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
