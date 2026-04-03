"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@repo/utils";
import { Inbox, ArrowRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Button,
} from "@repo/ui";
import { InboxSidebar } from "@/app/_features/inbox/components";
import { InboxProvider } from "@/app/_features/inbox/contexts/InboxContext";
import { hqRoutes } from "../routes";
import type { InboxItem } from "@/app/_features/inbox/types";

interface InboxOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InboxOverlay({ open, onOpenChange }: InboxOverlayProps) {
  const router = useRouter();

  const handleViewAll = () => {
    onOpenChange(false);
    router.push(hqRoutes.inbox);
  };

  const handleItemSelect = (item: InboxItem) => {
    // Close overlay and navigate to inbox
    onOpenChange(false);
    router.push(hqRoutes.inbox);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[420px] p-0 flex flex-col"
      >
        <SheetHeader className="px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base font-semibold">
              <Inbox className="h-4 w-4" />
              Inbox
            </SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewAll}
              className="text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          <InboxProvider>
            <InboxSidebar
              onSelect={handleItemSelect}
              className="h-full border-none"
            />
          </InboxProvider>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================================
// INBOX TRIGGER BUTTON
// ============================================================================

interface InboxTriggerProps {
  unreadCount?: number;
  onClick: () => void;
  className?: string;
}

export function InboxTrigger({ unreadCount = 0, onClick, className }: InboxTriggerProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={cn("relative", className)}
      aria-label={`Inbox${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
    >
      <Inbox className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Button>
  );
}
