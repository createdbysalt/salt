"use client";

import { Mail, UserPlus } from "lucide-react";
import { Alert, AlertDescription, Button } from "@repo/ui";

export type BridgeStatus = "not_invited" | "invited" | "active" | "expired" | "revoked";

interface BridgeStatusBannerProps {
  status: BridgeStatus;
  clientName: string;
  onInvite?: () => void;
  onResendInvite?: () => void;
}

export function BridgeStatusBanner({
  status,
  clientName,
  onInvite,
  onResendInvite,
}: BridgeStatusBannerProps) {
  if (status === "active") {
    return null;
  }

  return (
    <Alert className="rounded-none border-x-0 border-t-0">
      <Mail className="size-4" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>
          {status === "not_invited" && (
            <>
              {clientName} hasn&apos;t been invited to Bridge yet. Messages will be sent via email.
            </>
          )}
          {status === "invited" && (
            <>
              {clientName} has a pending Bridge invitation. Messages will be sent via email until they join.
            </>
          )}
          {status === "expired" && (
            <>
              {clientName}&apos;s Bridge invitation has expired. Resend to give them access.
            </>
          )}
          {status === "revoked" && (
            <>
              {clientName}&apos;s Bridge access was revoked. Messages will be sent via email.
            </>
          )}
        </span>
        {status === "not_invited" && onInvite && (
          <Button variant="outline" size="sm" onClick={onInvite}>
            <UserPlus className="size-4" />
            Invite to Bridge
          </Button>
        )}
        {(status === "invited" || status === "expired") && onResendInvite && (
          <Button variant="outline" size="sm" onClick={onResendInvite}>
            <Mail className="size-4" />
            Resend Invite
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
