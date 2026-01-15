"use client";

import { type FormEvent, useEffect, useState } from "react";
import { createClient } from "@/libs/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Standalone Bridge Login Page - completely bypasses bridge layout
 * Access at: /bridge-auth
 */
export default function BridgeAuthPage() {
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
      const emailRedirectTo = `${window.location.origin}/bridge/verify`;

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
      console.error("BridgeAuthPage signInWithOtp error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="text-5xl mb-2">🌉</div>
          <CardTitle>Welcome to the bridge</CardTitle>
          <CardDescription>Your hub for projects, updates, and collaboration</CardDescription>
          <p className="text-xs text-muted-foreground mt-2">
            Standalone login page (bypass mode)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  const next = e.target.value;
                  setEmail(next);
                }}
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
    </div>
  );
}