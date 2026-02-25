"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import {
  UserPlus,
  MoreHorizontal,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Skeleton,
} from "@repo/ui";
import { cn } from "@repo/utils";

// =============================================================================
// Types
// =============================================================================

export type BridgeUserStatus = "active" | "pending" | "expired" | "revoked";

export interface BridgeUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: "owner" | "member" | "viewer";
  status: BridgeUserStatus;
  invitedAt?: Date;
  joinedAt?: Date;
  lastActiveAt?: Date;
  expiresAt?: Date;
}

interface PeopleTabProps {
  clientId: string;
  clientName: string;
  bridgeUsers: BridgeUser[];
  isLoading?: boolean;
  onInvite?: () => void;
  onResendInvite?: (_userId: string) => void;
  onRevokeAccess?: (_userId: string) => void;
  onRemoveUser?: (_userId: string) => void;
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getStatusBadge(status: BridgeUserStatus) {
  switch (status) {
    case "active":
      return (
        <Badge variant="outline" className="border-green-500/50 bg-green-500/10 text-green-600">
          <CheckCircle2 className="size-3 mr-1" />
          Active
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-600">
          <Clock className="size-3 mr-1" />
          Pending
        </Badge>
      );
    case "expired":
      return (
        <Badge variant="outline" className="border-muted-foreground/50 bg-muted text-muted-foreground">
          <XCircle className="size-3 mr-1" />
          Expired
        </Badge>
      );
    case "revoked":
      return (
        <Badge variant="outline" className="border-destructive/50 bg-destructive/10 text-destructive">
          <XCircle className="size-3 mr-1" />
          Revoked
        </Badge>
      );
  }
}

// =============================================================================
// Sub-components
// =============================================================================

function BridgeUserRow({
  user,
  onResendInvite,
  onRevokeAccess,
  onRemoveUser,
}: {
  user: BridgeUser;
  onResendInvite?: () => void;
  onRevokeAccess?: () => void;
  onRemoveUser?: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <Avatar className="size-10">
          <AvatarImage src={user.avatarUrl} alt={user.name} />
          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{user.name}</span>
            {getStatusBadge(user.status)}
          </div>
          <div className="text-sm text-muted-foreground">{user.email}</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Status-specific info */}
        <div className="text-sm text-muted-foreground text-right">
          {user.status === "active" && user.lastActiveAt && (
            <span>Active {formatDistanceToNow(user.lastActiveAt, { addSuffix: true })}</span>
          )}
          {user.status === "pending" && user.invitedAt && (
            <span>Invited {formatDistanceToNow(user.invitedAt, { addSuffix: true })}</span>
          )}
          {user.status === "expired" && user.expiresAt && (
            <span>Expired {formatDistanceToNow(user.expiresAt, { addSuffix: true })}</span>
          )}
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(user.status === "pending" || user.status === "expired") && onResendInvite && (
              <DropdownMenuItem onClick={onResendInvite}>
                <RefreshCw className="size-4 mr-2" />
                Resend invitation
              </DropdownMenuItem>
            )}
            {user.status === "active" && onRevokeAccess && (
              <DropdownMenuItem onClick={onRevokeAccess}>
                <XCircle className="size-4 mr-2" />
                Revoke access
              </DropdownMenuItem>
            )}
            {onRemoveUser && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onRemoveUser}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-4 mr-2" />
                  Remove
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onInvite }: { onInvite?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Users className="size-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium">No Bridge users yet</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">
        Invite people from this client&apos;s team to give them access to the Bridge portal.
      </p>
      {onInvite && (
        <Button onClick={onInvite} className="mt-4">
          <UserPlus className="size-4" />
          Invite to Bridge
        </Button>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function PeopleTab({
  clientId: _clientId,
  clientName: _clientName,
  bridgeUsers,
  isLoading = false,
  onInvite,
  onResendInvite,
  onRevokeAccess,
  onRemoveUser,
  className,
}: PeopleTabProps) {
  // Separate users by status
  const activeUsers = bridgeUsers.filter((u) => u.status === "active");
  const pendingUsers = bridgeUsers.filter((u) => u.status === "pending");
  const expiredOrRevokedUsers = bridgeUsers.filter(
    (u) => u.status === "expired" || u.status === "revoked"
  );

  if (isLoading) {
    return (
      <div className={cn("p-6", className)}>
        <LoadingSkeleton />
      </div>
    );
  }

  if (bridgeUsers.length === 0) {
    return (
      <div className={cn("p-6", className)}>
        <EmptyState onInvite={onInvite} />
      </div>
    );
  }

  return (
    <div className={cn("p-6 space-y-6", className)}>
      {/* Header with invite button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Bridge Users</h2>
          <p className="text-sm text-muted-foreground">
            {activeUsers.length} active, {pendingUsers.length} pending
          </p>
        </div>
        {onInvite && (
          <Button onClick={onInvite}>
            <UserPlus className="size-4" />
            Invite
          </Button>
        )}
      </div>

      {/* Active Users */}
      {activeUsers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="size-4 text-green-600" />
              Active ({activeUsers.length})
            </CardTitle>
            <CardDescription>
              People with access to the Bridge portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {activeUsers.map((user) => (
                <BridgeUserRow
                  key={user.id}
                  user={user}
                  onRevokeAccess={onRevokeAccess ? () => onRevokeAccess(user.id) : undefined}
                  onRemoveUser={onRemoveUser ? () => onRemoveUser(user.id) : undefined}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Invitations */}
      {pendingUsers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="size-4 text-amber-600" />
              Pending Invitations ({pendingUsers.length})
            </CardTitle>
            <CardDescription>
              Waiting for these people to accept their invitation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {pendingUsers.map((user) => (
                <BridgeUserRow
                  key={user.id}
                  user={user}
                  onResendInvite={onResendInvite ? () => onResendInvite(user.id) : undefined}
                  onRemoveUser={onRemoveUser ? () => onRemoveUser(user.id) : undefined}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expired/Revoked */}
      {expiredOrRevokedUsers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="size-4 text-muted-foreground" />
              Inactive ({expiredOrRevokedUsers.length})
            </CardTitle>
            <CardDescription>
              Invitations that expired or were revoked
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {expiredOrRevokedUsers.map((user) => (
                <BridgeUserRow
                  key={user.id}
                  user={user}
                  onResendInvite={onResendInvite ? () => onResendInvite(user.id) : undefined}
                  onRemoveUser={onRemoveUser ? () => onRemoveUser(user.id) : undefined}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
