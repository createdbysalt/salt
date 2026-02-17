"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings, Mail, BarChart3, Link2, Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { Separator } from "@/app/_components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/_components/ui/tooltip";
import { cn } from "@repo/utils";
import { toast } from "sonner";

interface ServeQuickActionsProps {
  clientId: string | null;
  clientEmail: string | null;
  portalUrl?: string;
  className?: string;
}

/**
 * ServeQuickActions - Quick action buttons for portal management
 *
 * Actions:
 * - Settings → /serve/settings
 * - Send Invite → Opens modal (future: magic link)
 * - View Analytics → Future analytics page
 * - Copy Portal Link → Clipboard
 * - Open in New Tab → Full portal view
 */
export function ServeQuickActions({
  clientId,
  clientEmail,
  portalUrl = "/bridge",
  className,
}: ServeQuickActionsProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  const isClientSelected = !!clientId;

  // Copy portal link to clipboard
  const handleCopyLink = async () => {
    try {
      const fullUrl = `${window.location.origin}${portalUrl}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedLink(true);
      toast.success("Portal link copied to clipboard");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  // Open portal in new tab
  const handleOpenPortal = () => {
    window.open(portalUrl, "_blank", "noopener,noreferrer");
  };

  // Send invite (placeholder - will open modal in future)
  const handleSendInvite = () => {
    if (!clientEmail) {
      toast.error("No email address for this client");
      return;
    }
    // Future: Open invite modal
    toast.info("Invite feature coming soon", {
      description: `Would send invite to ${clientEmail}`,
    });
  };

  return (
    <TooltipProvider>
      <div className={cn("flex flex-col gap-2 p-3", className)}>
        {/* Primary Actions */}
        <div className="space-y-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                asChild
              >
                <Link href="/serve/settings">
                  <Settings className="h-4 w-4" />
                  Portal Settings
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              Configure branding, features, and access
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                disabled={!isClientSelected}
                onClick={handleSendInvite}
              >
                <Mail className="h-4 w-4" />
                Send Invite
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              {isClientSelected
                ? "Send portal access invite via email"
                : "Select a client first"}
            </TooltipContent>
          </Tooltip>
        </div>

        <Separator />

        {/* Secondary Actions */}
        <div className="space-y-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                disabled
              >
                <BarChart3 className="h-4 w-4" />
                View Analytics
                <span className="text-[10px] text-muted-foreground ml-auto">Soon</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Portal usage analytics (coming soon)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={handleCopyLink}
              >
                {copiedLink ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                {copiedLink ? "Copied!" : "Copy Link"}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Copy portal URL to clipboard</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={handleOpenPortal}
              >
                <ExternalLink className="h-4 w-4" />
                Open in Tab
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Open portal in new browser tab</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

/**
 * Compact quick actions for smaller spaces
 */
export function ServeQuickActionsCompact({
  clientId,
  portalUrl = "/bridge",
  className,
}: {
  clientId: string | null;
  portalUrl?: string;
  className?: string;
}) {
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = async () => {
    try {
      const fullUrl = `${window.location.origin}${portalUrl}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedLink(true);
      toast.success("Link copied");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-1", className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" asChild>
              <Link href="/serve/settings">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={handleCopyLink}>
              {copiedLink ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{copiedLink ? "Copied!" : "Copy link"}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => window.open(portalUrl, "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open in new tab</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
