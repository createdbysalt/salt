"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

const STORAGE_KEY = "salt-sidebar-collapsed";
const RIGHT_SIDEBAR_STORAGE_KEY = "salt-right-sidebar-open";
const LG_BREAKPOINT = 1024; // Tailwind's lg breakpoint
const XL_BREAKPOINT = 1280; // Tailwind's xl breakpoint

interface SidebarContextValue {
  collapsed: boolean;
  mobileOpen: boolean;
  isMobile: boolean;
  isXl: boolean; // Whether viewport is xl+ (1280px+)
  isLoaded: boolean;
  toggle: () => void;
  closeMobile: () => void;
  // Right sidebar
  rightSidebarOpen: boolean;
  toggleRightSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isXl, setIsXl] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  // Load from localStorage on mount, detect mobile and xl breakpoints
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mobile = window.innerWidth < LG_BREAKPOINT;
      const xl = window.innerWidth >= XL_BREAKPOINT;
      setIsMobile(mobile);
      setIsXl(xl);

      // Load collapsed preference for desktop
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          setCollapsed(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse sidebar state:", e);
        }
      }

      // Load right sidebar preference
      const rightStored = localStorage.getItem(RIGHT_SIDEBAR_STORAGE_KEY);
      if (rightStored) {
        try {
          setRightSidebarOpen(JSON.parse(rightStored));
        } catch (e) {
          console.error("Failed to parse right sidebar state:", e);
        }
      }

      setIsLoaded(true);

      // Listen for window resize
      const handleResize = () => {
        const nowMobile = window.innerWidth < LG_BREAKPOINT;
        const nowXl = window.innerWidth >= XL_BREAKPOINT;
        setIsMobile(nowMobile);
        setIsXl(nowXl);
        // Close mobile drawer when resizing to desktop
        if (!nowMobile) {
          setMobileOpen(false);
        }
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // Toggle for desktop (collapsed/expanded) or mobile (open/closed)
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
      }
    }
  }, [isMobile]);

  // Close mobile drawer
  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  // Toggle right sidebar
  const toggleRightSidebar = useCallback(() => {
    if (typeof window !== "undefined") {
      setRightSidebarOpen((prev) => {
        const newState = !prev;
        localStorage.setItem(RIGHT_SIDEBAR_STORAGE_KEY, JSON.stringify(newState));
        return newState;
      });
    }
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        mobileOpen,
        isMobile,
        isXl,
        isLoaded,
        toggle,
        closeMobile,
        rightSidebarOpen,
        toggleRightSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
