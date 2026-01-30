"use client";

import { useState, useEffect, useCallback } from "react";

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount, detect mobile
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mobile = window.innerWidth < LG_BREAKPOINT;
      setIsMobile(mobile);

      // Load collapsed preference for desktop
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          setCollapsed(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse sidebar state:", e);
        }
      }
      setIsLoaded(true);

      // Listen for window resize
      const handleResize = () => {
        const nowMobile = window.innerWidth < LG_BREAKPOINT;
        setIsMobile(nowMobile);
        // Close mobile drawer when resizing to desktop
        if (!nowMobile) {
          setMobileOpen(false);
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

    window.addEventListener(STORAGE_EVENT, handleStorageChange);
    return () => {
      window.removeEventListener(STORAGE_EVENT, handleStorageChange);
    };
  }, []);

  // Toggle for desktop (collapsed/expanded)
  const toggle = useCallback(() => {
    if (typeof window !== "undefined") {
      if (isMobile) {
        // On mobile, toggle drawer open/closed
        setMobileOpen((prev) => !prev);
      } else {
        // On desktop, toggle collapsed state
        setCollapsed((prev) => {
          const newState = !prev;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
          return newState;
        });
        broadcastChange();
      }
    }
  }, [isMobile]);

  // Close mobile drawer
  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return {
    collapsed,
    mobileOpen,
    isMobile,
    toggle,
    closeMobile,
    isLoaded,
  };
}

