import type { WidgetProps } from "@/app/_features/portal/types/bridge-overview";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import Link from "next/link";
import { FolderKanban, Clock, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

/**
 * Project Status Widget
 * Shows all client's projects with quick stats
 */
export function ProjectStatusWidget({ config, data }: WidgetProps) {
  const viewStyle = config.settings?.projectViewStyle || "grid";
  const { projects } = data;

  if (!projects || projects.length === 0) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Your Projects</h2>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderKanban className="h-16 w-16 mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Your studio will add projects here soon. Check back later!
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Your Projects</h2>
        {projects.length > 3 && (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/bridge/projects">
              View all
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>

      <div className={viewStyle === "grid" ? "grid gap-4" : "space-y-3"}>
        {projects.slice(0, 3).map((project) => (
          <Link key={project.id} href={`/bridge/projects/${project.id}`}>
            <Card className="transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-xl">{project.name}</CardTitle>
                    {project.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={project.status === "active" ? "default" : "secondary"}
                    className="capitalize ml-4"
                  >
                    {project.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    Updated{" "}
                    {formatDistanceToNow(new Date(project.updated_at), {
                      addSuffix: true,
                    })}
                  </div>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

