"use client";

import * as React from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/app/_components/ui/command";
import {
  LayoutDashboard,
  Users,
  Settings,
  HelpCircle,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { hqRoutes, memoryRoutes, settingsRoutes } from "../routes";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Global command palette (Cmd+K)
 * Provides quick navigation and actions
 */
export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();

  const runCommand = React.useCallback(
    (command: () => void) => {
      onOpenChange(false);
      command();
    },
    [onOpenChange]
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() => runCommand(() => router.push(hqRoutes.home))}
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>HQ</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push(memoryRoutes.people.list))}
          >
            <Users className="mr-2 h-4 w-4" />
            <span>People</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push(settingsRoutes.home))}
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => runCommand(() => router.push(memoryRoutes.people.list))}
          >
            <Plus className="mr-2 h-4 w-4" />
            <span>Add person</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Other">
          <CommandItem
            onSelect={() => runCommand(() => {
              window.location.href = "mailto:support@usesalt.io";
            })}
          >
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>Help & Support</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

/**
 * Command palette provider that handles global Cmd+K shortcut
 */
export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  // NOTE: Legacy CommandPalette removed to fix hydration mismatch.
  // UnifiedCommandPalette is now the only command palette.
  // This provider is kept for backwards compatibility with existing imports.
  return <>{children}</>;
}
