"use client";

import {
  Send,
  XCircle,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@repo/ui";
import { cn } from "@repo/utils";

// =============================================================================
// Types
// =============================================================================

interface PeopleBulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onSendInvites?: () => void;
  onRevokeAccess?: () => void;
  onRemove?: () => void;
  /** Number of selected contacts that can receive invites (not_invited or revoked) */
  invitableCount?: number;
  /** Number of selected contacts that can be revoked (active or pending) */
  revokableCount?: number;
  /** Number of selected contacts that can be removed (not primary) */
  removableCount?: number;
  className?: string;
}

// =============================================================================
// Main Component
// =============================================================================

export function PeopleBulkActionBar({
  selectedCount,
  onClearSelection,
  onSendInvites,
  onRevokeAccess,
  onRemove,
  invitableCount = 0,
  revokableCount = 0,
  removableCount = 0,
  className,
}: PeopleBulkActionBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "bg-background border shadow-lg rounded-lg",
        "flex items-center gap-2 px-4 py-2",
        "animate-in slide-in-from-bottom-4 fade-in-0 duration-200",
        className
      )}
    >
      {/* Selection count */}
      <div className="flex items-center gap-2 pr-3 border-r">
        <span className="text-sm font-medium">
          {selectedCount} selected
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={onClearSelection}
        >
          <X className="size-3.5" />
        </Button>
      </div>

      {/* Send Invites */}
      {onSendInvites && invitableCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5"
          onClick={onSendInvites}
        >
          <Send className="size-4" />
          Send Invite
          {invitableCount < selectedCount && (
            <span className="text-xs text-muted-foreground">
              ({invitableCount})
            </span>
          )}
        </Button>
      )}

      {/* Revoke Access */}
      {onRevokeAccess && revokableCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5"
          onClick={onRevokeAccess}
        >
          <XCircle className="size-4" />
          Revoke
          {revokableCount < selectedCount && (
            <span className="text-xs text-muted-foreground">
              ({revokableCount})
            </span>
          )}
        </Button>
      )}

      {/* Remove */}
      {onRemove && removableCount > 0 && (
        <div className="pl-2 border-l">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
            Remove
            {removableCount < selectedCount && (
              <span className="text-xs text-muted-foreground">
                ({removableCount})
              </span>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
