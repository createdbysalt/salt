"use client";

import { type FormEvent, useEffect, useState } from "react";
import { createClient } from "@/libs/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Bridge login (development path: /bridge/login)
 * Client users can request a magic link here to access the Bridge.
 */
export default function BridgeLoginPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/52067e1a-0c91-451e-8017-c6662a7cc76e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'bridge-login-pre2',hypothesisId:'L0',location:'app/bridge/login/page.tsx:useEffect',message:'mounted',data:{emailLen:email.length,isLoading,emailSent,hasError:!!error,disabledWouldBe:(!email||isLoading)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/52067e1a-0c91-451e-8017-c6662a7cc76e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'bridge-login-pre',hypothesisId:'L1',location:'app/bridge/login/page.tsx:handleSubmit',message:'submit clicked',data:{origin:window.location.origin,emailLen:email.length,hasAt:email.includes('@'),isLoadingBefore:isLoading,disabledWouldBe:(!email || isLoading)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log

      const supabase = createClient();
      const emailRedirectTo = `${window.location.origin}/bridge/verify`;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/52067e1a-0c91-451e-8017-c6662a7cc76e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'bridge-login-pre',hypothesisId:'L2',location:'app/bridge/login/page.tsx:handleSubmit',message:'calling signInWithOtp',data:{emailRedirectTo},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log

      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo,
        },
      });

      if (signInError) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/52067e1a-0c91-451e-8017-c6662a7cc76e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'bridge-login-pre',hypothesisId:'L3',location:'app/bridge/login/page.tsx:handleSubmit',message:'signInWithOtp error',data:{name:(signInError as any)?.name ?? null,status:(signInError as any)?.status ?? null,messageLen:(signInError.message||'').length},timestamp:Date.now()})}).catch(()=>{});
        // #endregion agent log
        setError(signInError.message);
        return;
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/52067e1a-0c91-451e-8017-c6662a7cc76e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'bridge-login-pre',hypothesisId:'L4',location:'app/bridge/login/page.tsx:handleSubmit',message:'signInWithOtp success',data:{},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log
      setEmailSent(true);
    } catch (err) {
      console.error("BridgeLoginPage signInWithOtp error:", err);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/52067e1a-0c91-451e-8017-c6662a7cc76e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'bridge-login-pre',hypothesisId:'L5',location:'app/bridge/login/page.tsx:handleSubmit',message:'exception thrown',data:{errType:typeof err,errName:(err as any)?.name ?? null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log
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
                  // #region agent log
                  fetch('http://127.0.0.1:7242/ingest/52067e1a-0c91-451e-8017-c6662a7cc76e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'bridge-login-pre2',hypothesisId:'L0',location:'app/bridge/login/page.tsx:Input#onChange',message:'email changed',data:{emailLen:next.length,hasAt:next.includes('@')},timestamp:Date.now()})}).catch(()=>{});
                  // #endregion agent log
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
              We’ll send a secure link—no password needed.
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


