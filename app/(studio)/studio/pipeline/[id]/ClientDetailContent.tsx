"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Circle,
  CircleDot,
  Zap,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Mail,
  Phone,
  Folder,
  Calendar,
  ExternalLink,
  FileText,
  ChevronDown,
  Check,
} from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";
import { moveClientToStage } from "../actions";
import type { LifecycleStage } from "../page";
import toast from "react-hot-toast";

interface ClientDetailContentProps {
  client: {
    id: string;
    name: string;
    contactEmail: string | null;
    contactPhone: string | null;
    notes: string | null;
    lifecycleStage: LifecycleStage;
    projectCount: number;
    createdAt: string;
    updatedAt: string;
  };
}

const LIFECYCLE_STAGES: LifecycleStage[] = ["lead", "discovery", "pitch", "active", "complete", "on_hold", "lost"];

const STAGE_CONFIG: Record<
  LifecycleStage,
  { icon: React.ReactNode; label: string; color: string }
> = {
  lead: {
    icon: <Circle className="h-4 w-4" />,
    label: "Lead",
    color: "text-muted-foreground",
  },
  discovery: {
    icon: <CircleDot className="h-4 w-4" />,
    label: "Discovery",
    color: "text-muted-foreground",
  },
  pitch: {
    icon: <Zap className="h-4 w-4" />,
    label: "Pitch",
    color: "text-warning",
  },
  active: {
    icon: <CircleDot className="h-4 w-4" />,
    label: "Active",
    color: "text-info",
  },
  complete: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: "Complete",
    color: "text-success",
  },
  on_hold: {
    icon: <PauseCircle className="h-4 w-4" />,
    label: "On Hold",
    color: "text-warning",
  },
  lost: {
    icon: <XCircle className="h-4 w-4" />,
    label: "Lost",
    color: "text-destructive",
  },
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ClientDetailContent({ client }: ClientDetailContentProps) {
  const router = useRouter();
  const [currentStage, setCurrentStage] = useState<LifecycleStage>(client.lifecycleStage);
  const [isUpdating, setIsUpdating] = useState(false);

  const stageConfig = STAGE_CONFIG[currentStage];

  const handleStageChange = async (newStage: LifecycleStage) => {
    if (newStage === currentStage) return;

    setIsUpdating(true);
    const previousStage = currentStage;
    setCurrentStage(newStage); // Optimistic update

    const result = await moveClientToStage(client.id, newStage);

    if (!result.success) {
      setCurrentStage(previousStage); // Revert on failure
      toast.error(result.error || "Failed to update stage");
    } else {
      toast.success(`Moved to ${STAGE_CONFIG[newStage].label}`);
      router.refresh();
    }

    setIsUpdating(false);
  };

  return (
    <div className="flex min-h-[400px]">
      {/* Main content area */}
      <div className="flex-1 p-6">
        {/* Client name */}
        <h1 className="text-2xl font-semibold mb-6">{client.name}</h1>

        {/* Notes/Description */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">Notes</h2>
          {client.notes ? (
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-foreground/90">{client.notes}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No notes yet. Add notes to keep track of important client information.
            </p>
          )}
        </div>

        {/* Activity section placeholder */}
        <div className="mt-8 pt-8 border-t">
          <h2 className="text-sm font-medium text-muted-foreground mb-4">Activity</h2>
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Client added</span>
              <span className="text-muted-foreground"> · </span>
              <span className="text-muted-foreground">{formatDate(client.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Properties sidebar - Linear style */}
      <div className="w-[280px] border-l bg-muted/20">
        <div className="p-4 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Properties</h3>
          </div>

          {/* Status - Now a dropdown */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Status</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`flex items-center justify-between gap-2 w-full px-2 py-1.5 rounded-md hover:bg-accent transition-colors ${stageConfig.color} ${isUpdating ? "opacity-50" : ""}`}
                  disabled={isUpdating}
                >
                  <div className="flex items-center gap-2">
                    {stageConfig.icon}
                    <span className="text-sm">{stageConfig.label}</span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px]">
                {LIFECYCLE_STAGES.map((stage) => {
                  const config = STAGE_CONFIG[stage];
                  const isSelected = stage === currentStage;
                  return (
                    <DropdownMenuItem
                      key={stage}
                      onClick={() => handleStageChange(stage)}
                      className="flex items-center justify-between"
                    >
                      <div className={`flex items-center gap-2 ${config.color}`}>
                        {config.icon}
                        <span>{config.label}</span>
                      </div>
                      {isSelected && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Contact Email */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Email</label>
            {client.contactEmail ? (
              <a
                href={`mailto:${client.contactEmail}`}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-accent transition-colors text-sm"
              >
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{client.contactEmail}</span>
              </a>
            ) : (
              <button className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-accent transition-colors text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>Add email</span>
              </button>
            )}
          </div>

          {/* Contact Phone */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Phone</label>
            {client.contactPhone ? (
              <a
                href={`tel:${client.contactPhone}`}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-accent transition-colors text-sm"
              >
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{client.contactPhone}</span>
              </a>
            ) : (
              <button className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-accent transition-colors text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>Add phone</span>
              </button>
            )}
          </div>

          {/* Projects */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Projects</label>
            <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
              <Folder className="h-4 w-4 text-muted-foreground" />
              <span>{client.projectCount} project{client.projectCount !== 1 ? "s" : ""}</span>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Dates</label>
            <div className="space-y-1">
              <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Added {formatDate(client.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Updated {formatDate(client.updatedAt)}</span>
              </div>
            </div>
          </div>

          {/* View full profile link */}
          <div className="pt-4 border-t">
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href={`/studio/clients/${client.id}`}>
                <ExternalLink className="h-4 w-4 mr-2" />
                View Full Profile
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
