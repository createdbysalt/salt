"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "salt-sidebar-collapsed";
const STORAGE_EVENT = "salt-sidebar-collapsed-change";
const LG_BREAKPOINT = 1024; // Tailwind's lg breakpoint

// Helper to broadcast changes
function broadcastChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT));
  }
}

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount, but force collapsed on mobile
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isMobile = window.innerWidth < LG_BREAKPOINT;
      
      if (isMobile) {
        // On mobile, always collapse
        setCollapsed(true);
      } else {
        // On desktop, check localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            setCollapsed(JSON.parse(stored));
          } catch (e) {
            console.error("Failed to parse sidebar state:", e);
          }
        }
      }
      setIsLoaded(true);

      // Listen for window resize
      const handleResize = () => {
        const isMobile = window.innerWidth < LG_BREAKPOINT;
        if (isMobile) {
          setCollapsed(true);
        } else {
          // Restore from localStorage when going back to desktop
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            try {
              setCollapsed(JSON.parse(stored));
            } catch (e) {
              console.error("Failed to parse sidebar state:", e);
            }
          }
        }
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // Listen for changes from other components
  useEffect(() => {
    const handleStorageChange = () => {
      if (typeof window !== "undefined") {
        // Don't override mobile collapse state
        if (window.innerWidth >= LG_BREAKPOINT) {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            try {
              setCollapsed(JSON.parse(stored));
            } catch (e) {
              console.error("Failed to parse sidebar state:", e);
            }
          }
        }
      }
    };

    window.addEventListener(STORAGE_EVENT, handleStorageChange);
    return () => {
      window.removeEventListener(STORAGE_EVENT, handleStorageChange);
    };
  }, []);

  const toggle = () => {
    // Only allow manual toggle on desktop
    if (typeof window !== "undefined" && window.innerWidth >= LG_BREAKPOINT) {
      setCollapsed((prev) => {
        const newState = !prev;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
        return newState;
      });
      broadcastChange();
    }
  };

  return {
    collapsed,
    toggle,
    isLoaded,
  };
}

