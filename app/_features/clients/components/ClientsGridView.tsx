"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@repo/ui";
import { cn } from "@repo/utils";
import {
  Circle,
  CircleDot,
  Zap,
  CheckCircle2,
  PauseCircle,
  XCircle,
} from "lucide-react";

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
}

export function ClientsGridView({ clients }: ClientsGridViewProps) {
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

        return (
          <Link
            key={client.id}
            href={`/studio/clients/${client.id}`}
            className="group block rounded-lg border bg-card p-5 hover:bg-muted/50 transition-colors"
          >
            {/* Top: Avatar + Name + Company */}
            <div className="flex items-start gap-3">
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
            <div className="flex items-center justify-between mt-5 pt-4 border-t border-border/50">
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
        );
      })}
    </div>
  );
}
