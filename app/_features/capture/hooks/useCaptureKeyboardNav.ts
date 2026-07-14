import { useEffect, useCallback, useState } from "react";

interface UseCaptureKeyboardNavOptions {
  captureIds: string[];
  onSelect?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onReview?: (id: string) => void;
  onArchive?: (id: string) => void;
  enabled?: boolean;
}

interface UseCaptureKeyboardNavResult {
  selectedIndex: number;
  selectedId: string | null;
  setSelectedIndex: (index: number) => void;
}

export function useCaptureKeyboardNav({
  captureIds,
  onSelect,
  onDismiss,
  onReview,
  onArchive,
  enabled = true,
}: UseCaptureKeyboardNavOptions): UseCaptureKeyboardNavResult {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectedId = captureIds[selectedIndex] ?? null;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case "j":
          event.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, captureIds.length - 1));
          break;

        case "k":
          event.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;

        case "enter":
        case " ":
          event.preventDefault();
          if (selectedId && onSelect) {
            onSelect(selectedId);
          }
          break;

        case "e":
          event.preventDefault();
          if (selectedId && onDismiss) {
            onDismiss(selectedId);
          }
          break;

        case "r":
          event.preventDefault();
          if (selectedId && onReview) {
            onReview(selectedId);
          }
          break;

        case "a":
          event.preventDefault();
          if (selectedId && onArchive) {
            onArchive(selectedId);
          }
          break;
      }
    },
    [enabled, captureIds.length, selectedId, onSelect, onDismiss, onReview, onArchive]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handleKeyDown]);

  useEffect(() => {
    if (selectedIndex >= captureIds.length && captureIds.length > 0) {
      setSelectedIndex(captureIds.length - 1);
    }
  }, [captureIds.length, selectedIndex]);

  return {
    selectedIndex,
    selectedId,
    setSelectedIndex,
  };
}

export const KEYBOARD_SHORTCUTS = [
  { key: "J", description: "Next capture" },
  { key: "K", description: "Previous capture" },
  { key: "E", description: "Dismiss" },
  { key: "R", description: "Review with Salt" },
  { key: "Enter", description: "Open" },
] as const;
