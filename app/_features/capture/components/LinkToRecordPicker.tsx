"use client";

import { useState, useCallback, useTransition } from "react";
import {
  User,
  Building2,
  Briefcase,
  CreditCard,
  FileText,
  Calendar,
  MessageSquare,
  Search,
  Loader2,
  Check,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
} from "@repo/ui";
import { cn } from "@repo/utils";
import type { MemorySurface } from "../services/enrichment/types";

interface MemoryRecord {
  id: string;
  label: string;
  sublabel?: string;
}

interface LinkToRecordPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  captureId: string;
  workspaceId: string;
  onLink: (surface: MemorySurface, entityId: string, entityLabel: string) => Promise<void>;
}

const SURFACES: Array<{
  key: MemorySurface;
  label: string;
  icon: LucideIcon;
  searchPlaceholder: string;
}> = [
  { key: "people", label: "People", icon: User, searchPlaceholder: "Search contacts..." },
  { key: "orgs", label: "Organizations", icon: Building2, searchPlaceholder: "Search companies..." },
  { key: "work", label: "Work", icon: Briefcase, searchPlaceholder: "Search projects..." },
  { key: "billing", label: "Billing", icon: CreditCard, searchPlaceholder: "Search invoices..." },
  { key: "files", label: "Resources", icon: FileText, searchPlaceholder: "Search resources..." },
  { key: "meetings", label: "Meetings", icon: Calendar, searchPlaceholder: "Search meetings..." },
  { key: "conversations", label: "Conversations", icon: MessageSquare, searchPlaceholder: "Search threads..." },
];

export function LinkToRecordPicker({
  open,
  onOpenChange,
  captureId,
  workspaceId,
  onLink,
}: LinkToRecordPickerProps) {
  const [selectedSurface, setSelectedSurface] = useState<MemorySurface | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MemoryRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [linkedId, setLinkedId] = useState<string | null>(null);

  const handleSurfaceSelect = useCallback((surface: MemorySurface) => {
    setSelectedSurface(surface);
    setSearchQuery("");
    setSearchResults([]);
    setLinkedId(null);
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);

    if (!selectedSurface || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch(
        `/api/memory/search?surface=${selectedSurface}&q=${encodeURIComponent(query)}&workspace=${workspaceId}`
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results ?? []);
      }
    } catch (error) {
      console.error("[LinkToRecordPicker] Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  }, [selectedSurface, workspaceId]);

  const handleLink = useCallback(async (record: MemoryRecord) => {
    if (!selectedSurface) return;

    startTransition(async () => {
      await onLink(selectedSurface, record.id, record.label);
      setLinkedId(record.id);

      // Close after brief success feedback
      setTimeout(() => {
        onOpenChange(false);
        setSelectedSurface(null);
        setSearchQuery("");
        setSearchResults([]);
        setLinkedId(null);
      }, 500);
    });
  }, [selectedSurface, onLink, onOpenChange]);

  const handleBack = useCallback(() => {
    setSelectedSurface(null);
    setSearchQuery("");
    setSearchResults([]);
  }, []);

  const activeSurface = SURFACES.find((s) => s.key === selectedSurface);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {selectedSurface ? (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                ← Link to {activeSurface?.label}
              </button>
            ) : (
              "Link to Memory"
            )}
          </DialogTitle>
          <DialogDescription>
            {selectedSurface
              ? `Search for a ${activeSurface?.label.toLowerCase()} record to link`
              : "Select a Memory surface to link this capture to"}
          </DialogDescription>
        </DialogHeader>

        {!selectedSurface ? (
          <div className="grid grid-cols-2 gap-2 py-4">
            {SURFACES.map((surface) => {
              const Icon = surface.icon;
              return (
                <button
                  key={surface.key}
                  type="button"
                  onClick={() => handleSurfaceSelect(surface.key)}
                  className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-4 text-left transition hover:border-border hover:bg-muted/50"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted">
                    <Icon className="size-5" strokeWidth={1.5} />
                  </span>
                  <span className="text-sm font-medium">{surface.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={activeSurface?.searchPlaceholder}
                className="pl-10"
                autoFocus
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>

            {searchResults.length > 0 ? (
              <ul className="max-h-64 space-y-1 overflow-y-auto">
                {searchResults.map((record) => {
                  const isLinked = linkedId === record.id;
                  const Icon = activeSurface?.icon ?? User;

                  return (
                    <li key={record.id}>
                      <button
                        type="button"
                        onClick={() => handleLink(record)}
                        disabled={isPending}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition",
                          isLinked
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "hover:bg-muted/50"
                        )}
                      >
                        <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{record.label}</p>
                          {record.sublabel && (
                            <p className="truncate text-xs text-muted-foreground">
                              {record.sublabel}
                            </p>
                          )}
                        </div>
                        {isLinked ? (
                          <Check className="size-4 shrink-0 text-emerald-600" strokeWidth={2.5} />
                        ) : isPending ? (
                          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : searchQuery.length >= 2 && !isSearching ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No {activeSurface?.label.toLowerCase()} found
              </p>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Type to search {activeSurface?.label.toLowerCase()}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
