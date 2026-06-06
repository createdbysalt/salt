"use client";

import {
  ArrowUp,
  Command,
  Paperclip,
  Mic,
  Pencil,
  Sparkles,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, type Ref } from "react";
import type { DemoChatSnapshot } from "../useWorkspaceDemoTimeline";
import { AskSaltDemoChat } from "./DemoAskSaltChat";

const SPRING = { type: "spring" as const, stiffness: 340, damping: 36, mass: 0.9 };
const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

export type AskSaltContext = {
  kind: "edit-play";
  playId: string;
  subject: string;
  recipient: string;
  player: string;
  suggestedPrompt: string;
};

type Props = {
  onClose: () => void;
  context?: AskSaltContext | null;
  layout?: "fixed" | "embedded" | "fullscreen";
  embeddedWidth?: number;
  demoText?: string;
  demoChat?: DemoChatSnapshot;
  sendRef?: Ref<HTMLButtonElement>;
};

export function AskSaltPanel({
  onClose,
  context,
  layout = "fixed",
  embeddedWidth = 420,
  demoText,
  demoChat,
  sendRef,
}: Props) {
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const isEmbeddedDemo = layout === "embedded";
  const isFullscreenDemo = layout === "fullscreen";
  const isCompactDemo = isEmbeddedDemo || isFullscreenDemo;
  const showDemoChat =
    demoChat?.messageSent ||
    demoChat?.showOnIt ||
    demoChat?.showIntegrationSteps ||
    demoChat?.showReadyToSend ||
    demoChat?.showSent ||
    demoChat?.showMemoryNote;

  useEffect(() => {
    const scroller = chatScrollRef.current;
    if (!scroller) return;
    scroller.scrollTop = scroller.scrollHeight;
  }, [
    demoText,
    demoChat?.messageSent,
    demoChat?.showOnIt,
    demoChat?.showIntegrationSteps,
    demoChat?.stripe,
    demoChat?.gmail,
    demoChat?.showReadyToSend,
    demoChat?.sendItSent,
    demoChat?.showSent,
    demoChat?.showMemoryNote,
  ]);

  return (
    <motion.aside
      initial={layout === "fullscreen" ? { y: "100%" } : { x: "100%" }}
      animate={layout === "fullscreen" ? { y: 0 } : { x: 0 }}
      exit={layout === "fullscreen" ? { y: "100%" } : { x: "100%" }}
      transition={SPRING}
      className={
        layout === "fullscreen"
          ? "absolute inset-0 z-40 flex h-full flex-col overflow-hidden bg-background"
          : layout === "embedded"
            ? "absolute inset-y-0 right-0 z-40 h-full overflow-hidden bg-background border-l border-border/60 flex flex-col"
            : "fixed top-0 right-0 z-40 h-screen w-full sm:w-[420px] bg-background border-l border-border/60 flex flex-col"
      }
      style={layout === "embedded" ? { width: embeddedWidth } : undefined}
    >
      <div className="sticky top-0 z-10 px-4 lg:px-5 py-3 lg:py-4 bg-background/75 backdrop-blur-xl border-b border-border/50">
        <div className="h-11 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="size-5 rounded-full surface-aurora grid place-items-center">
              <Sparkles className="size-3 text-white relative z-10" strokeWidth={2.5} />
            </span>
            <h2 className="font-semibold tracking-tight text-sm">Ask Salt</h2>
            <span className="flex items-center gap-0.5 rounded-md border border-border/60 bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              <Command className="size-2.5" /> P
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 grid place-items-center rounded-lg hover:bg-muted transition"
            aria-label="Close Ask Salt"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div
        ref={chatScrollRef}
        className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-6 ${isCompactDemo ? "pb-3" : "pb-40"}`}
      >
        {showDemoChat && demoChat && context ? (
          <div className="space-y-5">
            <EditPlayContextHero context={context} compact />
            <AskSaltDemoChat chat={demoChat} />
          </div>
        ) : (
          <p className="font-display text-xl tracking-tight mb-5">Hi Alex, how can I help?</p>
        )}
      </div>

      <div
        className={
          isCompactDemo
            ? "shrink-0 border-t border-border/50 bg-background px-3 pb-3 pt-2"
            : "pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-4 pt-10 bg-gradient-to-t from-background via-background/90 to-transparent"
        }
      >
        <div className="rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-lift)] focus-within:ring-4 focus-within:ring-foreground/5 focus-within:border-border transition">
          <textarea
            rows={isCompactDemo ? 2 : 3}
            readOnly
            value={demoText}
            className="w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          <div className="flex items-center justify-between px-2 pb-2">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                className="size-8 grid place-items-center rounded-lg hover:bg-muted transition"
                aria-label="Attach"
              >
                <Paperclip className="size-4 text-muted-foreground" />
              </button>
              <button
                type="button"
                className="size-8 grid place-items-center rounded-lg hover:bg-muted transition"
                aria-label="Voice"
              >
                <Mic className="size-4 text-muted-foreground" />
              </button>
            </div>
            <button
              ref={sendRef}
              type="button"
              className="size-8 grid place-items-center rounded-lg bg-foreground text-background hover:opacity-90 transition"
              aria-label="Send"
            >
              <ArrowUp className="size-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

function EditPlayContextHero({
  context,
  compact,
}: {
  context: AskSaltContext;
  compact?: boolean;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={context.playId}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.3, ease: APPLE_EASE }}
        className={compact ? "mb-3" : "mb-5"}
      >
        <div className={`rounded-2xl border border-border/60 bg-card/60 p-4 ${compact ? "" : "mt-4"}`}>
          <div className="flex items-start gap-3">
            <span className="size-8 rounded-xl surface-aurora grid place-items-center shrink-0">
              <Sparkles className="size-3.5 text-white relative z-10" strokeWidth={2.5} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground font-medium">
                {context.player} · to {context.recipient}
              </p>
              <p className="text-[13.5px] font-semibold tracking-tight leading-snug mt-0.5 truncate">
                {context.subject}
              </p>
            </div>
            {!compact && (
              <Pencil className="size-3.5 text-muted-foreground shrink-0" strokeWidth={2} />
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
