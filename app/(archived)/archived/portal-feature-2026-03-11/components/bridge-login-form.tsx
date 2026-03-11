"use client";

import { type FormEvent, useState } from "react";
import { createClient } from "@/app/_lib/supabase/client";
import { Button } from "@/app/_components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/_components/ui/card";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";

interface BridgeLoginFormProps {
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
export function BridgeLoginForm({ inline = false }: BridgeLoginFormProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const emailSentContent = (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center space-y-2">
        <div className="text-6xl mb-2">✉️</div>
        <CardTitle>Check your inbox</CardTitle>
        <CardDescription>
          We sent a secure link to <strong>{email}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          Click the link to access the bridge. It expires in 1 hour.
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            setEmail("");
            setEmailSent(false);
            setError(null);
          }}
        >
          Use a different email
        </Button>
      </CardContent>
    </Card>
  );

  const loginFormContent = (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center space-y-2">
        <div className="text-5xl mb-2">🌉</div>
        <CardTitle>Welcome to the bridge</CardTitle>
        <CardDescription>Your hub for projects, updates, and collaboration</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bridge-email">Email</Label>
            <Input
              id="bridge-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              required
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="text-sm text-destructive text-center">
              {error}
            </div>
          )}

          <Button className="w-full" type="submit" disabled={isLoading || !email}>
            {isLoading ? "Sending link..." : "Send sign-in link"}
          </Button>
        </form>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            We'll send a secure link—no password needed.
          </p>
          <p className="text-xs text-muted-foreground">
            New here? Your studio will send you an invite to get started.
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const content = emailSent ? emailSentContent : loginFormContent;

  // Inline mode: no full-page wrapper
  if (inline) {
    return (
      <div className="flex items-center justify-center p-4">
        {content}
      </div>
    );
  }

  // Standalone mode: full-page wrapper
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {content}
    </div>
  );
}
