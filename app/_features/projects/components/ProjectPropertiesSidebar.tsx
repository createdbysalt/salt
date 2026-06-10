"use client";

import { Button } from "@/app/_components/ui/button";
import { Separator } from "@/app/_components/ui/separator";
import { cn } from "@repo/utils";
import {
  DollarSign,
  Clock,
  Tag,
  Calendar,
  MessageSquare,
  Share2,
  FileUp,
  Link as LinkIcon,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface ProjectLink {
  id: string;
  label: string;
  url: string;
}

interface ProjectPropertiesSidebarProps {
  projectId: string;
  clientId?: string | null;
  budget?: number | null;
  budgetUsed?: number | null;
  hoursEstimate?: number | null;
  hoursUsed?: number | null;
  projectType?: string | null;
  startDate?: string | null;
  targetEndDate?: string | null;
  links?: ProjectLink[];
  className?: string;
}

/**
 * ProjectPropertiesSidebar - Right sidebar showing project metadata and quick actions
 *
 * @example
 * ```tsx
 * <ProjectPropertiesSidebar
 *   projectId="123"
 *   budget={5000}
 *   budgetUsed={2500}
 *   hoursEstimate={40}
 *   hoursUsed={24}
 *   projectType="Website"
 * />
 * ```
 */
export function ProjectPropertiesSidebar({
  projectId,
  clientId,
  budget,
  budgetUsed,
  hoursEstimate,
  hoursUsed,
  projectType,
  startDate,
  targetEndDate,
  links = [],
  className,
}: ProjectPropertiesSidebarProps) {
  const budgetPercentage = budget && budgetUsed ? Math.round((budgetUsed / budget) * 100) : null;
  const hoursPercentage = hoursEstimate && hoursUsed ? Math.round((hoursUsed / hoursEstimate) * 100) : null;

  return (
    <aside className={cn("space-y-6", className)}>
      {/* Quick Actions */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Quick Actions
        </h3>
        <div className="space-y-1">
          {clientId && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-sm"
              asChild
            >
              <Link href={`/people/${clientId}?tab=messages`}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Message Client
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8 text-sm"
            asChild
          >
            <Link href="/work">
              <FileUp className="h-4 w-4 mr-2" />
              Add File
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8 text-sm"
            disabled
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share Project
          </Button>
        </div>
      </div>

      <Separator />

      {/* Properties */}
      <div className="space-y-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Properties
        </h3>

        {/* Budget */}
        {budget !== null && budget !== undefined && (
          <PropertyRow
            icon={DollarSign}
            label="Budget"
            value={
              <div className="text-right">
                <div className="font-medium">
                  ${budgetUsed?.toLocaleString() ?? 0} / ${budget.toLocaleString()}
                </div>
                {budgetPercentage !== null && (
                  <div className={cn(
                    "text-xs",
                    budgetPercentage > 90 ? "text-destructive" :
                    budgetPercentage > 75 ? "text-warning" :
                    "text-muted-foreground"
                  )}>
                    {budgetPercentage}% used
                  </div>
                )}
              </div>
            }
          />
        )}

        {/* Hours */}
        {hoursEstimate !== null && hoursEstimate !== undefined && (
          <PropertyRow
            icon={Clock}
            label="Hours"
            value={
              <div className="text-right">
                <div className="font-medium">
                  {hoursUsed ?? 0} / {hoursEstimate} hrs
                </div>
                {hoursPercentage !== null && (
                  <div className={cn(
                    "text-xs",
                    hoursPercentage > 90 ? "text-destructive" :
                    hoursPercentage > 75 ? "text-warning" :
                    "text-muted-foreground"
                  )}>
                    {hoursPercentage}% used
                  </div>
                )}
              </div>
            }
          />
        )}

        {/* Project Type */}
        {projectType && (
          <PropertyRow
            icon={Tag}
            label="Type"
            value={<span className="font-medium">{projectType}</span>}
          />
        )}

        {/* Dates */}
        {startDate && (
          <PropertyRow
            icon={Calendar}
            label="Started"
            value={<span className="font-medium">{format(new Date(startDate), "MMM d, yyyy")}</span>}
          />
        )}

        {targetEndDate && (
          <PropertyRow
            icon={Calendar}
            label="Target"
            value={<span className="font-medium">{format(new Date(targetEndDate), "MMM d, yyyy")}</span>}
          />
        )}
      </div>

      {/* Links */}
      {links.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Resources
            </h3>
            <div className="space-y-1">
              {links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors group"
                >
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{link.label}</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </aside>
  );
}

// Helper component for property rows
function PropertyRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
