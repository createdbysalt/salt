"use client";

import * as React from "react";
import { cn } from "@repo/utils";
import { AskSaltPanel, type AskSaltMode } from "./AskSaltPanel";
import { SiteHeader } from "./SiteHeader";

export function DashboardContentShell({ children }: { children: React.ReactNode }) {
  const [askSaltOpen, setAskSaltOpen] = React.useState(false);
  const [askSaltMode, setAskSaltMode] = React.useState<AskSaltMode>("ask");
  const [askSaltPrompt, setAskSaltPrompt] = React.useState("");
  const [askSaltAutoSubmit, setAskSaltAutoSubmit] = React.useState(false);

  React.useEffect(() => {
    const handleOpenAskSalt = (event: Event) => {
      const detail = (event as CustomEvent<{
        prompt?: string;
        mode?: AskSaltMode;
        autoSubmit?: boolean;
      }>).detail;

      setAskSaltPrompt(detail?.prompt ?? "");
      setAskSaltMode(detail?.mode ?? "ask");
      setAskSaltAutoSubmit(Boolean(detail?.autoSubmit));
      setAskSaltOpen(true);
    };

    const handleOpenCapture = (event: Event) => {
      const detail = (event as CustomEvent<{ prompt?: string }>).detail;
      setAskSaltPrompt(detail?.prompt ?? "");
      setAskSaltMode("capture");
      setAskSaltAutoSubmit(false);
      setAskSaltOpen(true);
    };

    window.addEventListener("salt:open-ask-salt", handleOpenAskSalt);
    window.addEventListener("salt:open-capture", handleOpenCapture);
    return () => {
      window.removeEventListener("salt:open-ask-salt", handleOpenAskSalt);
      window.removeEventListener("salt:open-capture", handleOpenCapture);
    };
  }, []);

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
      setAskSaltPrompt("");
      setAskSaltMode("ask");
      setAskSaltAutoSubmit(false);
      setAskSaltOpen(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden transition-[width] duration-200",
          askSaltOpen && "bg-background"
        )}
      >
        <SiteHeader />
        <div className="@container/main min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      </div>
      <AskSaltPanel
        open={askSaltOpen}
        mode={askSaltMode}
        initialPrompt={askSaltPrompt}
        autoSubmit={askSaltAutoSubmit}
        onOpenChange={setAskSaltOpen}
      />
    </div>
  );
}
