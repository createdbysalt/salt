"use client";

import Link from "next/link";
import { Badge } from "@/app/_components/ui/badge";
import { Avatar, AvatarFallback } from "@/app/_components/ui/avatar";
import { Button } from "@/app/_components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/_components/ui/table";
import { ClientCell } from "./ClientCell";
import {
  MoreHorizontal,
  Mail,
  Trash2,
  Edit,
  ExternalLink,
  Circle,
  CircleDot,
  Zap,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Archive,
  RotateCcw,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { studioRoutes } from "@/app/_features/shell/routes";

interface ClientCompany {
  id: string;
  name: string;
}

interface ClientTag {
  id: string;
  label: string;
  color: string;
}

export type LifecycleStage = "lead" | "discovery" | "pitch" | "active" | "complete" | "on_hold" | "lost";

export interface ClientListItem {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  company: ClientCompany | null;
  status: "active" | "invited" | "inactive";
  createdAt: string;
  tags: ClientTag[];
  lifecycleStage?: LifecycleStage;
  stageEnteredAt?: string | null;
  mrr?: number;
  projectCount?: number;
  lastContactAt?: string | null;
  // Soft delete / archive fields
  archivedAt?: string | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

export type ClientTableViewMode = "active" | "archived" | "deleted";

function getDaysInStage(stageEnteredAt?: string | null): number {
  if (!stageEnteredAt) return 0;
  const now = new Date();
  const entered = new Date(stageEnteredAt);
  if (isNaN(entered.getTime())) return 0;
  const diffTime = Math.abs(now.getTime() - entered.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

interface ClientListTableProps {
  clients: ClientListItem[];
  enabledProperties?: string[];
  viewMode?: ClientTableViewMode;
  onDelete?: (clientId: string) => void;
  onMessage?: (clientId: string) => void;
  onArchive?: (clientId: string) => void;
  onUnarchive?: (clientId: string) => void;
  onRestore?: (clientId: string) => void;
  onPermanentDelete?: (clientId: string) => void;
}

const STAGE_CONFIG: Record<LifecycleStage, { label: string; icon: React.ReactNode; className: string }> = {
  lead: {
    label: "Lead",
    icon: <Circle className="h-3.5 w-3.5" />,
    className: "text-muted-foreground",
  },
  discovery: {
    label: "Discovery",
    icon: <CircleDot className="h-3.5 w-3.5" />,
    className: "text-muted-foreground",
  },
  pitch: {
    label: "Pitch",
    icon: <Zap className="h-3.5 w-3.5" />,
    className: "text-warning",
  },
  active: {
    label: "Client",
    icon: <CircleDot className="h-3.5 w-3.5" />,
    className: "text-info",
  },
  complete: {
    label: "Complete",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    className: "text-success",
  },
  on_hold: {
    label: "On Hold",
    icon: <PauseCircle className="h-3.5 w-3.5" />,
    className: "text-warning",
  },
  lost: {
    label: "Lost",
    icon: <XCircle className="h-3.5 w-3.5" />,
    className: "text-destructive",
  },
};

function getCompanyInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

function getCompanyColor(_name: string): string {
  // Linear-style: Consistent muted monochrome
  return "bg-muted-foreground/20";
}

// Default enabled properties for backwards compatibility
const DEFAULT_ENABLED = ["company", "stage", "created"];

export function ClientListTable({
  clients,
  enabledProperties = DEFAULT_ENABLED,
  viewMode = "active",
  onDelete,
  onMessage,
  onArchive,
  onUnarchive,
  onRestore,
  onPermanentDelete,
}: ClientListTableProps) {
  // Helper to check if a property is enabled
  const isEnabled = (prop: string) => enabledProperties.includes(prop);

  if (clients.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No clients found</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-[280px]">Name</TableHead>
            {isEnabled("company") && <TableHead className="w-[160px]">Company</TableHead>}
            {isEnabled("stage") && <TableHead className="w-[110px]">Stage</TableHead>}
            {isEnabled("stage") && <TableHead className="w-[110px]">Days in stage</TableHead>}
            {isEnabled("tags") && <TableHead className="w-[180px]">Tags</TableHead>}
            {isEnabled("mrr") && <TableHead className="w-[100px]">MRR</TableHead>}
            {isEnabled("projects") && <TableHead className="w-[90px]">Projects</TableHead>}
            {isEnabled("lastActivity") && <TableHead className="w-[120px]">Last Activity</TableHead>}
            {isEnabled("phone") && <TableHead className="w-[140px]">Phone</TableHead>}
            {isEnabled("created") && <TableHead className="w-[120px]">Created</TableHead>}
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow
              key={client.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
            >
              {/* Name - Always shown */}
              <TableCell>
                <Link href={studioRoutes.clients.detail(client.id)} className="block">
                  <ClientCell name={client.name} email={client.contactEmail} />
                </Link>
              </TableCell>

              {/* Company */}
              {isEnabled("company") && (
                <TableCell>
                  <Link href={studioRoutes.clients.detail(client.id)} className="block">
                    {client.company ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback
                            className={`${getCompanyColor(client.company.name)} text-muted-foreground text-xs font-medium`}
                          >
                            {getCompanyInitial(client.company.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate">{client.company.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </Link>
                </TableCell>
              )}

              {/* Stage */}
              {isEnabled("stage") && (
                <TableCell>
                  <Link href={studioRoutes.clients.detail(client.id)} className="block">
                    {(() => {
                      const stage = (client.lifecycleStage || "lead") as string;
                      // Handle both "active" and "client" values (migration compatibility)
                      const normalizedStage = stage === "client" ? "active" : stage;
                      const stageConfig = STAGE_CONFIG[normalizedStage as LifecycleStage] || STAGE_CONFIG.lead;
                      return (
                        <div className={`flex items-center gap-1.5 text-sm ${stageConfig.className}`}>
                          {stageConfig.icon}
                          <span>{stageConfig.label}</span>
                        </div>
                      );
                    })()}
                  </Link>
                </TableCell>
              )}

              {/* Days in Stage - shown when stage is enabled */}
              {isEnabled("stage") && (
                <TableCell>
                  <Link href={studioRoutes.clients.detail(client.id)} className="block text-sm text-muted-foreground">
                    {(() => {
                      const days = getDaysInStage(client.stageEnteredAt);
                      return days === 0 ? "Today" : `${days}d`;
                    })()}
                  </Link>
                </TableCell>
              )}

              {/* Tags */}
              {isEnabled("tags") && (
                <TableCell>
                  <Link href={studioRoutes.clients.detail(client.id)} className="block">
                    {client.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {client.tags.slice(0, 2).map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="outline"
                            className="text-xs px-1.5 py-0"
                            style={{
                              backgroundColor: `${tag.color}15`,
                              borderColor: tag.color,
                              color: tag.color,
                            }}
                          >
                            {tag.label}
                          </Badge>
                        ))}
                        {client.tags.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{client.tags.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </Link>
                </TableCell>
              )}

              {/* MRR */}
              {isEnabled("mrr") && (
                <TableCell>
                  <Link href={studioRoutes.clients.detail(client.id)} className="block">
                    {client.mrr && client.mrr > 0 ? (
                      <span className="text-sm text-success">${client.mrr}/mo</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </Link>
                </TableCell>
              )}

              {/* Projects */}
              {isEnabled("projects") && (
                <TableCell>
                  <Link href={studioRoutes.clients.detail(client.id)} className="block text-sm">
                    {client.projectCount ?? 0}
                  </Link>
                </TableCell>
              )}

              {/* Last Activity */}
              {isEnabled("lastActivity") && (
                <TableCell>
                  <Link href={studioRoutes.clients.detail(client.id)} className="block text-sm text-muted-foreground">
                    {client.lastContactAt && !isNaN(new Date(client.lastContactAt).getTime())
                      ? formatDistanceToNow(new Date(client.lastContactAt), { addSuffix: true })
                      : "—"}
                  </Link>
                </TableCell>
              )}

              {/* Phone */}
              {isEnabled("phone") && (
                <TableCell>
                  <Link href={studioRoutes.clients.detail(client.id)} className="block text-sm text-muted-foreground">
                    {client.contactPhone || "—"}
                  </Link>
                </TableCell>
              )}

              {/* Created */}
              {isEnabled("created") && (
                <TableCell>
                  <Link
                    href={studioRoutes.clients.detail(client.id)}
                    className="block text-sm text-muted-foreground"
                  >
                    {format(new Date(client.createdAt), "MMM d, yyyy")}
                  </Link>
                </TableCell>
              )}

              {/* Actions */}
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[180px]">
                    {viewMode === "active" && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href={studioRoutes.clients.detail(client.id)}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`${studioRoutes.clients.detail(client.id)}/edit`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        {onMessage && (
                          <DropdownMenuItem onClick={() => onMessage(client.id)}>
                            <Mail className="h-4 w-4 mr-2" />
                            Send message
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {onArchive && (
                          <DropdownMenuItem onClick={() => onArchive(client.id)}>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDelete(client.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Move to trash
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                    {viewMode === "archived" && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href={studioRoutes.clients.detail(client.id)}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View details
                          </Link>
                        </DropdownMenuItem>
                        {onUnarchive && (
                          <DropdownMenuItem onClick={() => onUnarchive(client.id)}>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Unarchive
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {onDelete && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDelete(client.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Move to trash
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                    {viewMode === "deleted" && (
                      <>
                        {onRestore && (
                          <DropdownMenuItem onClick={() => onRestore(client.id)}>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Restore
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {onPermanentDelete && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onPermanentDelete(client.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete forever
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
