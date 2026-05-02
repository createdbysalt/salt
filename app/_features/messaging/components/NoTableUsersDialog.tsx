"use client";

import { Mail, UserPlus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui";

interface NoTableUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  onSendViaEmail: () => void;
  onInviteToBridge: () => void;
}

export function NoTableUsersDialog({
  open,
  onOpenChange,
  clientName,
  onSendViaEmail,
  onInviteToBridge,
}: NoTableUsersDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
            <Mail className="size-6 text-muted-foreground" />
          </div>
          <AlertDialogTitle className="text-center">
            No Bridge users yet
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {clientName} hasn&apos;t been invited to Bridge yet.
            Messages will be sent via email instead.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel asChild>
            <button
              onClick={onSendViaEmail}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              <Mail className="size-4" />
              Send via Email
            </button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <button
              onClick={onInviteToBridge}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <UserPlus className="size-4" />
              Invite to Bridge
            </button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
