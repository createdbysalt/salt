"use client";

import { useEffect, useState, useRef } from "react";
import { Moon, Sun, Monitor, Palette } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { Separator } from "@/app/_components/ui/separator";

type ThemeMode = "light" | "dark";
type UiContext = "dashboard" | "bridge";

interface PreviousState {
  classes: string[];
  dataUiContext: string | null;
}

export function StyleguideControls() {
  const [mode, setMode] = useState<ThemeMode>("dark");
  const [context, setContext] = useState<UiContext>("dashboard");
  const [previousState, setPreviousState] = useState<PreviousState | null>(null);

  // Capture initial state on mount
  useEffect(() => {
    const html = document.documentElement;
    const initialState = {
      classes: Array.from(html.classList),
      dataUiContext: html.dataset.uiContext || null,
    };

    setPreviousState(initialState);

    // Set initial state based on context
    applyTheme("dashboard", "dark");

    // Restore previous state on unmount
    return () => {
      const html = document.documentElement;
      html.className = initialState.classes.join(" ");
      if (initialState.dataUiContext) {
        html.dataset.uiContext = initialState.dataUiContext;
      } else {
        delete html.dataset.uiContext;
      }
    };
  }, []);

  const applyTheme = (newContext: UiContext, newMode: ThemeMode) => {
    const html = document.documentElement;
    
    // Apply context
    html.dataset.uiContext = newContext;
    
    // Apply mode
    if (newMode === "dark") {
      html.classList.add("dark");
      html.classList.remove("light");
    } else {
      html.classList.add("light");
      html.classList.remove("dark");
    }
  };

  const handleContextChange = (newContext: UiContext) => {
    setContext(newContext);
    
    // Auto-set mode based on context default (unless user explicitly changed it)
    const newMode = newContext === "bridge" ? "light" : "dark";
    setMode(newMode);
    applyTheme(newContext, newMode);
  };

  const handleModeChange = (newMode: ThemeMode) => {
    setMode(newMode);
    applyTheme(context, newMode);
  };

  const handleReset = () => {
    // Reset to context defaults
    const defaultMode = context === "bridge" ? "light" : "dark";
    setMode(defaultMode);
    applyTheme(context, defaultMode);
  };

  return (
    <div className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="text-xl font-semibold" role="heading" aria-level={1}>Core UI</div>
          <Separator orientation="vertical" className="h-6" />
          <span className="text-sm text-muted-foreground">
            Salt Core Design System
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Context Switcher */}
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <div className="flex rounded-md border border-border" role="group" aria-label="UI context">
              <Button
                size="sm"
                variant={context === "dashboard" ? "default" : "ghost"}
                onClick={() => handleContextChange("dashboard")}
                className="rounded-r-none border-r"
                aria-pressed={context === "dashboard"}
                aria-label="Switch to Dashboard context"
              >
                Dashboard
              </Button>
              <Button
                size="sm"
                variant={context === "bridge" ? "default" : "ghost"}
                onClick={() => handleContextChange("bridge")}
                className="rounded-l-none"
                aria-pressed={context === "bridge"}
                aria-label="Switch to Bridge context"
              >
                Bridge
              </Button>
            </div>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Mode Switcher */}
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <div className="flex rounded-md border border-border" role="group" aria-label="Color mode">
              <Button
                size="sm"
                variant={mode === "light" ? "default" : "ghost"}
                onClick={() => handleModeChange("light")}
                className="rounded-r-none border-r gap-2"
                aria-pressed={mode === "light"}
                aria-label="Switch to light mode"
              >
                <Sun className="h-4 w-4" aria-hidden="true" />
                Light
              </Button>
              <Button
                size="sm"
                variant={mode === "dark" ? "default" : "ghost"}
                onClick={() => handleModeChange("dark")}
                className="rounded-l-none gap-2"
                aria-pressed={mode === "dark"}
                aria-label="Switch to dark mode"
              >
                <Moon className="h-4 w-4" aria-hidden="true" />
                Dark
              </Button>
            </div>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Reset Button */}
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleReset}
            aria-label="Reset theme to context defaults"
          >
            Reset to defaults
          </Button>

          {/* Context Indicator */}
          <div className="text-xs text-muted-foreground" aria-live="polite" aria-atomic="true">
            Default: {context === "dashboard" ? "Dark" : "Light"}
          </div>
        </div>
      </div>
    </div>
  );
}

