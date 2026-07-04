"use client";

import { useEffect, useRef } from "react";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  ArrowUpRight,
  User,
  FolderKanban,
  Trash2,
} from "lucide-react";
import { cn } from "@repo/utils";
import type { InboxItem } from "../types";

interface InboxContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  item: InboxItem | null;
  onClose: () => void;
  onMarkDone: (id: string) => void;
  onSnooze: (id: string) => void;
  onOpen: (item: InboxItem) => void;
  onOpenNewTab: (item: InboxItem) => void;
  onGoToClient: (clientId: string) => void;
  onGoToProject: (projectId: string) => void;
  onDelete: (id: string) => void;
}

interface MenuItemProps {
  icon: typeof CheckCircle2;
  label: string;
  shortcut?: string;
  variant?: "default" | "destructive";
  disabled?: boolean;
  onClick: () => void;
}

function MenuItem({
  icon: Icon,
  label,
  shortcut,
  variant = "default",
  disabled = false,
  onClick,
}: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl",
        "text-sm transition-colors duration-[100ms]",
        variant === "destructive"
          ? "text-destructive hover:bg-destructive/10 focus:bg-destructive/10"
          : "hover:bg-accent focus:bg-accent",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="flex items-center gap-2.5">
        <Icon className="size-4" />
        <span>{label}</span>
      </div>
      {shortcut && (
        <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}

/**
 * InboxContextMenu - Right-click context menu
 *
 * Actions:
 * - Mark as done (E)
 * - Snooze... (H)
 * - Open (Enter)
 * - Open in new tab (⌘Enter)
 * - Go to client (G C)
 * - Go to project (G P)
 * - Delete (⌫)
 */
export function InboxContextMenu({
  isOpen,
  position,
  item,
  onClose,
  onMarkDone,
  onSnooze,
  onOpen,
  onOpenNewTab,
  onGoToClient,
  onGoToProject,
  onDelete,
}: InboxContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Handle keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen || !item) return;

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        case "e":
        case "E":
          e.preventDefault();
          onMarkDone(item.id);
          onClose();
          break;
        case "h":
        case "H":
          e.preventDefault();
          onSnooze(item.id);
          onClose();
          break;
        case "Enter":
          e.preventDefault();
          if (e.metaKey || e.ctrlKey) {
            onOpenNewTab(item);
          } else {
            onOpen(item);
          }
          onClose();
          break;
        case "Backspace":
        case "Delete":
          e.preventDefault();
          onDelete(item.id);
          onClose();
          break;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, item, onClose, onMarkDone, onSnooze, onOpen, onOpenNewTab, onDelete]);

  if (!isOpen || !item) return null;

  // Calculate position (ensure menu stays in viewport)
  const style: React.CSSProperties = {
    position: "fixed",
    top: Math.min(position.y, window.innerHeight - 350),
    left: Math.min(position.x, window.innerWidth - 220),
    zIndex: 100,
  };

  return (
    <div
      ref={menuRef}
      style={style}
      className={cn(
        "w-56 rounded-2xl bg-popover text-popover-foreground p-1",
        "shadow-2xl ring-1 ring-foreground/5",
        "animate-in fade-in-0 zoom-in-95 duration-100"
      )}
    >
      {/* Primary Actions */}
      <MenuItem
        icon={CheckCircle2}
        label="Mark as done"
        shortcut="E"
        onClick={() => {
          onMarkDone(item.id);
          onClose();
        }}
      />
      <MenuItem
        icon={Clock}
        label="Snooze..."
        shortcut="H"
        onClick={() => {
          onSnooze(item.id);
          onClose();
        }}
      />

      {/* Separator */}
      <div className="h-px bg-border/50 my-1 -mx-1" />

      {/* Navigation */}
      <MenuItem
        icon={ArrowUpRight}
        label="Open"
        shortcut="↵"
        onClick={() => {
          onOpen(item);
          onClose();
        }}
      />
      <MenuItem
        icon={ExternalLink}
        label="Open in new tab"
        shortcut="⌘↵"
        onClick={() => {
          onOpenNewTab(item);
          onClose();
        }}
      />

      {/* Separator */}
      <div className="h-px bg-border/50 my-1 -mx-1" />

      {/* Context Navigation */}
      <MenuItem
        icon={User}
        label="Go to person"
        shortcut="G C"
        disabled={!item.person_id}
        onClick={() => {
          if (item.person_id) {
            onGoToClient(item.person_id);
            onClose();
          }
        }}
      />
      <MenuItem
        icon={FolderKanban}
        label="Go to project"
        shortcut="G P"
        disabled={!item.project_id}
        onClick={() => {
          if (item.project_id) {
            onGoToProject(item.project_id);
            onClose();
          }
        }}
      />

      {/* Separator */}
      <div className="h-px bg-border/50 my-1 -mx-1" />

      {/* Destructive */}
      <MenuItem
        icon={Trash2}
        label="Delete"
        shortcut="⌫"
        variant="destructive"
        onClick={() => {
          onDelete(item.id);
          onClose();
        }}
      />
    </div>
  );
}
