"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/app/_components/ui/alert";
import {
  KnowledgeToolbar,
  KnowledgeDenseList,
  KnowledgeCardGrid,
  KnowledgeDetailView,
  getTypesForFilter,
} from "@/app/_features/knowledge/components";
import type { FilterType } from "@/app/_features/knowledge/components/TypeFilterPills";
import type { ViewMode, QuickAction } from "@/app/_features/knowledge/components/KnowledgeToolbar";
import type { KnowledgeItemWithRelations, KnowledgeType } from "@/app/_features/knowledge/types";
import type { KnowledgeItem } from "./knowledge-actions";
import {
  getKnowledgeDownloadUrl,
  getKnowledgeFileContent,
  updateKnowledgeItem,
  deleteKnowledgeItem,
} from "./knowledge-actions";
import { AddKnowledgeModal } from "./AddKnowledgeModal";

interface ClientKnowledgeSectionProps {
  clientId: string;
  knowledgeItems: KnowledgeItem[];
}

// Map QuickAction to modal type
const ACTION_TO_MODAL_TYPE: Record<QuickAction, "note" | "link" | "document"> = {
  note: "note",
  file: "document",
  link: "link",
};

// Transform KnowledgeItem to the format expected by list/grid components
function transformItem(item: KnowledgeItem): KnowledgeItemWithRelations & {
  file_path?: string | null;
  file_name?: string | null;
  file_size_bytes?: number | null;
  mime_type?: string | null;
  file_url?: string | null;
} {
  // Map contentType to KnowledgeType
  const typeMap: Record<string, KnowledgeType> = {
    document: "document",
    transcript: "meeting_transcript",
    intake_response: "intake_response",
    note: "discovery_note",
    link: "link",
  };

  return {
    id: item.id,
    studio_id: "", // Not needed for display
    client_id: item.clientId,
    project_id: null,
    type: typeMap[item.contentType] || "document",
    title: item.title,
    content: item.content || null,
    rich_content: null,
    source_intake_id: null,
    source_url: item.externalUrl || null,
    source_file_path: item.filePath || null,
    tags: item.tags || [],
    category: null,
    is_pinned: item.isPinned || false,
    is_private: item.isPrivate || false,
    ai_summary: null,
    ai_insights: null,
    ai_generated_at: null,
    created_by: item.createdBy || null,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    // File fields for detail view
    file_path: item.filePath || null,
    file_name: item.fileName || null,
    file_size_bytes: item.fileSizeBytes || null,
    mime_type: item.mimeType || null,
    // Relations
    creator: null,
    client: null,
    project: null,
  };
}

export function ClientKnowledgeSection({
  clientId,
  knowledgeItems,
}: ClientKnowledgeSectionProps) {
  const router = useRouter();

  // View & filter state
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalType, setAddModalType] = useState<"note" | "link" | "document">("note");

  // Detail view state - replaces modal
  const [selectedItem, setSelectedItem] = useState<
    (ReturnType<typeof transformItem> & { file_url?: string | null }) | null
  >(null);

  // Feedback state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Transform items to the expected format
  const transformedItems = useMemo(
    () => knowledgeItems.map(transformItem),
    [knowledgeItems]
  );

  // Filter items
  const filteredItems = useMemo(() => {
    const typeArray = getTypesForFilter(typeFilter);

    return transformedItems.filter((item) => {
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

      return true;
    });
  }, [transformedItems, searchQuery, typeFilter]);

  // Calculate counts for filter pills
  const filterCounts = useMemo(() => {
    const counts: Partial<Record<FilterType, number>> = {
      all: transformedItems.length,
      notes: transformedItems.filter((i) =>
        ["discovery_note", "insight", "decision", "feedback"].includes(i.type)
      ).length,
      files: transformedItems.filter((i) =>
        ["document", "asset"].includes(i.type)
      ).length,
      links: transformedItems.filter((i) => i.type === "link").length,
    };
    return counts;
  }, [transformedItems]);

  // Handle toolbar action
  const handleAction = useCallback((action: QuickAction) => {
    setAddModalType(ACTION_TO_MODAL_TYPE[action]);
    setShowAddModal(true);
  }, []);

  // Handle add item (generic)
  const handleAddItem = useCallback(() => {
    setAddModalType("note");
    setShowAddModal(true);
  }, []);

  // Check if file is previewable as text
  const isPreviewableText = useCallback((mimeType?: string | null, fileName?: string | null): boolean => {
    if (mimeType?.startsWith("text/")) return true;
    if (mimeType === "application/json") return true;
    if (fileName) {
      const ext = fileName.split(".").pop()?.toLowerCase();
      return ["md", "txt", "json", "csv", "xml", "yaml", "yml", "html", "css", "js", "ts", "tsx", "jsx"].includes(ext || "");
    }
    return false;
  }, []);

  // Handle view item - fetch signed URL for files and show detail view
  type TransformedItem = ReturnType<typeof transformItem>;
  const handleViewItem = useCallback(async (item: TransformedItem) => {
    // Debug logging
    console.log("[Knowledge] Viewing item:", {
      id: item.id,
      title: item.title,
      type: item.type,
      file_path: item.source_file_path,
      file_name: item.file_name,
      mime_type: item.mime_type,
    });

    // If item has a file, fetch signed URL and optionally text content
    if (item.source_file_path) {
      setIsLoading(true);

      // Fetch signed URL for download
      console.log("[Knowledge] Fetching signed URL for:", item.id);
      const urlResult = await getKnowledgeDownloadUrl(item.id);

      // For text files, also fetch the content server-side (avoids CORS)
      let textContent: string | null = null;
      if (isPreviewableText(item.mime_type, item.file_name)) {
        console.log("[Knowledge] Fetching text content for preview");
        const contentResult = await getKnowledgeFileContent(item.id);
        if (contentResult.success && contentResult.data) {
          textContent = contentResult.data.content;
          console.log("[Knowledge] Text content fetched, length:", textContent.length);
        } else {
          console.warn("[Knowledge] Could not fetch text content:", contentResult.error);
        }
      }

      setIsLoading(false);

      console.log("[Knowledge] Signed URL result:", {
        success: urlResult.success,
        hasData: !!urlResult.data,
        error: urlResult.error,
      });

      if (urlResult.success && urlResult.data) {
        setSelectedItem({
          ...item,
          file_url: urlResult.data.url,
          // Pass pre-fetched text content to avoid client-side CORS fetch
          content: textContent || item.content,
        });
      } else {
        // File not found in storage - this can happen if:
        // 1. File was imported from Fireflies/Gemini (content stored in DB, no file in storage)
        // 2. File upload failed but record was created
        // 3. File was deleted from storage but record remains
        console.warn("[Knowledge] File not in storage:", urlResult.error);

        // If we have text content (either from DB or fetched), show it anyway
        if (textContent || item.content) {
          console.log("[Knowledge] Using content from database instead");
          setSelectedItem({
            ...item,
            content: textContent || item.content,
          });
        } else {
          // No file and no content - show error
          console.error("[Knowledge] No file and no content available");
          setError("File not found. It may have been deleted or failed to upload.");
          setSelectedItem(item);
        }
      }
    } else {
      console.log("[Knowledge] No file_path, showing item without file URL");
      setSelectedItem(item);
    }
  }, [isPreviewableText]);

  // Handle back to list
  const handleBackToList = useCallback(() => {
    setSelectedItem(null);
  }, []);

  // Success/error handlers
  const handleSuccess = useCallback((message: string) => {
    setSuccess(message);
    setError(null);
    setTimeout(() => setSuccess(null), 3000);
    router.refresh();
  }, [router]);

  const handleError = useCallback((message: string) => {
    setError(message);
    setSuccess(null);
  }, []);

  // Handle update item
  const handleUpdateItem = useCallback(async (
    id: string,
    updates: { title?: string; content?: string }
  ) => {
    const result = await updateKnowledgeItem({ id, ...updates });
    if (result.success) {
      handleSuccess("Item updated");
    } else {
      handleError(result.error || "Failed to update item");
    }
  }, [handleSuccess, handleError]);

  // Handle delete item
  const handleDeleteItem = useCallback(async (id: string) => {
    const result = await deleteKnowledgeItem(id);
    if (result.success) {
      setSelectedItem(null);
      handleSuccess("Item deleted");
    } else {
      handleError(result.error || "Failed to delete item");
    }
  }, [handleSuccess, handleError]);

  // If an item is selected, show the detail view
  if (selectedItem) {
    return (
      <div className="space-y-3">
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

        {/* Detail View */}
        <KnowledgeDetailView
          item={selectedItem}
          onBack={handleBackToList}
          onUpdate={handleUpdateItem}
          onDelete={handleDeleteItem}
          parentLabel="Knowledge"
        />

        {/* Add Modal - still available from detail view */}
        <AddKnowledgeModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          clientId={clientId}
          initialType={addModalType}
          onSuccess={handleSuccess}
          onError={handleError}
        />
      </div>
    );
  }

  // Otherwise show the list view
  return (
    <div className="space-y-3">
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

      {/* Unified Toolbar */}
      <KnowledgeToolbar
        selectedFilter={typeFilter}
        onFilterChange={setTypeFilter}
        filterCounts={filterCounts}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAction={handleAction}
      />

      {/* Results count when filtering */}
      {(searchQuery || typeFilter !== "all") && (
        <p className="text-xs text-muted-foreground">
          Showing {filteredItems.length} of {transformedItems.length} items
        </p>
      )}

      {/* Content View */}
      {viewMode === "list" ? (
        <KnowledgeDenseList
          items={filteredItems}
          isLoading={isLoading}
          onAddItem={handleAddItem}
          onViewItem={handleViewItem}
        />
      ) : (
        <KnowledgeCardGrid
          items={filteredItems}
          isLoading={isLoading}
          onAddItem={handleAddItem}
          onViewItem={handleViewItem}
        />
      )}

      {/* Add Modal */}
      <AddKnowledgeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        clientId={clientId}
        initialType={addModalType}
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  );
}
