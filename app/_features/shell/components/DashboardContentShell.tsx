"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AskSaltPanel } from "./AskSaltPanel";
import type { AskSaltContext, AskSaltMode } from "./AskSaltPanel";
import { useShellNavMobile } from "@/app/_lib/hooks/use-shell-nav-breakpoint";
import { ASK_SALT_PANEL_WIDTH_PX } from "../constants";
import { useDashboardShell } from "../contexts/DashboardShellContext";
import { SiteHeader } from "./SiteHeader";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

export function DashboardContentShell({ children }: { children: React.ReactNode }) {
  const dashboardShell = useDashboardShell();
  const isMobileNav = useShellNavMobile();
  const [askSaltOpen, setAskSaltOpen] = React.useState(false);
  const [askSaltFullscreen, setAskSaltFullscreen] = React.useState(false);
  const [askSaltMode, setAskSaltMode] = React.useState<AskSaltMode>("ask");
  const [askSaltPrompt, setAskSaltPrompt] = React.useState("");
  const [askSaltContext, setAskSaltContext] = React.useState<AskSaltContext | null>(null);
  const [askSaltAutoSubmit, setAskSaltAutoSubmit] = React.useState(false);

  const openAskSalt = React.useCallback(
    (detail?: {
      prompt?: string;
      mode?: AskSaltMode;
      context?: AskSaltContext | null;
      autoSubmit?: boolean;
    }) => {
      dashboardShell?.closeMobileMenu();
      setAskSaltPrompt(detail?.prompt ?? "");
      setAskSaltMode(detail?.mode ?? "ask");
      setAskSaltContext(detail?.context ?? null);
      setAskSaltAutoSubmit(Boolean(detail?.autoSubmit));
      setAskSaltOpen(true);
    },
    [dashboardShell]
  );

  React.useEffect(() => {
    const handleOpenAskSalt = (event: Event) => {
      const detail = (event as CustomEvent<{
        prompt?: string;
        mode?: AskSaltMode;
        context?: AskSaltContext | null;
        autoSubmit?: boolean;
      }>).detail;
      openAskSalt(detail);
    };

    const handleOpenCapture = (event: Event) => {
      const detail = (event as CustomEvent<{ prompt?: string }>).detail;
      openAskSalt({ prompt: detail?.prompt ?? "", mode: "capture" });
    };

    const handleCloseAskSalt = () => {
      setAskSaltOpen(false);
    };

    window.addEventListener("salt:open-ask-salt", handleOpenAskSalt);
    window.addEventListener("salt:open-capture", handleOpenCapture);
    window.addEventListener("salt:close-ask-salt", handleCloseAskSalt);
    return () => {
      window.removeEventListener("salt:open-ask-salt", handleOpenAskSalt);
      window.removeEventListener("salt:open-capture", handleOpenCapture);
      window.removeEventListener("salt:close-ask-salt", handleCloseAskSalt);
    };
  }, [openAskSalt]);

  React.useEffect(() => {
    if (!dashboardShell?.mobileMenuOpen) return;
    setAskSaltOpen(false);
  }, [dashboardShell?.mobileMenuOpen]);

  React.useEffect(() => {
    if (!askSaltOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAskSaltOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [askSaltOpen]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "p") {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) {
        return;
      }

      event.preventDefault();
      openAskSalt({ mode: "ask" });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openAskSalt]);

  React.useEffect(() => {
    if (!askSaltOpen) {
      setAskSaltFullscreen(false);
    }
  }, [askSaltOpen]);

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      <motion.div
        animate={{
          marginRight:
            askSaltOpen && !isMobileNav && !askSaltFullscreen ? ASK_SALT_PANEL_WIDTH_PX : 0,
        }}
        transition={{ duration: 0.4, ease: APPLE_EASE }}
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      >
        <SiteHeader askActive={askSaltOpen} onAskSaltOpenChange={setAskSaltOpen} />
        <div className="@container/main min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 lg:px-10 lg:py-8">
          {children}
        </div>
      </motion.div>

      <AnimatePresence>
        {askSaltOpen && (
          <AskSaltPanel
            key="ask-salt-panel"
            open={askSaltOpen}
            mode={askSaltMode}
            initialPrompt={askSaltPrompt}
            context={askSaltContext}
            autoSubmit={askSaltAutoSubmit}
            onOpenChange={setAskSaltOpen}
            onFullscreenChange={setAskSaltFullscreen}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
