"use client";

import { useEffect } from "react";

interface HotkeyConfig {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  callback: (event: KeyboardEvent) => void;
}

/**
 * Hook to register global keyboard shortcuts
 * Handles cross-platform Cmd/Ctrl key detection
 */
export function useGlobalHotkeys(hotkeys: HotkeyConfig[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const hotkey of hotkeys) {
        const keyMatches = event.key.toLowerCase() === hotkey.key.toLowerCase();
        const ctrlMatches = hotkey.ctrlKey ? event.ctrlKey : !event.ctrlKey;
        const metaMatches = hotkey.metaKey ? event.metaKey : !event.metaKey;
        const shiftMatches = hotkey.shiftKey ? event.shiftKey : !event.shiftKey;
        const altMatches = hotkey.altKey ? event.altKey : !event.altKey;

        if (keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches) {
          event.preventDefault();
          hotkey.callback(event);
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hotkeys]);
}

