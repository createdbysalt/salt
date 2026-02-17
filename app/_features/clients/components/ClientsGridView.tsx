"use client";

import Link from "next/link";
import { Badge } from "@/app/_components/ui/badge";
import { studioRoutes } from "@/app/_features/shell/routes";
import {
  Circle,
  CircleDot,
  Zap,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Folder,
  Mail,
  Phone,
  Building2,
  Calendar,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

type LifecycleStage = "lead" | "discovery" | "pitch" | "active" | "complete" | "on_hold" | "lost";

const STAGE_CONFIG: Record<LifecycleStage, { label: string; icon: React.ReactNode; className: string }> = {
  lead: {
    label: "Lead",
    icon: <Circle className="h-3 w-3" />,
    className: "text-muted-foreground",
  },
  discovery: {
    label: "Discovery",
    icon: <CircleDot className="h-3 w-3" />,
    className: "text-muted-foreground",
  },
  pitch: {
    label: "Pitch",
    icon: <Zap className="h-3 w-3" />,
    className: "text-warning",
  },
  active: {
    label: "Client",
    icon: <CircleDot className="h-3 w-3" />,
    className: "text-info",
  },
  complete: {
    label: "Complete",
    icon: <CheckCircle2 className="h-3 w-3" />,
    className: "text-success",
  },
  on_hold: {
    label: "On Hold",
    icon: <PauseCircle className="h-3 w-3" />,
    className: "text-warning",
  },
  lost: {
    label: "Lost",
    icon: <XCircle className="h-3 w-3" />,
    className: "text-destructive",
  },
};

interface ClientTag {
  id: string;
  label: string;
  color: string;
}

interface ClientForGrid {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  company?: { id: string; name: string } | null;
  lifecycleStage: LifecycleStage;
  stageEnteredAt?: string | null;
  mrr: number;
  projectCount: number;
  tags: ClientTag[];
  createdAt: string;
  lastContactAt?: string | null;
}

function getDaysInStage(stageEnteredAt?: string | null): number {
  if (!stageEnteredAt) return 0;
  const now = new Date();
  const entered = new Date(stageEnteredAt);
  if (isNaN(entered.getTime())) return 0;
  const diffTime = Math.abs(now.getTime() - entered.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

interface ClientsGridViewProps {
  clients: ClientForGrid[];
  enabledProperties?: string[];
}

// Default enabled properties for grid view
const GRID_DEFAULT_ENABLED = ["company", "stage", "projects", "mrr"];

export function ClientsGridView({
  clients,
  enabledProperties = GRID_DEFAULT_ENABLED,
}: ClientsGridViewProps) {
  const isEnabled = (prop: string) => enabledProperties.includes(prop);

  if (clients.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No clients found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {clients.map((client) => {
        const stage = client.lifecycleStage || "lead";
        // Handle both "active" and "client" values (migration compatibility)
        const normalizedStage = stage === "client" ? "active" : stage;
        const stageConfig = STAGE_CONFIG[normalizedStage as LifecycleStage] || STAGE_CONFIG.lead;

        return (
          <Link
            key={client.id}
            href={studioRoutes.clients.detail(client.id)}
            className="group block bg-card rounded-lg border border-border/50 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:border-border hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-150"
          >
            <div className="p-4 space-y-3">
              {/* Header: Name + Stage */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                    {client.name}
                  </h3>
                  {client.contactEmail && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {client.contactEmail}
                    </p>
                  )}
                </div>
                {isEnabled("stage") && (
                  <div className={`flex items-center gap-1 text-xs shrink-0 ${stageConfig.className}`}>
                    {stageConfig.icon}
                    <span>{stageConfig.label}</span>
                  </div>
                )}
              </div>

              {/* Company */}
              {isEnabled("company") && client.company && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  <span className="truncate">{client.company.name}</span>
                </div>
              )}

              {/* Tags */}
              {isEnabled("tags") && client.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {client.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag.id}
                      className="px-1.5 py-0.5 text-[10px] rounded-full"
                      style={{
                        backgroundColor: `${tag.color}20`,
                        color: tag.color,
                      }}
                    >
                      {tag.label}
                    </span>
                  ))}
                  {client.tags.length > 3 && (
                    <span className="text-[10px] text-muted-foreground px-1">
                      +{client.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Metrics Row */}
              {(isEnabled("projects") || isEnabled("mrr") || isEnabled("lastActivity") || isEnabled("stage")) && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {isEnabled("projects") && (
                    <div className="flex items-center gap-1">
                      <Folder className="h-3 w-3" />
                      <span>{client.projectCount}</span>
                    </div>
                  )}
                  {isEnabled("stage") && (
                    <span>
                      {(() => {
                        const days = getDaysInStage(client.stageEnteredAt);
                        return days === 0 ? "Today" : `${days}d in stage`;
                      })()}
                    </span>
                  )}
                  {isEnabled("mrr") && client.mrr > 0 && (
                    <span className="text-success">${client.mrr}/mo</span>
                  )}
                  {isEnabled("lastActivity") && client.lastContactAt && !isNaN(new Date(client.lastContactAt).getTime()) && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDistanceToNow(new Date(client.lastContactAt), { addSuffix: true })}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Contact Info */}
              {isEnabled("phone") && client.contactPhone && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{client.contactPhone}</span>
                </div>
              )}

              {/* Created Date */}
              {isEnabled("created") && (
                <div className="text-[10px] text-muted-foreground/70 pt-1 border-t border-border/30">
                  Added {format(new Date(client.createdAt), "MMM d, yyyy")}
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
