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
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CheckSquare,
  Settings,
  HelpCircle,
  Plus,
  CalendarDays,
  TrendingUp,
  FileText,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useGlobalHotkeys } from "../hooks/useGlobalHotkeys";

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
            onSelect={() => runCommand(() => router.push("/dashboard"))}
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Overview</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/dashboard/projects"))}
          >
            <FolderKanban className="mr-2 h-4 w-4" />
            <span>Projects</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/dashboard/clients"))}
          >
            <Users className="mr-2 h-4 w-4" />
            <span>Clients</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/dashboard/settings"))}
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Intelligence">
          <CommandItem disabled>
            <TrendingUp className="mr-2 h-4 w-4 opacity-50" />
            <span className="opacity-50">Intelligence Stream</span>
            <span className="ml-auto text-xs text-muted-foreground">🚧</span>
          </CommandItem>
          <CommandItem disabled>
            <LayoutDashboard className="mr-2 h-4 w-4 opacity-50" />
            <span className="opacity-50">Intelligence Library</span>
            <span className="ml-auto text-xs text-muted-foreground">🚧</span>
          </CommandItem>
          <CommandItem disabled>
            <FileText className="mr-2 h-4 w-4 opacity-50" />
            <span className="opacity-50">Strategic Reports</span>
            <span className="ml-auto text-xs text-muted-foreground">🚧</span>
          </CommandItem>
          <CommandItem disabled>
            <Search className="mr-2 h-4 w-4 opacity-50" />
            <span className="opacity-50">Technical Audits</span>
            <span className="ml-auto text-xs text-muted-foreground">🚧</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => runCommand(() => router.push("/dashboard/projects/new"))}
          >
            <Plus className="mr-2 h-4 w-4" />
            <span>Create New Project</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/dashboard/clients/new"))}
          >
            <Plus className="mr-2 h-4 w-4" />
            <span>Onboard New Client</span>
          </CommandItem>
          <CommandItem disabled>
            <TrendingUp className="mr-2 h-4 w-4 opacity-50" />
            <span className="opacity-50">Generate Intelligence Report</span>
            <span className="ml-auto text-xs text-muted-foreground">🚧</span>
          </CommandItem>
          <CommandItem disabled>
            <Search className="mr-2 h-4 w-4 opacity-50" />
            <span className="opacity-50">Run Performance Audit</span>
            <span className="ml-auto text-xs text-muted-foreground">🚧</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Other">
          <CommandItem
            onSelect={() => runCommand(() => router.push("/dashboard/support"))}
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
  const [open, setOpen] = React.useState(false);

  useGlobalHotkeys([
    {
      key: "k",
      metaKey: true,
      callback: () => setOpen((prev) => !prev),
    },
  ]);

  return (
    <>
      {children}
      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  );
}

