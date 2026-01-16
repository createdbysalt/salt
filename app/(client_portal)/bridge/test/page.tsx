"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/libs/supabase/client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

/**
 * Bridge Test Page
 * 
 * Use this page to test the Bridge authentication flow without going through invites.
 * This helps debug issues with the magic link verification.
 */
export default function BridgeTestPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const [user, setUser] = useState<any>(null);
  const [clientMemberships, setClientMemberships] = useState<any[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const supabase = createClient();
    
    // Check session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error("Session error:", sessionError);
      setStatus("unauthenticated");
      return;
    }
    
    if (!session) {
      console.log("No active session");
      setStatus("unauthenticated");
      return;
    }
    
    setUser(session.user);
    setStatus("authenticated");
    
    // Check client memberships
    const { data: memberships } = await supabase
      .from("client_users")
      .select("id, email, role, status, client_id, clients(name)")
      .eq("user_id", session.user.id);
    
    setClientMemberships(memberships || []);
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Checking authentication...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-destructive" />
              <CardTitle>Not Authenticated</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              You are not currently signed in. To test the Bridge, you need to:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Sign in as a studio owner at <code className="px-2 py-1 bg-muted rounded">/signin</code></li>
              <li>Navigate to a client detail page</li>
              <li>Invite a client user (use your own email for testing)</li>
              <li>Click the magic link in your email</li>
            </ol>
            <div className="flex gap-2 pt-4">
              <Button onClick={() => router.push("/bridge/login")}>
                Go to Bridge Login
              </Button>
              <Button variant="outline" onClick={() => router.push("/signin")}>
                Sign In as Studio Owner
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-success" />
              <CardTitle>✅ Authentication Working!</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Authenticated User:</h3>
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <div><strong>Email:</strong> {user.email}</div>
                <div><strong>User ID:</strong> <code>{user.id}</code></div>
                <div><strong>Created:</strong> {new Date(user.created_at).toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client Memberships</CardTitle>
          </CardHeader>
          <CardContent>
            {clientMemberships.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-2">No client memberships found.</p>
                <p className="text-sm">This user is not associated with any clients.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clientMemberships.map((membership: any) => (
                  <div key={membership.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <div className="font-medium">{membership.clients?.name || "Unknown Client"}</div>
                      <div className="text-sm text-muted-foreground">{membership.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={membership.status === "active" ? "default" : "secondary"}>
                        {membership.status}
                      </Badge>
                      <Badge variant="outline">{membership.role}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Navigation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              className="w-full" 
              onClick={() => router.push("/bridge")}
              disabled={clientMemberships.length === 0}
            >
              Go to Bridge Portal
            </Button>
            {clientMemberships.length === 0 && (
              <p className="text-xs text-muted-foreground text-center">
                You need to be a member of at least one client to access the Bridge
              </p>
            )}
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => router.push("/dashboard")}
            >
              Go to Studio Dashboard
            </Button>
          </CardContent>
        </Card>

        <Card className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="text-blue-600 dark:text-blue-400">💡 Setup Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
              <div>
                <strong>Supabase Redirect URLs configured?</strong>
                <p className="text-muted-foreground">
                  Add <code>http://localhost:3000/bridge/verify</code> to Supabase → Auth → URL Configuration
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
              <div>
                <strong>Email provider configured?</strong>
                <p className="text-muted-foreground">
                  Resend API key set in environment variables
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
              <div>
                <strong>Test client created?</strong>
                <p className="text-muted-foreground">
                  Create a client in the studio dashboard to test invites
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

