"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/libs/supabase/client";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/_components/ui/card";

/**
 * DEV-ONLY: Password-based login page for automated testing
 *
 * This page only appears in development mode and allows logging in
 * with email/password for browser testing automation.
 */
export default function DevLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>This page is only available in development mode.</p>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
        return;
      }

      if (data.session) {
        // Redirect based on user type
        // Check if client user or studio user
        const { data: clientUser } = await supabase
          .from("client_users")
          .select("id")
          .eq("user_id", data.user.id)
          .single();

        if (clientUser) {
          router.push("/bridge");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (err) {
      setError("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  const fillStudioUser = () => {
    setEmail("test-studio@saltcore.dev");
    setPassword("teststudio123");
  };

  const fillClientUser = () => {
    setEmail("test-client@saltcore.dev");
    setPassword("testclient123");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Dev Login</CardTitle>
          <CardDescription>
            Development-only password login for automated testing.
            Run <code className="bg-muted px-1 rounded">npm run seed:test-users</code> first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 space-y-2">
            <p className="text-sm text-muted-foreground text-center">Quick fill:</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={fillStudioUser}
              >
                Studio User
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={fillClientUser}
              >
                Client User
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
