"use client";

import { useEffect, useCallback, useRef } from "react";

interface Client {
  id: string;
  name: string;
}

interface UseServeShortcutsOptions {
  clients: Client[];
  selectedClientId: string;
  onSelectClient: (clientId: string) => void;
  onOpenPreview: () => void;
  onSetDevice: (device: "desktop" | "tablet" | "mobile") => void;
  genericPreviewId: string;
}

/**
 * useServeShortcuts - Keyboard shortcuts for Spaces settings
 *
 * Shortcuts:
 * - P: Open preview in new tab
 * - C: Focus client switcher (dropdown)
 * - 1-9: Quick switch to client by position
 * - 0: Switch to generic preview
 * - Escape: Return to generic preview
 * - D: Desktop view
 * - T: Tablet view
 * - M: Mobile view
 */
export function useServeShortcuts({
  clients,
  selectedClientId,
  onSelectClient,
  onOpenPreview,
  onSetDevice,
  genericPreviewId,
}: UseServeShortcutsOptions) {
  const selectTriggerRef = useRef<HTMLButtonElement | null>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Ignore if modifier keys are pressed (except for Escape)
      if (event.key !== "Escape" && (event.ctrlKey || event.metaKey || event.altKey)) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case "p":
          event.preventDefault();
          onOpenPreview();
          break;

        case "c":
          event.preventDefault();
          // Focus the select trigger to open dropdown
          selectTriggerRef.current?.click();
          break;

        case "escape":
          event.preventDefault();
          if (selectedClientId !== genericPreviewId) {
            onSelectClient(genericPreviewId);
          }
          break;

        case "d":
          event.preventDefault();
          onSetDevice("desktop");
          break;

        case "t":
          event.preventDefault();
          onSetDevice("tablet");
          break;

        case "m":
          event.preventDefault();
          onSetDevice("mobile");
          break;

        case "0":
          event.preventDefault();
          onSelectClient(genericPreviewId);
          break;

        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          event.preventDefault();
          const index = parseInt(event.key) - 1;
          if (clients[index]) {
            onSelectClient(clients[index].id);
          }
          break;
      }
    },
    [clients, selectedClientId, onSelectClient, onOpenPreview, onSetDevice, genericPreviewId]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return { selectTriggerRef };
}
