"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Sparkles,
  Users,
  FolderKanban,
  Settings,
  Home,
  Play,
  MessageCircle,
  Plus,
  Layers,
  PenLine,
  Loader2,
} from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/app/_components/ui/command";
import { cn } from "@repo/utils";

const HIDDEN_PATHS = ["/signin", "/signout"];

// All commands in one flat list - navigation + actions unified
const COMMANDS = [
  // Navigation
  { type: "nav", icon: Home, label: "Go to HQ", keywords: "home dashboard", href: "/hq", shortcut: "G H" },
  { type: "nav", icon: MessageCircle, label: "Go to Convos", keywords: "messages conversations chat", href: "/conversations", shortcut: "G C" },
  { type: "nav", icon: Play, label: "Go to Plays", keywords: "actions tasks ai", href: "/plays", shortcut: "G P" },
  { type: "nav", icon: PenLine, label: "Go to Capture", keywords: "notes capture quick", href: "/capture", shortcut: "G N" },
  { type: "nav", icon: Users, label: "Go to People", keywords: "contacts clients users", href: "/people", shortcut: "G U" },
  { type: "nav", icon: FolderKanban, label: "Go to Work", keywords: "projects work", href: "/work", shortcut: "G W" },
  { type: "nav", icon: Layers, label: "Go to Teams", keywords: "teams groups", href: "/teams", shortcut: "G T" },
  { type: "nav", icon: Settings, label: "Go to Settings", keywords: "settings preferences config", href: "/settings", shortcut: "G S" },
  // Actions
  { type: "action", icon: Plus, label: "New person", keywords: "create add person contact", href: "/people/new" },
  { type: "action", icon: Plus, label: "New project", keywords: "create add project work", href: "/work/new" },
  { type: "action", icon: Plus, label: "Add capture", keywords: "add capture thought", href: "/capture" },
] as const;

// Detect if input looks like natural language (a request/question for AI)
function looksLikeNaturalLanguage(input: string): boolean {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.length < 3) return false;

  // Multiple words suggest natural language
  if (trimmed.split(/\s+/).length >= 3) return true;

  // Question words
  if (/^(what|how|why|when|where|who|can|could|would|should|draft|write|create|generate|schedule|send|make|find|show|list)\b/.test(trimmed)) {
    return true;
  }

  return false;
}

export function UnifiedCommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [aiLoading, setAiLoading] = React.useState(false);

  const shouldHide = HIDDEN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  // ⌘K hotkey
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
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shouldHide]);

  // Reset on close
  React.useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setSearch("");
        setAiLoading(false);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  const runCommand = React.useCallback(
    (command: () => void) => {
      setOpen(false);
      command();
    },
    []
  );

  const handleAskSalt = async () => {
    if (!search.trim()) return;
    setAiLoading(true);
    // Demo: simulate AI thinking then navigate to plays
    await new Promise((r) => setTimeout(r, 1200));
    setAiLoading(false);
    setOpen(false);
    // In real implementation, this would create a play/action
    router.push("/plays");
  };

  if (shouldHide) return null;

  const showAskSalt = search.trim().length > 0 && looksLikeNaturalLanguage(search);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command className="rounded-lg" shouldFilter={true}>
        <CommandInput
          placeholder="Type a command or ask SALT anything..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          {aiLoading ? (
            <div className="flex items-center gap-3 px-4 py-6">
              <div className="size-8 rounded-full bg-accent/10 flex items-center justify-center">
                <Loader2 className="size-4 text-accent animate-spin" />
              </div>
              <div>
                <p className="text-sm font-medium">SALT is thinking...</p>
                <p className="text-xs text-muted-foreground">
                  Creating your play
                </p>
              </div>
            </div>
          ) : (
            <>
              <CommandEmpty className="py-6 text-center">
                <p className="text-sm text-muted-foreground mb-3">No commands found</p>
                {search.trim() && (
                  <button
                    type="button"
                    onClick={handleAskSalt}
                    className={cn(
                      "inline-flex items-center gap-2 px-3 py-2 rounded-lg",
                      "bg-accent/10 hover:bg-accent/20 transition-colors",
                      "text-sm text-foreground"
                    )}
                  >
                    <Sparkles className="size-4 text-accent" />
                    Ask SALT: "{search}"
                  </button>
                )}
              </CommandEmpty>

              {/* Commands */}
              <CommandGroup>
                {COMMANDS.map((cmd) => (
                  <CommandItem
                    key={cmd.label}
                    value={`${cmd.label} ${cmd.keywords}`}
                    onSelect={() => runCommand(() => router.push(cmd.href))}
                    className="flex items-center gap-2"
                  >
                    <cmd.icon className="size-4 text-muted-foreground" strokeWidth={1.5} />
                    <span className="flex-1">{cmd.label}</span>
                    {"shortcut" in cmd && cmd.shortcut && (
                      <kbd className="ml-auto text-[10px] text-muted-foreground/70 font-mono tracking-wider">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>

              {/* Ask SALT - appears when input looks like natural language */}
              {showAskSalt && (
                <CommandGroup heading="AI">
                  <CommandItem
                    value={`ask salt ${search}`}
                    onSelect={handleAskSalt}
                    className="flex items-center gap-2"
                  >
                    <Sparkles className="size-4 text-accent" strokeWidth={1.5} />
                    <span className="flex-1">
                      Ask SALT: <span className="text-muted-foreground">"{search}"</span>
                    </span>
                    <kbd className="ml-auto text-[10px] text-muted-foreground/70 font-mono">
                      ↵
                    </kbd>
                  </CommandItem>
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>

        {/* Minimal footer */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-border/40 text-[10px] text-muted-foreground/60">
          <span>↑↓ navigate · ↵ select · esc close</span>
        </div>
      </Command>
    </CommandDialog>
  );
}
