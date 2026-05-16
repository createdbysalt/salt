"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Sparkles,
  Search,
  Users,
  FolderKanban,
  Settings,
  Home,
  Zap,
  Mail,
  Plus,
  ArrowRight,
  CornerDownLeft,
  Loader2,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/app/_components/ui/command";
import { cn } from "@repo/utils";

type Mode = "search" | "ai";

const HIDDEN_PATHS = ["/signin", "/signout"];

// Navigation items
const NAVIGATION = [
  { icon: Home, label: "HQ", href: "/hq", shortcut: "G H" },
  { icon: Zap, label: "Plays", href: "/plays", shortcut: "G P" },
  { icon: Mail, label: "Messages", href: "/messages", shortcut: "G M" },
  { icon: Users, label: "People", href: "/people", shortcut: "G U" },
  { icon: FolderKanban, label: "Work", href: "/work", shortcut: "G W" },
  { icon: Settings, label: "Settings", href: "/settings", shortcut: "G S" },
];

// Quick actions
const ACTIONS = [
  { icon: Plus, label: "New person", href: "/people/new" },
  { icon: Plus, label: "New project", href: "/work/new" },
  { icon: Sparkles, label: "Quick capture", href: "/capture" },
];

// AI examples
const AI_EXAMPLES = [
  "Draft a check-in for everyone quiet 30+ days",
  "Generate an invoice for Beta Inc for $3,500 Q2 work",
  "Schedule a 30-min sync with Mike next Tuesday",
  "Write a project update for Acme",
];

export function UnifiedCommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<Mode>("search");
  const [aiInput, setAiInput] = React.useState("");
  const [aiLoading, setAiLoading] = React.useState(false);
  const aiInputRef = React.useRef<HTMLTextAreaElement>(null);

  const shouldHide = HIDDEN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  // ⌘K hotkey + Tab to toggle modes
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.key.toLowerCase() === "k" && !e.shiftKey) {
        e.preventDefault();
        if (!shouldHide) {
          setOpen((o) => !o);
        }
      }

      if (e.key === "Escape" && open) {
        setOpen(false);
      }

      // Tab to toggle between search and AI modes
      if (e.key === "Tab" && open && !e.shiftKey) {
        e.preventDefault();
        setMode((m) => (m === "search" ? "ai" : "search"));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, shouldHide]);

  // Reset on close
  React.useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setMode("search");
        setAiInput("");
        setAiLoading(false);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Focus AI input when switching to AI mode
  React.useEffect(() => {
    if (mode === "ai" && open) {
      setTimeout(() => aiInputRef.current?.focus(), 50);
    }
  }, [mode, open]);

  const runCommand = React.useCallback(
    (command: () => void) => {
      setOpen(false);
      command();
    },
    []
  );

  const handleAiSubmit = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    // Demo: just close after a moment
    await new Promise((r) => setTimeout(r, 1500));
    setAiLoading(false);
    setOpen(false);
  };

  const toggleMode = () => {
    setMode((m) => (m === "search" ? "ai" : "search"));
  };

  if (shouldHide) return null;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      {mode === "search" ? (
        <>
          <CommandInput placeholder="Search or jump to..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>

            {/* Navigation */}
            <CommandGroup heading="Navigation">
              {NAVIGATION.map((item) => (
                <CommandItem
                  key={item.href}
                  onSelect={() => runCommand(() => router.push(item.href))}
                >
                  <item.icon className="mr-2 size-4" strokeWidth={1.5} />
                  <span>{item.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground font-mono">
                    {item.shortcut}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            {/* Actions */}
            <CommandGroup heading="Actions">
              {ACTIONS.map((item) => (
                <CommandItem
                  key={item.label}
                  onSelect={() => runCommand(() => router.push(item.href))}
                >
                  <item.icon className="mr-2 size-4" strokeWidth={1.5} />
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            {/* AI Mode Toggle */}
            <CommandGroup heading="AI">
              <CommandItem onSelect={toggleMode}>
                <Sparkles className="mr-2 size-4 text-accent" strokeWidth={1.5} />
                <span>Ask SALT anything...</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  Tab
                </span>
              </CommandItem>
            </CommandGroup>
          </CommandList>

          {/* Footer */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-border/60 text-[10px] text-muted-foreground">
            <span>↑↓ navigate · ↵ select · esc close</span>
            <button
              type="button"
              onClick={toggleMode}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-muted transition-colors"
            >
              <Sparkles className="size-3 text-accent" />
              <span>Tab for AI</span>
            </button>
          </div>
        </>
      ) : (
        <>
          {/* AI Mode Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-accent" />
              <span className="text-sm font-medium">Ask SALT</span>
              <span className="text-xs text-muted-foreground">
                · tell it what you want
              </span>
            </div>
            <button
              type="button"
              onClick={toggleMode}
              className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"
            >
              <Search className="size-3" />
              <span>Tab for search</span>
            </button>
          </div>

          {/* AI Input */}
          <div className="px-4 py-4">
            <textarea
              ref={aiInputRef}
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="What should SALT do? — e.g., draft a check-in for everyone quiet 30+ days"
              rows={2}
              disabled={aiLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAiSubmit();
                }
              }}
              className={cn(
                "w-full resize-none bg-transparent border-0 px-0 py-0",
                "text-base leading-relaxed placeholder:text-muted-foreground/60",
                "focus:outline-none disabled:opacity-50"
              )}
            />
          </div>

          {/* Examples */}
          {!aiLoading && !aiInput && (
            <div className="px-4 pb-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70 mb-2">
                Examples
              </p>
              <div className="space-y-1">
                {AI_EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAiInput(ex)}
                    className={cn(
                      "w-full text-left flex items-center gap-2 px-2.5 py-1.5",
                      "text-xs text-foreground/80 hover:text-foreground hover:bg-muted/60 transition-colors",
                      "rounded group"
                    )}
                  >
                    <Sparkles className="size-3 text-muted-foreground/50 group-hover:text-accent transition-colors shrink-0" />
                    <span className="truncate">{ex}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading state */}
          {aiLoading && (
            <div className="px-4 pb-4 flex items-center gap-3">
              <div className="size-8 rounded-full bg-accent/10 flex items-center justify-center">
                <Loader2 className="size-4 text-accent animate-spin" />
              </div>
              <div>
                <p className="text-sm font-medium">Thinking…</p>
                <p className="text-xs text-muted-foreground">
                  Resolving entities, pulling context
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-border/60 bg-muted/20">
            <span className="text-[10px] text-muted-foreground/70 px-2">
              ↵ to send · Tab for search · esc close
            </span>
            <button
              type="button"
              onClick={handleAiSubmit}
              disabled={!aiInput.trim() || aiLoading}
              className={cn(
                "flex items-center gap-1.5 h-7 px-3 text-xs font-medium rounded",
                "bg-primary text-primary-foreground",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "hover:bg-primary/90 transition-colors"
              )}
            >
              <CornerDownLeft className="size-3" />
              Send
            </button>
          </div>
        </>
      )}
    </CommandDialog>
  );
}
