"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Alert, AlertDescription } from "@/app/_components/ui/alert";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/app/_components/ui/sheet";
import { KnowledgeSearch, KnowledgeList } from "@/app/_features/knowledge/components";
import type {
  KnowledgeItemWithRelations,
  KnowledgeType,
  KnowledgeFilter,
} from "@/app/_features/knowledge/types";
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
}

export function KnowledgePageClient({
  clientId,
  clientName,
  initialItems,
  initialTags,
}: KnowledgePageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filter state
  const [filters, setFilters] = useState<KnowledgeFilter>({});
  const [items, setItems] = useState<KnowledgeItemWithRelations[]>(initialItems);
  const [availableTags, setAvailableTags] = useState<string[]>(initialTags);
  const [isSearching, setIsSearching] = useState(false);

  // Modal/Sheet state
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItemWithRelations | null>(null);

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
  const filteredItems = items.filter((item) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const titleMatch = item.title.toLowerCase().includes(searchLower);
      const contentMatch = item.content?.toLowerCase().includes(searchLower);
      if (!titleMatch && !contentMatch) return false;
    }

    // Type filter
    if (filters.types && filters.types.length > 0) {
      if (!filters.types.includes(item.type)) return false;
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some((tag) => item.tags.includes(tag));
      if (!hasMatchingTag) return false;
    }

    return true;
  });

  // Handle search change
  const handleSearchChange = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, search: query || undefined }));
  }, []);

  // Handle type filter change
  const handleTypeChange = useCallback((type: KnowledgeType | "all") => {
    setFilters((prev) => ({
      ...prev,
      types: type === "all" ? undefined : [type],
    }));
  }, []);

  // Handle tags filter change
  const handleTagsChange = useCallback((tags: string[]) => {
    setFilters((prev) => ({
      ...prev,
      tags: tags.length > 0 ? tags : undefined,
    }));
  }, []);

  // Handle add new item
  const handleAddItem = useCallback(() => {
    setEditingItem(null);
    setShowAddSheet(true);
  }, []);

  // Handle view item
  const handleViewItem = useCallback((item: KnowledgeItemWithRelations) => {
    // For now, open in edit mode for viewing
    setEditingItem(item);
    setShowAddSheet(true);
  }, []);

  // Handle edit item
  const handleEditItem = useCallback((item: KnowledgeItemWithRelations) => {
    setEditingItem(item);
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
          showSuccess("Item deleted successfully");
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
          showSuccess(item.is_pinned ? "Item unpinned" : "Item pinned");
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
          showSuccess(item.is_private ? "Item is now visible to client" : "Item is now private");
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
            showSuccess("Item updated successfully");
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
            showSuccess("Item added successfully");
            router.refresh();
          } else {
            showError(result.error);
          }
        }
      });
    },
    [clientId, editingItem, router, showSuccess, showError]
  );

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 text-green-900 border-green-200 dark:bg-green-900/20 dark:text-green-100 dark:border-green-900/30">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Search & Filter</CardTitle>
            <Button onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <KnowledgeSearch
            searchQuery={filters.search ?? ""}
            onSearchChange={handleSearchChange}
            selectedType={(filters.types?.[0] as KnowledgeType) ?? "all"}
            onTypeChange={handleTypeChange}
            availableTags={availableTags}
            selectedTags={filters.tags ?? []}
            onTagsChange={handleTagsChange}
            isSearching={isSearching || isPending}
          />
        </CardContent>
      </Card>

      {/* Knowledge Items List */}
      <KnowledgeList
        items={filteredItems}
        isLoading={isPending && items.length === 0}
        onAddItem={handleAddItem}
        onViewItem={handleViewItem}
        onEditItem={handleEditItem}
        onDeleteItem={handleDeleteItem}
        onTogglePin={handleTogglePin}
        onTogglePrivacy={handleTogglePrivacy}
        layout="grid"
      />

      {/* Add/Edit Sheet */}
      <Sheet open={showAddSheet} onOpenChange={setShowAddSheet}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingItem ? "Edit Knowledge Item" : "Add Knowledge Item"}
            </SheetTitle>
            <SheetDescription>
              {editingItem
                ? "Update the details of this knowledge item."
                : `Add a new knowledge item for ${clientName}.`}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <AddKnowledgeForm
              initialData={editingItem ?? undefined}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setShowAddSheet(false);
                setEditingItem(null);
              }}
              isSubmitting={isPending}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
