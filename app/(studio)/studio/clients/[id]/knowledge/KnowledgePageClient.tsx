"use client";

import { useState, useCallback, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/app/_components/ui/input";
import { Button } from "@/app/_components/ui/button";
import { Alert, AlertDescription } from "@/app/_components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/app/_components/ui/sheet";
import {
  QuickActionsBar,
  KnowledgeDenseList,
  TypeFilterPills,
  getTypesForFilter,
} from "@/app/_features/knowledge/components";
import type {
  KnowledgeItemWithRelations,
  KnowledgeType,
  KnowledgeFilter,
} from "@/app/_features/knowledge/types";
import { PROJECT_FILTER_ALL } from "@/app/_features/knowledge/types";
import type { ProjectOption } from "@/app/_features/knowledge/components/KnowledgeSearch";
import type { FilterType } from "@/app/_features/knowledge/components/TypeFilterPills";
import type { QuickAction } from "@/app/_features/knowledge/components/QuickActionsBar";
import {
  addKnowledgeItem,
  updateKnowledgeItem,
  deleteKnowledgeItem,
  toggleKnowledgeItemPin,
  toggleKnowledgeItemPrivacy,
} from "@/app/_features/knowledge/actions";
import { AddKnowledgeForm } from "./AddKnowledgeForm";

interface KnowledgePageClientProps {
  clientId: string;
  clientName: string;
  initialItems: KnowledgeItemWithRelations[];
  initialTags: string[];
  projects: ProjectOption[];
}

// Map QuickAction to KnowledgeType
const ACTION_TO_TYPE: Record<QuickAction, KnowledgeType> = {
  note: "discovery_note",
  file: "document",
  link: "link",
};

export function KnowledgePageClient({
  clientId,
  clientName,
  initialItems,
  initialTags,
  projects,
}: KnowledgePageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [projectFilter, setProjectFilter] = useState<string | typeof PROJECT_FILTER_ALL | null>(PROJECT_FILTER_ALL);
  const [items, setItems] = useState<KnowledgeItemWithRelations[]>(initialItems);
  const [availableTags, setAvailableTags] = useState<string[]>(initialTags);

  // Modal/Sheet state
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItemWithRelations | null>(null);
  const [presetType, setPresetType] = useState<KnowledgeType | null>(null);

  // Feedback state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Clear messages after delay
  const showSuccess = useCallback((message: string) => {
    setSuccess(message);
    setError(null);
    setTimeout(() => setSuccess(null), 3000);
  }, []);

  const showError = useCallback((message: string) => {
    setError(message);
    setSuccess(null);
  }, []);

  // Filter items client-side for immediate feedback
  const filteredItems = useMemo(() => {
    const typeArray = getTypesForFilter(typeFilter);

    return items.filter((item) => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(searchLower);
        const contentMatch = item.content?.toLowerCase().includes(searchLower);
        if (!titleMatch && !contentMatch) return false;
      }

      // Type filter
      if (typeArray && typeArray.length > 0) {
        if (!typeArray.includes(item.type)) return false;
      }

      // Project filter
      if (projectFilter !== PROJECT_FILTER_ALL && projectFilter !== undefined) {
        if (projectFilter === null) {
          // Client-level only: item must have no project
          if (item.project_id !== null) return false;
        } else {
          // Specific project: show items for that project OR client-level items
          if (item.project_id !== projectFilter && item.project_id !== null) return false;
        }
      }

      return true;
    });
  }, [items, searchQuery, typeFilter, projectFilter]);

  // Calculate counts for filter pills
  const filterCounts = useMemo(() => {
    const counts: Partial<Record<FilterType, number>> = {
      all: items.length,
      notes: items.filter((i) => ["discovery_note", "insight", "decision", "feedback"].includes(i.type)).length,
      files: items.filter((i) => ["document", "asset"].includes(i.type)).length,
      links: items.filter((i) => i.type === "link").length,
      intake: items.filter((i) => ["intake_response", "meeting_transcript"].includes(i.type)).length,
    };
    return counts;
  }, [items]);

  // Handle quick action (opens sheet with preset type)
  const handleQuickAction = useCallback((action: QuickAction) => {
    setEditingItem(null);
    setPresetType(ACTION_TO_TYPE[action]);
    setShowAddSheet(true);
  }, []);

  // Handle file drop
  const handleFileDrop = useCallback((files: FileList) => {
    // For now, just open the file upload sheet
    // TODO: Implement actual file upload when Supabase Storage is configured
    setEditingItem(null);
    setPresetType("document");
    setShowAddSheet(true);
  }, []);

  // Handle add new item (generic)
  const handleAddItem = useCallback(() => {
    setEditingItem(null);
    setPresetType(null);
    setShowAddSheet(true);
  }, []);

  // Handle view item
  const handleViewItem = useCallback((item: KnowledgeItemWithRelations) => {
    setEditingItem(item);
    setPresetType(null);
    setShowAddSheet(true);
  }, []);

  // Handle edit item
  const handleEditItem = useCallback((item: KnowledgeItemWithRelations) => {
    setEditingItem(item);
    setPresetType(null);
    setShowAddSheet(true);
  }, []);

  // Handle delete item
  const handleDeleteItem = useCallback(
    async (item: KnowledgeItemWithRelations) => {
      if (!confirm(`Are you sure you want to delete "${item.title}"?`)) {
        return;
      }

      startTransition(async () => {
        const result = await deleteKnowledgeItem(item.id);
        if (result.success) {
          setItems((prev) => prev.filter((i) => i.id !== item.id));
          showSuccess("Item deleted");
        } else {
          showError(result.error);
        }
      });
    },
    [showSuccess, showError]
  );

  // Handle toggle pin
  const handleTogglePin = useCallback(
    async (item: KnowledgeItemWithRelations) => {
      startTransition(async () => {
        const result = await toggleKnowledgeItemPin(item.id);
        if (result.success) {
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id ? { ...i, is_pinned: !i.is_pinned } : i
            )
          );
          showSuccess(item.is_pinned ? "Unpinned" : "Pinned");
        } else {
          showError(result.error);
        }
      });
    },
    [showSuccess, showError]
  );

  // Handle toggle privacy
  const handleTogglePrivacy = useCallback(
    async (item: KnowledgeItemWithRelations) => {
      startTransition(async () => {
        const result = await toggleKnowledgeItemPrivacy(item.id);
        if (result.success) {
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id ? { ...i, is_private: !i.is_private } : i
            )
          );
          showSuccess(item.is_private ? "Now visible" : "Now private");
        } else {
          showError(result.error);
        }
      });
    },
    [showSuccess, showError]
  );

  // Handle form submission (create or update)
  const handleFormSubmit = useCallback(
    async (data: {
      type: KnowledgeType;
      title: string;
      content?: string;
      source_url?: string;
      tags?: string[];
      is_pinned?: boolean;
      is_private?: boolean;
    }) => {
      startTransition(async () => {
        if (editingItem) {
          // Update existing item
          const result = await updateKnowledgeItem(editingItem.id, {
            title: data.title,
            content: data.content,
            source_url: data.source_url,
            tags: data.tags,
            is_pinned: data.is_pinned,
            is_private: data.is_private,
          });

          if (result.success) {
            setItems((prev) =>
              prev.map((i) =>
                i.id === editingItem.id
                  ? {
                      ...i,
                      ...result.data,
                      creator: i.creator,
                      client: i.client,
                    }
                  : i
              )
            );
            setShowAddSheet(false);
            setEditingItem(null);
            setPresetType(null);
            showSuccess("Updated");
            router.refresh();
          } else {
            showError(result.error);
          }
        } else {
          // Create new item
          const result = await addKnowledgeItem({
            client_id: clientId,
            type: data.type,
            title: data.title,
            content: data.content,
            source_url: data.source_url,
            tags: data.tags,
            is_pinned: data.is_pinned,
            is_private: data.is_private,
          });

          if (result.success) {
            // Add new item to the list
            const newItem: KnowledgeItemWithRelations = {
              ...result.data,
              creator: null,
              client: null,
            };
            setItems((prev) => [newItem, ...prev]);

            // Update available tags if new tags were added
            if (data.tags) {
              setAvailableTags((prev) => {
                const newTags = data.tags!.filter((t) => !prev.includes(t));
                return newTags.length > 0 ? [...prev, ...newTags].sort() : prev;
              });
            }

            setShowAddSheet(false);
            setPresetType(null);
            showSuccess("Added");
            router.refresh();
          } else {
            showError(result.error);
          }
        }
      });
    },
    [clientId, editingItem, router, showSuccess, showError]
  );

  // Handle sheet close
  const handleSheetClose = useCallback((open: boolean) => {
    if (!open) {
      setShowAddSheet(false);
      setEditingItem(null);
      setPresetType(null);
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Status Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-success/10 text-success border-success/20">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Quick Actions Bar (drag-drop zone) */}
      <QuickActionsBar
        onAction={handleQuickAction}
        onFileDrop={handleFileDrop}
      />

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Type Filter Pills */}
        <TypeFilterPills
          selected={typeFilter}
          onChange={setTypeFilter}
          counts={filterCounts}
        />

        <div className="flex-1" />

        {/* Project Filter */}
        {projects.length > 0 && (
          <Select
            value={projectFilter === PROJECT_FILTER_ALL ? "all" : projectFilter === null ? "client-level" : projectFilter}
            onValueChange={(value) => {
              if (value === "all") setProjectFilter(PROJECT_FILTER_ALL);
              else if (value === "client-level") setProjectFilter(null);
              else setProjectFilter(value);
            }}
          >
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              <SelectItem value="client-level">Client-Level</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Search Input */}
        <div className="relative w-full sm:w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-8 h-8 text-xs"
          />
          {isPending ? (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : searchQuery ? (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-3 w-3" />
            </Button>
          ) : null}
        </div>
      </div>

      {/* Results count */}
      {(searchQuery || typeFilter !== "all" || projectFilter !== PROJECT_FILTER_ALL) && (
        <p className="text-xs text-muted-foreground">
          Showing {filteredItems.length} of {items.length} items
        </p>
      )}

      {/* Dense List */}
      <KnowledgeDenseList
        items={filteredItems}
        isLoading={isPending && items.length === 0}
        onAddItem={handleAddItem}
        onViewItem={handleViewItem}
        onEditItem={handleEditItem}
        onDeleteItem={handleDeleteItem}
        onTogglePin={handleTogglePin}
        onTogglePrivacy={handleTogglePrivacy}
      />

      {/* Add/Edit Sheet */}
      <Sheet open={showAddSheet} onOpenChange={handleSheetClose}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingItem ? "Edit Item" : "Add Item"}
            </SheetTitle>
            <SheetDescription>
              {editingItem
                ? "Update the details of this item."
                : `Add to ${clientName}'s knowledge base.`}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <AddKnowledgeForm
              initialData={editingItem ?? (presetType ? { type: presetType } as any : undefined)}
              onSubmit={handleFormSubmit}
              onCancel={() => handleSheetClose(false)}
              isSubmitting={isPending}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
