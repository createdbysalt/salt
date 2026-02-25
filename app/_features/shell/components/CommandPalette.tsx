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
  FolderKanban,
  Settings,
  HelpCircle,
  Plus,
  TrendingUp,
  FileText,
  Search,
  Target,
  Briefcase,
  Rocket,
  Eye,
  ExternalLink,
  Palette,
  MessageSquare,
  Inbox,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useGlobalHotkeys } from "../hooks/useGlobalHotkeys";
import { useDashboardModeContext } from "../contexts/DashboardModeContext";
import { studioRoutes, strategyRoutes, serveRoutes } from "../routes";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Global command palette (Cmd+K)
 * Provides quick navigation, mode switching, and actions
 */
export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { setMode, activeMode } = useDashboardModeContext();

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

        {/* Mode Switching */}
        <CommandGroup heading="Switch Mode">
          <CommandItem
            onSelect={() => runCommand(() => { setMode("strategy"); router.push(strategyRoutes.home); })}
            className={activeMode === "strategy" ? "bg-accent" : ""}
          >
            <Target className="mr-2 h-4 w-4" />
            <span>Strategy Mode</span>
            <span className="ml-auto text-xs text-muted-foreground">⌘1</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => { setMode("studio"); router.push(studioRoutes.home); })}
            className={activeMode === "studio" ? "bg-accent" : ""}
          >
            <Briefcase className="mr-2 h-4 w-4" />
            <span>Studio Mode</span>
            <span className="ml-auto text-xs text-muted-foreground">⌘2</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => { setMode("serve"); router.push(serveRoutes.home); })}
            className={activeMode === "serve" ? "bg-accent" : ""}
          >
            <Rocket className="mr-2 h-4 w-4" />
            <span>Serve Mode</span>
            <span className="ml-auto text-xs text-muted-foreground">⌘3</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Serve Mode Commands - Only visible in Serve Mode */}
        {activeMode === "serve" && (
          <>
            <CommandGroup heading="Serve Actions">
              <CommandItem
                onSelect={() => runCommand(() => window.open("/portal-preview/generic", "_blank"))}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                <span>Preview Portal</span>
                <span className="ml-auto text-xs text-muted-foreground">P</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push(serveRoutes.bridge.settings))}
              >
                <Palette className="mr-2 h-4 w-4" />
                <span>Edit Branding</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push(serveRoutes.bridge.requests))}
              >
                <Inbox className="mr-2 h-4 w-4" />
                <span>View Client Requests</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push(serveRoutes.bridge.messages))}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                <span>View Messages</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push(studioRoutes.clients.list))}
              >
                <Users className="mr-2 h-4 w-4" />
                <span>Switch Client</span>
                <span className="ml-auto text-xs text-muted-foreground">1-9</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() => runCommand(() => router.push(studioRoutes.home))}
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Overview</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push(studioRoutes.projects.list))}
          >
            <FolderKanban className="mr-2 h-4 w-4" />
            <span>Projects</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push(studioRoutes.clients.list))}
          >
            <Users className="mr-2 h-4 w-4" />
            <span>Clients</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push(studioRoutes.settings.home))}
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
            <span className="ml-auto text-xs text-muted-foreground">Coming Soon</span>
          </CommandItem>
          <CommandItem disabled>
            <LayoutDashboard className="mr-2 h-4 w-4 opacity-50" />
            <span className="opacity-50">Intelligence Library</span>
            <span className="ml-auto text-xs text-muted-foreground">Coming Soon</span>
          </CommandItem>
          <CommandItem disabled>
            <FileText className="mr-2 h-4 w-4 opacity-50" />
            <span className="opacity-50">Strategic Reports</span>
            <span className="ml-auto text-xs text-muted-foreground">Coming Soon</span>
          </CommandItem>
          <CommandItem disabled>
            <Search className="mr-2 h-4 w-4 opacity-50" />
            <span className="opacity-50">Technical Audits</span>
            <span className="ml-auto text-xs text-muted-foreground">Coming Soon</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => runCommand(() => router.push(studioRoutes.projects.new))}
          >
            <Plus className="mr-2 h-4 w-4" />
            <span>Create New Project</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push(studioRoutes.clients.new))}
          >
            <Plus className="mr-2 h-4 w-4" />
            <span>Onboard New Client</span>
          </CommandItem>
          <CommandItem disabled>
            <TrendingUp className="mr-2 h-4 w-4 opacity-50" />
            <span className="opacity-50">Generate Intelligence Report</span>
            <span className="ml-auto text-xs text-muted-foreground">Coming Soon</span>
          </CommandItem>
          <CommandItem disabled>
            <Search className="mr-2 h-4 w-4 opacity-50" />
            <span className="opacity-50">Run Performance Audit</span>
            <span className="ml-auto text-xs text-muted-foreground">Coming Soon</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Other">
          <CommandItem
            onSelect={() => runCommand(() => router.push(studioRoutes.support))}
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
