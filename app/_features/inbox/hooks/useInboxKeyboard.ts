"use client";

import { useCallback, useEffect } from "react";
import type { InboxItem, InboxState } from "../types";

interface UseInboxKeyboardOptions {
  items: InboxItem[];
  focusedId: string | null;
  selectedIds: Set<string>;
  previewItem: InboxItem | null;
  onFocusChange: (id: string | null) => void;
  onSelectionChange: (ids: Set<string>) => void;
  onStateChange: (state: InboxState) => void;
  onArchive: (ids: string[]) => void;
  onSnoozeOpen: (id: string) => void;
  onItemOpen: (item: InboxItem) => void;
  onPreviewClose: () => void;
}

/**
 * useInboxKeyboard - Keyboard navigation and shortcuts for inbox
 *
 * Navigation:
 * - J / ↓: Move down
 * - K / ↑: Move up
 * - X: Toggle selection
 * - ⌘A: Select all
 * - ⌘⇧A: Deselect all
 *
 * Actions:
 * - E: Archive focused/selected
 * - H: Open snooze for focused
 * - Enter: Open focused item
 * - Esc: Close preview or clear selection
 *
 * State Tabs:
 * - 1: Inbox
 * - 2: Snoozed
 * - 3: Done
 */
export function useInboxKeyboard({
  items,
  focusedId,
  selectedIds,
  previewItem,
  onFocusChange,
  onSelectionChange,
  onStateChange,
  onArchive,
  onSnoozeOpen,
  onItemOpen,
  onPreviewClose,
}: UseInboxKeyboardOptions) {
  // Get item IDs in order
  const itemIds = items.map((item) => item.id);

  // Move focus up/down
  const moveFocus = useCallback(
    (direction: "up" | "down") => {
      if (itemIds.length === 0) return;

      const currentIndex = focusedId ? itemIds.indexOf(focusedId) : -1;
      let newIndex: number;

      if (currentIndex === -1) {
        // No current focus, start at first or last
        newIndex = direction === "down" ? 0 : itemIds.length - 1;
      } else if (direction === "down") {
        newIndex = Math.min(currentIndex + 1, itemIds.length - 1);
      } else {
        newIndex = Math.max(currentIndex - 1, 0);
      }

      onFocusChange(itemIds[newIndex]);
    },
    [itemIds, focusedId, onFocusChange]
  );

  // Toggle selection for focused item
  const toggleSelection = useCallback(() => {
    if (!focusedId) return;

    const newSelection = new Set(selectedIds);
    if (newSelection.has(focusedId)) {
      newSelection.delete(focusedId);
    } else {
      newSelection.add(focusedId);
    }
    onSelectionChange(newSelection);
  }, [focusedId, selectedIds, onSelectionChange]);

  // Select/deselect all
  const selectAll = useCallback(() => {
    onSelectionChange(new Set(itemIds));
  }, [itemIds, onSelectionChange]);

  const deselectAll = useCallback(() => {
    onSelectionChange(new Set());
  }, [onSelectionChange]);

  // Archive action
  const handleArchive = useCallback(() => {
    if (selectedIds.size > 0) {
      onArchive(Array.from(selectedIds));
      onSelectionChange(new Set());
    } else if (focusedId) {
      onArchive([focusedId]);
      moveFocus("down");
    }
  }, [selectedIds, focusedId, onArchive, onSelectionChange, moveFocus]);

  // Open focused item
  const handleOpen = useCallback(() => {
    if (!focusedId) return;
    const item = items.find((i) => i.id === focusedId);
    if (item) {
      onItemOpen(item);
    }
  }, [focusedId, items, onItemOpen]);

  // Main keyboard handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if typing in input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Navigation
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        moveFocus("down");
        return;
      }

      if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        moveFocus("up");
        return;
      }

      // Selection
      if (e.key === "x") {
        e.preventDefault();
        toggleSelection();
        return;
      }

      if (e.key === "a" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (e.shiftKey) {
          deselectAll();
        } else {
          selectAll();
        }
        return;
      }

      // Actions
      if (e.key === "e" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleArchive();
        return;
      }

      if (e.key === "h" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        if (focusedId) {
          onSnoozeOpen(focusedId);
        }
        return;
      }

      if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleOpen();
        return;
      }

      // Escape
      if (e.key === "Escape") {
        e.preventDefault();
        if (previewItem) {
          onPreviewClose();
        } else if (selectedIds.size > 0) {
          deselectAll();
        } else if (focusedId) {
          onFocusChange(null);
        }
        return;
      }

      // State tabs
      if (e.key === "1" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onStateChange("inbox");
        return;
      }

      if (e.key === "2" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onStateChange("snoozed");
        return;
      }

      if (e.key === "3" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onStateChange("done");
        return;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    moveFocus,
    toggleSelection,
    selectAll,
    deselectAll,
    handleArchive,
    handleOpen,
    focusedId,
    previewItem,
    selectedIds,
    onStateChange,
    onSnoozeOpen,
    onPreviewClose,
    onFocusChange,
  ]);
}
