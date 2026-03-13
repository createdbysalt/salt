"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronsUpDown,
  Check,
  User,
  ExternalLink,
  Smartphone,
  Tablet,
  Monitor,
  RefreshCw,
} from "lucide-react";
import {
  SidebarTrigger,
  Separator,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui";
import { cn } from "@repo/utils";
import { useServeClientSafe } from "@/app/_features/shell/hooks/useServeClient";
import { studioRoutes } from "@/app/_features/shell/routes";
import type { DeviceMode } from "./BridgePreviewShell";

interface ServeHeaderProps {
  title: string;
  /** For Bridge Preview page - show device controls */
  showPreviewControls?: boolean;
  deviceMode?: DeviceMode;
  onDeviceModeChange?: (mode: DeviceMode) => void;
  onRefresh?: () => void;
  onOpenNewTab?: () => void;
}

export function ServeHeader({
  title,
  showPreviewControls,
  deviceMode = "desktop",
  onDeviceModeChange,
  onRefresh,
  onOpenNewTab,
}: ServeHeaderProps) {
  const { selectedClient, setSelectedClient, clients, isLoaded } =
    useServeClientSafe();
  const [open, setOpen] = useState(false);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b">
      <div className="flex w-full items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 !h-4 !self-center" />

        {/* Client Selector */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="h-8 gap-2 px-3 text-sm font-medium"
            >
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                {isLoaded ? selectedClient?.name || "All Clients" : "Loading..."}
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search clients..." />
              <CommandList>
                <CommandEmpty>
                  <div className="py-4 text-center text-sm">
                    <p className="text-muted-foreground">No clients found</p>
                    <Link
                      href={studioRoutes.clients.new}
                      className="text-primary hover:underline mt-1 inline-block"
                    >
                      Create a client
                    </Link>
                  </div>
                </CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="all-clients"
                    onSelect={() => {
                      setSelectedClient(null);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Check
                      className={cn(
                        "h-4 w-4",
                        !selectedClient ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1">
                      <p className="font-medium">All Clients</p>
                      <p className="text-xs text-muted-foreground">
                        View all client data
                      </p>
                    </div>
                  </CommandItem>
                </CommandGroup>
                {clients.length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading="Clients">
                      {clients.map((client) => (
                        <CommandItem
                          key={client.id}
                          value={client.name}
                          onSelect={() => {
                            setSelectedClient(client);
                            setOpen(false);
                          }}
                          className="flex items-center gap-2"
                        >
                          <Check
                            className={cn(
                              "h-4 w-4",
                              selectedClient?.id === client.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="truncate">{client.name}</p>
                            {client.contactEmail && (
                              <p className="text-xs text-muted-foreground truncate">
                                {client.contactEmail}
                              </p>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value="view-all-clients"
                    onSelect={() => {
                      window.location.href = studioRoutes.clients.list;
                    }}
                    className="text-muted-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>View all clients</span>
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Preview Controls */}
        {showPreviewControls && (
          <>
            {/* Centered device toggles */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={deviceMode === "desktop" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onDeviceModeChange?.("desktop")}
                  >
                    <Monitor className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Desktop</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={deviceMode === "tablet" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onDeviceModeChange?.("tablet")}
                  >
                    <Tablet className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Tablet</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={deviceMode === "mobile" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onDeviceModeChange?.("mobile")}
                  >
                    <Smartphone className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Mobile</TooltipContent>
              </Tooltip>
            </div>

            {/* Actions - far right */}
            <div className="ml-auto flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={onOpenNewTab}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open in new tab</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={onRefresh}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh</TooltipContent>
              </Tooltip>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
