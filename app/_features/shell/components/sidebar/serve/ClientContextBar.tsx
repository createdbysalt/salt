"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronsUpDown, Check, User, ExternalLink } from "lucide-react";
import {
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
} from "@repo/ui";
import { cn } from "@repo/utils";
import { useServeClientSafe } from "../../../hooks/useServeClient";
import { studioRoutes } from "../../../routes";

interface ClientContextBarProps {
  collapsed?: boolean;
}

/**
 * ClientContextBar - Client selector for Serve mode
 *
 * Shows a combobox to select which client is active in Serve mode.
 * Appears in the sidebar above navigation.
 * Selection persists to localStorage.
 */
export function ClientContextBar({ collapsed = false }: ClientContextBarProps) {
  const { selectedClient, setSelectedClient, clients, isLoaded, fetchClients, isFetching } =
    useServeClientSafe();
  const [open, setOpen] = useState(false);

  // Lazy-load clients when this component mounts (only in Serve mode)
  useEffect(() => {
    if (isLoaded && clients.length === 0 && !isFetching) {
      fetchClients();
    }
  }, [isLoaded, clients.length, isFetching, fetchClients]);

  if (!isLoaded) {
    return (
      <div
        className={cn(
          "rounded-md bg-sidebar-accent/50 animate-pulse",
          collapsed ? "h-9 w-9 mx-auto" : "h-10 w-full"
        )}
      />
    );
  }

  if (collapsed) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 bg-sidebar-accent/50 hover:bg-sidebar-accent"
          >
            <User className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" side="right" align="start">
          <ClientCommandList
            clients={clients}
            selectedClient={selectedClient}
            onSelect={(client) => {
              setSelectedClient(client);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10 bg-sidebar-accent/50 hover:bg-sidebar-accent border-sidebar-border/50"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center justify-center shrink-0 h-6 w-6 rounded-md bg-muted text-foreground">
              <User className="h-3.5 w-3.5" />
            </div>
            <span className="truncate text-sm">
              {selectedClient ? selectedClient.name : "All Clients"}
            </span>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <ClientCommandList
          clients={clients}
          selectedClient={selectedClient}
          onSelect={(client) => {
            setSelectedClient(client);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

interface ServeClient {
  id: string;
  name: string;
  contactEmail: string | null;
}

function ClientCommandList({
  clients,
  selectedClient,
  onSelect,
}: {
  clients: ServeClient[];
  selectedClient: ServeClient | null;
  onSelect: (client: ServeClient | null) => void;
}) {
  return (
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
            onSelect={() => onSelect(null)}
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
              <p className="text-xs text-muted-foreground">View all client data</p>
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
                  onSelect={() => onSelect(client)}
                  className="flex items-center gap-2"
                >
                  <Check
                    className={cn(
                      "h-4 w-4",
                      selectedClient?.id === client.id ? "opacity-100" : "opacity-0"
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
  );
}
