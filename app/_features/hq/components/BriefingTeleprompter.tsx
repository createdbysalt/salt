"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Pause, Play, X } from "lucide-react";
import { Button } from "@repo/ui";
import { cn } from "@repo/utils";
import { useAudioAnalyser } from "../hooks/useAudioAnalyser";
import { useHqSideRailAnchor } from "../hooks/useHqSideRailAnchor";
import {
  getActiveSectionIndex,
  splitScriptSections,
} from "../utils/briefing-section-sync";
import { BriefingVoiceOrb } from "./BriefingVoiceOrb";

type Props = {
  isOpen: boolean;
  script: string;
  durationSeconds: number;
  currentSeconds: number;
  audioElement: HTMLAudioElement | null;
  isPaused: boolean;
  onTogglePause: () => void;
  onClose: () => void;
};

function ListeningIndicator({ active }: { active: boolean }) {
  return (
    <span className="flex items-center gap-1" aria-hidden>
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="size-1 rounded-full bg-foreground/40"
          animate={
            active
              ? { opacity: [0.35, 1, 0.35], scale: [0.85, 1.15, 0.85] }
              : { opacity: 0.35, scale: 1 }
          }
          transition={{
            duration: 1.1,
            repeat: active ? Infinity : 0,
            delay: index * 0.18,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  );
}

function SectionHighlightedScript({
  script,
  currentSeconds,
  durationSeconds,
}: {
  script: string;
  currentSeconds: number;
  durationSeconds: number;
}) {
  const sections = useMemo(() => splitScriptSections(script), [script]);
  const progress =
    durationSeconds > 0 ? Math.min(1, currentSeconds / durationSeconds) : 0;
  const activeIndex = getActiveSectionIndex(sections, progress);

  return (
    <div className="space-y-2.5">
      {sections.map((section, index) => {
        const isActive = index === activeIndex;

        return (
          <p
            key={`${section.text}-${index}`}
            className={cn(
              "text-[15px] leading-[1.65] text-foreground transition-[font-weight] duration-500 ease-out",
              isActive && "font-medium",
            )}
          >
            {section.text}
          </p>
        );
      })}
    </div>
  );
}

export function BriefingTeleprompter({
  isOpen,
  script,
  durationSeconds,
  currentSeconds,
  audioElement,
  isPaused,
  onTogglePause,
  onClose,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const { level } = useAudioAnalyser(audioElement, isOpen && !isPaused);
  const sideRailAnchor = useHqSideRailAnchor(isOpen);
  const progress =
    durationSeconds > 0 ? Math.min(1, currentSeconds / durationSeconds) : 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "fixed bottom-6 z-50",
            sideRailAnchor ? null : "left-4 right-4 lg:right-10 lg:w-[360px] lg:left-auto",
          )}
          style={
            sideRailAnchor
              ? {
                  left: sideRailAnchor.left,
                  width: sideRailAnchor.width,
                }
              : undefined
          }
        >
          <div className="animate-rise overflow-hidden rounded-[28px] border border-border/70 bg-card shadow-2xl">
            <div className="flex items-center gap-3 border-b border-border/50 bg-card px-4 py-3">
              <BriefingVoiceOrb
                level={level}
                isPaused={isPaused}
                isActive={isOpen}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  Today&apos;s Briefing
                </p>
                <div className="mt-0.5 flex items-center gap-2">
                  <ListeningIndicator active={!isPaused} />
                  <span className="text-xs text-muted-foreground">
                    {isPaused ? "Paused" : "Speaking"}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onTogglePause}
                aria-label={isPaused ? "Resume briefing" : "Pause briefing"}
                className="h-8 shrink-0 gap-1.5 rounded-full px-3 text-xs font-medium"
              >
                {isPaused ? (
                  <Play className="size-3.5 fill-current" strokeWidth={0} />
                ) : (
                  <Pause className="size-3.5 fill-current" strokeWidth={0} />
                )}
                {isPaused ? "Resume" : "Pause"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Close briefing"
                className="size-8 shrink-0 rounded-full text-muted-foreground"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="max-h-[30vh] overflow-y-auto bg-card px-5 py-4">
              <SectionHighlightedScript
                script={script}
                currentSeconds={currentSeconds}
                durationSeconds={durationSeconds}
              />
            </div>

            <div className="h-px w-full bg-border/60">
              <motion.div
                className="h-full bg-foreground/25"
                initial={false}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.25, ease: "linear" }}
              />
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
