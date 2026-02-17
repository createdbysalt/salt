"use client";

import { useState, useEffect, useCallback } from "react";

export type PreviewDevice = "desktop" | "tablet" | "mobile";

export interface DeviceDimensions {
  width: number;
  height: number;
  label: string;
}

export const DEVICE_DIMENSIONS: Record<PreviewDevice, DeviceDimensions> = {
  desktop: { width: 1280, height: 800, label: "Desktop" },
  tablet: { width: 768, height: 1024, label: "Tablet" },
  mobile: { width: 375, height: 667, label: "Mobile" },
};

const STORAGE_KEY = "salt-serve-preview-device";

interface UsePreviewDeviceReturn {
  device: PreviewDevice;
  setDevice: (device: PreviewDevice) => void;
  dimensions: DeviceDimensions;
  isLoaded: boolean;
}

/**
 * Hook to manage preview device state
 * Persists to localStorage for session continuity
 */
export function usePreviewDevice(): UsePreviewDeviceReturn {
  const [device, setDeviceState] = useState<PreviewDevice>("desktop");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load persisted device on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && (stored === "desktop" || stored === "tablet" || stored === "mobile")) {
        setDeviceState(stored as PreviewDevice);
      }
    } catch (e) {
      console.error("Error loading preview device from localStorage:", e);
    }
    setIsLoaded(true);
  }, []);

  // Persist device changes
  const setDevice = useCallback((newDevice: PreviewDevice) => {
    setDeviceState(newDevice);
    try {
      localStorage.setItem(STORAGE_KEY, newDevice);
    } catch (e) {
      console.error("Error saving preview device to localStorage:", e);
    }
  }, []);

  return {
    device,
    setDevice,
    dimensions: DEVICE_DIMENSIONS[device],
    isLoaded,
  };
}
