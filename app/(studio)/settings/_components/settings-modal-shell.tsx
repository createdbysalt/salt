import { cn } from "@repo/utils"

/** Frosted overlay — matches `.glass-card` blur/saturate in salt-design.css */
export const SETTINGS_MODAL_BACKDROP_CLASS = cn(
  "absolute inset-0 border-0 p-0",
  "bg-black/20",
  "supports-backdrop-filter:backdrop-blur-sm",
  "animate-in fade-in-0 duration-200"
)

export const SETTINGS_MODAL_SHELL_CLASS =
  "fixed inset-0 z-50 flex min-h-svh items-center justify-center overflow-hidden p-2 text-foreground sm:p-6"

export const SETTINGS_MODAL_PANEL_CLASS = cn(
  "relative z-10 grid h-[min(860px,calc(100svh-24px))] w-full max-w-5xl overflow-hidden",
  "rounded-3xl border border-border/70 bg-background",
  "shadow-[0_28px_90px_rgba(15,23,42,0.32)] md:grid-cols-[248px_minmax(0,1fr)]"
)
