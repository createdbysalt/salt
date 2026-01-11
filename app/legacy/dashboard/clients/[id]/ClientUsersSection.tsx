"use client";

import React, { useState } from "react";
import { inviteClientUser, revokeClientUser, resendInvite } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, CheckCircle } from "lucide-react";

type ClientUser = {
  id: string;
  email: string;
  role: string;
  user_id: string;
  created_at: string;
  status?: string;
};

export function ClientUsersSection({
  clientId,
  clientUsers,
}: {
  clientId: string;
  clientUsers: ClientUser[];
}) {
  const [isInviting, setIsInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsInviting(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const result = await inviteClientUser(clientId, formData);

    if (result.error) {
      setError(result.error);
    } else {
      // Use the message from the server action if available
      setSuccess(result.message || "Invite sent successfully!");
      setEmail("");
      // Reset form - check if currentTarget still exists
      if (e.currentTarget) {
        e.currentTarget.reset();
      }
    }

    setIsInviting(false);
  };

  const handleRevoke = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to revoke access for ${userEmail}?`)) {
      return;
    }

    const result = await revokeClientUser(clientId, userId);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("Access revoked successfully");
    }
  };
  
  const handleResend = async (userId: string, userEmail: string) => {
    setError(null);
    setSuccess(null);
    
    const result = await resendInvite(clientId, userId);
    
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(result.message || "Invite resent successfully");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Users</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Invite users to access this client&apos;s Bridge portal
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert variant="default" className="bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-200">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Invite Form */}
        <form onSubmit={handleInvite} className="flex gap-2">
          <Input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@example.com"
            className="flex-1"
            required
            disabled={isInviting}
          />
          <select
            name="role"
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm transition-colors hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isInviting}
            defaultValue="client"
          >
            <option value="client">Client</option>
            <option value="viewer">Viewer</option>
          </select>
          <Button
            type="submit"
            disabled={isInviting}
          >
            {isInviting ? (
              <>
                <Spinner size="sm" />
                Inviting...
              </>
            ) : (
              "Invite"
            )}
          </Button>
        </form>

        <Separator />

        {/* Current Users List */}
        {clientUsers.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <p>No users invited yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {clientUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{user.email}</div>
                    {user.status === 'pending' && (
                      <Badge variant="outline" className="text-warning border-warning">Pending</Badge>
                    )}
                    {user.status === 'active' && (
                      <Badge variant="outline" className="text-success border-success">Active</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    <span className="capitalize">{user.role}</span> • Invited{" "}
                    {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResend(user.user_id, user.email)}
                    title="Resend invite email"
                  >
                    Resend
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevoke(user.user_id, user.email)}
                    className="text-destructive hover:text-destructive"
                  >
                    Revoke
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

