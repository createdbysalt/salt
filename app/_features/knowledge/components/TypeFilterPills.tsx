"use client";

import { cn } from "@repo/utils";
import { Button } from "@/app/_components/ui/button";
import {
  FileText,
  Upload,
  Link as LinkIcon,
  MessageSquare,
  ClipboardList,
} from "lucide-react";
import type { KnowledgeType } from "../types";

export type FilterType = "all" | "notes" | "files" | "links" | "intake";

interface FilterConfig {
  label: string;
  icon: React.ReactNode;
  types: KnowledgeType[];
}

const FILTER_CONFIG: Record<FilterType, FilterConfig> = {
  all: {
    label: "All",
    icon: null,
    types: [],
  },
  notes: {
    label: "Notes",
    icon: <MessageSquare className="h-3.5 w-3.5" />,
    types: ["discovery_note", "insight", "decision", "feedback"],
  },
  files: {
    label: "Files",
    icon: <FileText className="h-3.5 w-3.5" />,
    types: ["document", "asset"],
  },
  links: {
    label: "Links",
    icon: <LinkIcon className="h-3.5 w-3.5" />,
    types: ["link"],
  },
  intake: {
    label: "Intake",
    icon: <ClipboardList className="h-3.5 w-3.5" />,
    types: ["intake_response", "meeting_transcript"],
  },
};

interface TypeFilterPillsProps {
  selected: FilterType;
  onChange: (filter: FilterType) => void;
  counts?: Partial<Record<FilterType, number>>;
  className?: string;
}

export function TypeFilterPills({
  selected,
  onChange,
  counts,
  className,
}: TypeFilterPillsProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {(Object.keys(FILTER_CONFIG) as FilterType[]).map((filter) => {
        const config = FILTER_CONFIG[filter];
        const isActive = selected === filter;
        const count = counts?.[filter];

        return (
          <Button
            key={filter}
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2.5 gap-1.5 text-xs font-medium rounded-full transition-colors",
              isActive
                ? "bg-foreground text-background hover:bg-foreground/90 hover:text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            onClick={() => onChange(filter)}
          >
            {config.icon}
            <span>{config.label}</span>
            {count !== undefined && count > 0 && (
              <span
                className={cn(
                  "ml-0.5 text-[10px] tabular-nums",
                  isActive ? "text-background/70" : "text-muted-foreground/60"
                )}
              >
                {count}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
}

// Helper to convert FilterType to KnowledgeType array
export function getTypesForFilter(filter: FilterType): KnowledgeType[] | undefined {
  if (filter === "all") return undefined;
  return FILTER_CONFIG[filter].types;
}
