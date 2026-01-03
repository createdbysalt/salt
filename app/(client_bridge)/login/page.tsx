"use client";

import { useState, FormEvent } from "react";
import { createClient } from "@/libs/supabase/client";
import { CheckCircle } from "lucide-react";

/**
 * Bridge Sign-In Page
 * Allows client users to request a magic link to access their projects
 */
export default function BridgeLoginPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const supabase = createClient();
      
      // Send magic link
      const emailRedirectTo = `${window.location.origin}/bridge/verify`;

      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo,
        },
      });

      if (signInError) {
        setError(signInError.message);
      } else {
        setEmailSent(true);
      }
    } catch (err) {
      console.error("Sign-in error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="card bg-card shadow-xl w-full max-w-md">
          <div className="card-body text-center space-y-4">
            <div className="text-6xl mb-2">✉️</div>
            <h2 className="text-2xl font-bold">Check your inbox</h2>
            <p className="text-muted-foreground">
              We sent a secure link to <strong>{email}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Click the link to access the bridge. It expires in 1 hour.
            </p>
            <button
              onClick={() => {
                setEmailSent(false);
                setEmail("");
              }}
              className="btn btn-ghost btn-sm mt-4"
            >
              Use a different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="card bg-card shadow-xl w-full max-w-md">
        <div className="card-body space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="text-5xl mb-2">🌉</div>
            <h1 className="text-3xl font-bold">Welcome to the bridge</h1>
            <p className="text-muted-foreground">
              Your central hub for projects, updates, and collaboration
            </p>
          </div>

          {/* Sign-in Form */}
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="label">
                <span className="label-text">Email address</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={isLoading}
                className="input input-bordered w-full"
                autoFocus
              />
            </div>

            {error && (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !email}
              className="btn btn-primary w-full"
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Sending link...
                </>
              ) : (
                "Send sign-in link"
              )}
            </button>
          </form>

          {/* Help Text */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              We'll send a secure link to your email—no password needed.
            </p>
            <p className="text-xs text-muted-foreground">
              New here? Your studio will send you an invite to get started.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

