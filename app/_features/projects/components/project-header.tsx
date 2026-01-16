"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";

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
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "completed":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "on_hold":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "archived":
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/projects">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Link>
      </Button>

      {/* Project info */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{projectName}</h1>
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
