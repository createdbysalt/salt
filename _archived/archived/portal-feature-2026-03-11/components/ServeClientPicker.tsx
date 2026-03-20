"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Plus, Check, User, Building2 } from "lucide-react";
import { Input } from "@/app/_components/ui/input";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { cn } from "@repo/utils";
import { studioRoutes } from "@/app/_features/shell/routes";

interface Client {
  id: string;
  name: string;
  contactEmail: string | null;
  lifecycleStage?: string;
  companyName?: string | null;
}

interface ServeClientPickerProps {
  clients: Client[];
  selectedClientId: string | null;
  onSelectClient: (client: Client | null) => void;
  className?: string;
}

/**
 * ServeClientPicker - Vertical client list for Serve Mode
 *
 * Features:
 * - Search/filter capability
 * - Shows client status indicators
 * - "Add Client" shortcut at bottom
 * - Highlights selected client
 */
export function ServeClientPicker({
  clients,
  selectedClientId,
  onSelectClient,
  className,
}: ServeClientPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter clients by search query
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;

    const query = searchQuery.toLowerCase();
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(query) ||
        client.contactEmail?.toLowerCase().includes(query) ||
        client.companyName?.toLowerCase().includes(query)
    );
  }, [clients, searchQuery]);

  // Get status badge variant
  const getStatusVariant = (stage?: string): "default" | "secondary" | "outline" => {
    switch (stage) {
      case "active":
      case "client":
        return "default";
      case "lead":
      case "prospect":
        return "secondary";
      default:
        return "outline";
    }
  };

  // Format status label
  const getStatusLabel = (stage?: string): string => {
    if (!stage) return "Unknown";
    return stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Client List */}
      <div className="flex-1 overflow-y-auto">
        {filteredClients.length === 0 ? (
          <div className="p-6 text-center">
            <User className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            {clients.length === 0 ? (
              <>
                <p className="text-sm font-medium mb-1">No clients yet</p>
                <p className="text-xs text-muted-foreground">
                  Add a client to start managing their portal
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium mb-1">No matches found</p>
                <p className="text-xs text-muted-foreground">
                  Try a different search term
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredClients.map((client) => {
              const isSelected = selectedClientId === client.id;
              return (
                <button
                  key={client.id}
                  onClick={() => onSelectClient(isSelected ? null : client)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-colors",
                    "hover:bg-muted/50",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    isSelected && "bg-primary/10 ring-1 ring-primary/30"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar/Icon */}
                    <div
                      className={cn(
                        "shrink-0 h-10 w-10 rounded-lg flex items-center justify-center",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {client.companyName ? (
                        <Building2 className="h-5 w-5" />
                      ) : (
                        <User className="h-5 w-5" />
                      )}
                    </div>

                    {/* Client Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {client.name}
                        </p>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </div>
                      {client.contactEmail && (
                        <p className="text-xs text-muted-foreground truncate">
                          {client.contactEmail}
                        </p>
                      )}
                      {client.companyName && (
                        <p className="text-xs text-muted-foreground truncate">
                          {client.companyName}
                        </p>
                      )}
                    </div>

                    {/* Status Badge */}
                    {client.lifecycleStage && (
                      <Badge
                        variant={getStatusVariant(client.lifecycleStage)}
                        className="shrink-0 text-xs"
                      >
                        {getStatusLabel(client.lifecycleStage)}
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Client Button */}
      <div className="p-3 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          asChild
        >
          <Link href={studioRoutes.clients.new}>
            <Plus className="h-4 w-4" />
            Add Client
          </Link>
        </Button>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for client picker
 */
export function ServeClientPickerSkeleton() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      {/* Search skeleton */}
      <div className="p-3 border-b border-border">
        <div className="h-9 bg-muted rounded-md" />
      </div>

      {/* Client list skeleton */}
      <div className="flex-1 p-2 space-y-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-3 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 bg-muted rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Button skeleton */}
      <div className="p-3 border-t border-border">
        <div className="h-9 bg-muted rounded-md" />
      </div>
    </div>
  );
}
