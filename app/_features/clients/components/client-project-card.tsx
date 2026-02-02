"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, TrendingUp, FolderOpen } from "lucide-react";

interface Project {
  id: string;
  name: string;
  status: string;
  intelligence?: {
    performance_score?: number;
    seo_score?: number;
    security_score?: number;
  };
  tasks?: {
    total: number;
    critical: number;
  };
  files_count?: number;
  last_activity?: string;
}

interface ClientProjectCardProps {
  project: Project;
}

export function ClientProjectCard({ project }: ClientProjectCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return <CheckCircle2 className="h-5 w-5 text-muted-foreground" />;
      case "monitoring":
        return <TrendingUp className="h-5 w-5 text-muted-foreground" />;
      default:
        return <FolderOpen className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const hasIntelligence = project.intelligence && (
    project.intelligence.performance_score ||
    project.intelligence.seo_score ||
    project.intelligence.security_score
  );

  return (
    <Card className="transition-[transform,box-shadow] duration-[150ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{project.name}</CardTitle>
            <div className="flex items-center gap-2">
              {getStatusIcon(project.status)}
              <Badge variant="outline" className="text-xs capitalize">
                {project.status}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Intelligence Section */}
          <div>
            <h4 className="text-sm font-medium mb-2">Intelligence:</h4>
            {hasIntelligence ? (
              <div className="space-y-1 text-sm">
                {project.intelligence?.performance_score && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Performance audit:</span>
                    <span className="font-medium">
                      {project.intelligence.performance_score}/100{" "}
                      {project.intelligence.performance_score >= 70 ? "✓" : "⚠️"}
                    </span>
                  </div>
                )}
                {project.intelligence?.seo_score && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">SEO opportunities:</span>
                    <span className="font-medium">
                      {project.intelligence.seo_score} identified
                    </span>
                  </div>
                )}
                {project.intelligence?.security_score && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Security scan:</span>
                    <span className="font-medium">
                      {project.intelligence.security_score}/100 ✓
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No intelligence data yet</p>
            )}
          </div>

          {/* Operations Section */}
          <div>
            <h4 className="text-sm font-medium mb-2">Operations:</h4>
            <div className="space-y-1 text-sm">
              {project.tasks && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tasks:</span>
                  <span className="font-medium">
                    {project.tasks.total} total
                    {project.tasks.critical > 0 && (
                      <span className="text-destructive"> ({project.tasks.critical} critical)</span>
                    )}
                  </span>
                </div>
              )}
              {project.files_count !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Files:</span>
                  <span className="font-medium">{project.files_count} uploaded</span>
                </div>
              )}
              {project.last_activity && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last activity:</span>
                  <span className="font-medium">{project.last_activity}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <Button variant="outline" className="w-full mt-4" asChild>
            <Link href={`/studio/projects/${project.id}`}>
              Enter project →
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
