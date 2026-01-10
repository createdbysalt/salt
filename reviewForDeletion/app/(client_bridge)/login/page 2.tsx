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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/52067e1a-0c91-451e-8017-c6662a7cc76e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'bridge-login-pre',hypothesisId:'L1',location:'app/(client_bridge)/login/page.tsx:handleSignIn',message:'submit clicked',data:{origin:window.location.origin,emailLen:email.length,hasAt:email.includes('@'),isLoadingBefore:isLoading,disabledWouldBe:(!email || isLoading)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log

      const supabase = createClient();
      
      // Send magic link
      const emailRedirectTo = `${window.location.origin}/bridge/verify`;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/52067e1a-0c91-451e-8017-c6662a7cc76e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'bridge-login-pre',hypothesisId:'L2',location:'app/(client_bridge)/login/page.tsx:handleSignIn',message:'calling signInWithOtp',data:{emailRedirectTo},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log

      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo,
        },
      });

      if (signInError) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/52067e1a-0c91-451e-8017-c6662a7cc76e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'bridge-login-pre',hypothesisId:'L3',location:'app/(client_bridge)/login/page.tsx:handleSignIn',message:'signInWithOtp error',data:{name:(signInError as any)?.name ?? null,status:(signInError as any)?.status ?? null,messageLen:(signInError.message||'').length},timestamp:Date.now()})}).catch(()=>{});
        // #endregion agent log
        setError(signInError.message);
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/52067e1a-0c91-451e-8017-c6662a7cc76e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'bridge-login-pre',hypothesisId:'L4',location:'app/(client_bridge)/login/page.tsx:handleSignIn',message:'signInWithOtp success',data:{},timestamp:Date.now()})}).catch(()=>{});
        // #endregion agent log
        setEmailSent(true);
      }
    } catch (err) {
      console.error("Sign-in error:", err);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/52067e1a-0c91-451e-8017-c6662a7cc76e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'bridge-login-pre',hypothesisId:'L5',location:'app/(client_bridge)/login/page.tsx:handleSignIn',message:'exception thrown',data:{errType:typeof err,errName:(err as any)?.name ?? null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log
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

