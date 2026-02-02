"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronsUpDown, Check, User, ExternalLink } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/_components/ui/tooltip";
import { cn } from "@repo/utils";
import { useServeClientSafe } from "../../../hooks/useServeClient";
import { studioRoutes } from "../../../routes";

interface ClientContextBarProps {
  collapsed?: boolean;
}

/**
 * ClientContextBar - Client selector for Serve mode
 *
 * Shows a dropdown to select which client is active in Serve mode.
 * Appears in the sidebar between quick actions and navigation.
 * Selection persists to localStorage.
 */
export function ClientContextBar({ collapsed = false }: ClientContextBarProps) {
  const { selectedClient, setSelectedClient, clients, isLoaded } =
    useServeClientSafe();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  if (!isLoaded) {
    return (
      <div
        className={cn(
          "rounded-lg bg-sidebar-accent/50 animate-pulse",
          collapsed ? "h-10 w-10 mx-auto" : "h-12 mx-0"
        )}
      />
    );
  }

  const triggerButton = (
    <button
      onClick={() => setIsOpen(!isOpen)}
      className={cn(
        "flex items-center gap-2 w-full rounded-lg transition-colors",
        "bg-sidebar-accent/50 hover:bg-sidebar-accent",
        "border border-sidebar-border/50",
        collapsed ? "justify-center p-2" : "px-3 py-2"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center shrink-0 rounded-md",
          "bg-primary/10 text-primary",
          collapsed ? "h-6 w-6" : "h-7 w-7"
        )}
      >
        <User className={collapsed ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </div>

      {!collapsed && (
        <>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {selectedClient ? selectedClient.name : "All Clients"}
            </p>
            {selectedClient?.contactEmail && (
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {selectedClient.contactEmail}
              </p>
            )}
            {!selectedClient && (
              <p className="text-xs text-sidebar-foreground/60">
                Viewing all clients
              </p>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 text-sidebar-foreground/50 shrink-0" />
        </>
      )}
    </button>
  );

  return (
    <div className="relative" ref={menuRef}>
      {collapsed ? (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
            <TooltipContent side="right">
              <p className="font-medium">
                {selectedClient ? selectedClient.name : "All Clients"}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedClient
                  ? "Click to change"
                  : "Viewing all clients"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        triggerButton
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-1 py-1 rounded-lg border bg-popover shadow-md",
            "max-h-64 overflow-y-auto",
            collapsed ? "left-full top-0 ml-2 w-56" : "left-0 right-0 w-full"
          )}
        >
          {clients.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              <p>No clients found</p>
              <Link
                href={studioRoutes.clients.new}
                className="text-primary hover:underline mt-1 inline-block"
                onClick={() => setIsOpen(false)}
              >
                Create a client
              </Link>
            </div>
          ) : (
            <>
              {/* All Clients option */}
              <button
                onClick={() => {
                  setSelectedClient(null);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors",
                  !selectedClient
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                )}
              >
                <div className="flex-1 text-left">
                  <p className="font-medium">All Clients</p>
                  <p className="text-xs text-muted-foreground">View all client data</p>
                </div>
                {!selectedClient && (
                  <Check className="h-4 w-4 shrink-0" />
                )}
              </button>
              <div className="my-1 border-t border-border" />

              {/* Client list */}
              {clients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => {
                    setSelectedClient(client);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors",
                    selectedClient?.id === client.id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  )}
                >
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium truncate">{client.name}</p>
                    {client.contactEmail && (
                      <p className="text-xs text-muted-foreground truncate">
                        {client.contactEmail}
                      </p>
                    )}
                  </div>
                  {selectedClient?.id === client.id && (
                    <Check className="h-4 w-4 shrink-0" />
                  )}
                </button>
              ))}

              {/* Link to full clients list */}
              <div className="mt-1 pt-1 border-t border-border">
                <Link
                  href={studioRoutes.clients.list}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  <span className="flex-1">View all clients</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
