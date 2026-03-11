"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, Checkbox } from "@repo/ui";
import { cn } from "@repo/utils";

type LifecycleStage = "lead" | "discovery" | "pitch" | "active" | "complete" | "on_hold" | "lost";

const STAGE_CONFIG: Record<LifecycleStage, { label: string; dotClass: string }> = {
  lead: { label: "Lead", dotClass: "bg-muted-foreground" },
  discovery: { label: "Discovery", dotClass: "bg-muted-foreground" },
  pitch: { label: "Pitch", dotClass: "bg-amber-500" },
  active: { label: "Client", dotClass: "bg-blue-500" },
  complete: { label: "Complete", dotClass: "bg-green-500" },
  on_hold: { label: "On Hold", dotClass: "bg-amber-500" },
  lost: { label: "Lost", dotClass: "bg-red-500" },
};

interface ClientForGrid {
  id: string;
  name: string;
  contactEmail: string | null;
  company?: { id: string; name: string } | null;
  lifecycleStage?: LifecycleStage;
  ltv?: number;
}

interface ClientsGridViewProps {
  clients: ClientForGrid[];
  rowSelection?: Record<string, boolean>;
  onRowSelectionChange?: (selection: Record<string, boolean>) => void;
}

export function ClientsGridView({
  clients,
  rowSelection = {},
  onRowSelectionChange,
}: ClientsGridViewProps) {
  const handleSelect = (id: string) => {
    if (onRowSelectionChange) {
      onRowSelectionChange({
        ...rowSelection,
        [id]: !rowSelection[id],
      });
    }
  };

  if (clients.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No clients found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {clients.map((client) => {
        const stage = (client.lifecycleStage || "lead") as LifecycleStage;
        const stageConfig = STAGE_CONFIG[stage] || STAGE_CONFIG.lead;
        const subtitle = client.company?.name || client.contactEmail;
        const isSelected = rowSelection[client.id] || false;

        return (
          <div
            key={client.id}
            className={cn(
              "group relative rounded-lg border border-border p-4 hover:bg-muted/30 transition-colors",
              isSelected && "ring-2 ring-primary"
            )}
          >
            <Link href={`/studio/clients/${client.id}`} className="block">
              {/* Top: Checkbox + Avatar + Name + Company */}
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => handleSelect(client.id)}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="size-4 mt-3"
                />
                <Avatar className="size-10 shrink-0">
                  <AvatarFallback className="bg-muted text-sm font-medium">
                    {client.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{client.name}</p>
                  {subtitle && (
                    <p className="text-xs text-muted-foreground truncate mt-1">{subtitle}</p>
                  )}
                </div>
              </div>

              {/* Bottom: Stage + LTV */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={cn("size-2 rounded-full", stageConfig.dotClass)} />
                  <span>{stageConfig.label}</span>
                </div>
                {client.ltv != null && client.ltv > 0 ? (
                  <span className="text-sm font-medium">
                    ${client.ltv.toLocaleString()}
                  </span>
                ) : null}
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
