"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { FavoriteButton } from "@/app/_features/shell/components/FavoriteButton";

interface ProjectHeaderProps {
  projectId: string;
  projectName: string;
  clientName?: string;
  status: string;
  startDate?: string;
}

export function ProjectHeader({
  projectId,
  projectName,
  clientName,
  status,
  startDate,
}: ProjectHeaderProps) {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-success/10 text-success border-success/20";
      case "completed":
        return "bg-info/10 text-info border-info/20";
      case "on_hold":
        return "bg-warning/10 text-warning border-warning/20";
      case "archived":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/studio/projects">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Link>
      </Button>

      {/* Project info */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{projectName}</h1>
            <FavoriteButton
              item={{
                id: projectId,
                type: "project",
                primaryMode: "studio",
                label: projectName,
                href: `/studio/projects/${projectId}`,
                subtitle: clientName,
              }}
            />
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {clientName && (
              <>
                <span>{clientName}</span>
                <span>•</span>
              </>
            )}
            <Badge variant="outline" className={getStatusColor(status)}>
              {status}
            </Badge>
            {startDate && (
              <>
                <span>•</span>
                <span>Started {new Date(startDate).toLocaleDateString()}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
