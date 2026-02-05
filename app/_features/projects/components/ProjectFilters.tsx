"use client";

import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";
import {
  ChevronDown,
  Check,
  X,
  Settings,
  Circle,
  CircleDot,
  CheckCircle2,
  PauseCircle,
  Eye,
} from "lucide-react";

export type ProjectStatus = "all" | "not_started" | "in_progress" | "review" | "complete" | "on_hold";
export type ProjectType = "all" | "one-time" | "retainer";

interface Tag {
  id: string;
  label: string;
  color: string;
}

interface Client {
  id: string;
  name: string;
}

interface ProjectFiltersProps {
  // Status filter
  status: ProjectStatus;
  onStatusChange: (status: ProjectStatus) => void;

  // Type filter
  type: ProjectType;
  onTypeChange: (type: ProjectType) => void;

  // Client filter (optional)
  clients?: Client[];
  selectedClientId?: string | null;
  onClientChange?: (clientId: string | null) => void;

  // Tags filter
  tags: Tag[];
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;

  // Tag management
  onManageTags?: () => void;

  // Clear all
  onClearAll: () => void;
  hasActiveFilters: boolean;
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "All", icon: null },
  { value: "not_started", label: "Not Started", icon: <Circle className="h-3.5 w-3.5 text-muted-foreground" /> },
  { value: "in_progress", label: "In Progress", icon: <CircleDot className="h-3.5 w-3.5 text-info" /> },
  { value: "review", label: "Review", icon: <Eye className="h-3.5 w-3.5 text-warning" /> },
  { value: "complete", label: "Complete", icon: <CheckCircle2 className="h-3.5 w-3.5 text-success" /> },
  { value: "on_hold", label: "On Hold", icon: <PauseCircle className="h-3.5 w-3.5 text-warning" /> },
];

const TYPE_OPTIONS: { value: ProjectType; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "one-time", label: "One-Time" },
  { value: "retainer", label: "Retainer" },
];

export function ProjectFilters({
  status,
  onStatusChange,
  type,
  onTypeChange,
  clients,
  selectedClientId,
  onClientChange,
  tags,
  selectedTagIds,
  onTagsChange,
  onManageTags,
  onClearAll,
  hasActiveFilters,
}: ProjectFiltersProps) {
  const selectedClient = clients?.find((c) => c.id === selectedClientId);
  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
  };

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === status);
  const currentType = TYPE_OPTIONS.find((t) => t.value === type);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground">Filters:</span>

      {/* Status Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
            {currentStatus?.icon}
            Status: {currentStatus?.label}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[160px]">
          {STATUS_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onStatusChange(option.value)}
              className="gap-2"
            >
              {option.icon || <span className="w-3.5" />}
              {option.label}
              {status === option.value && <Check className="h-4 w-4 ml-auto" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Type Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
            Type: {currentType?.label}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[140px]">
          {TYPE_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onTypeChange(option.value)}
            >
              {option.label}
              {type === option.value && <Check className="h-4 w-4 ml-auto" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Client Filter (if clients provided) */}
      {clients && clients.length > 0 && onClientChange && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
              Client: {selectedClient?.name || "All"}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[180px] max-h-[300px] overflow-y-auto">
            <DropdownMenuItem onClick={() => onClientChange(null)}>
              All clients
              {!selectedClientId && <Check className="h-4 w-4 ml-auto" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {clients.map((client) => (
              <DropdownMenuItem
                key={client.id}
                onClick={() => onClientChange(client.id)}
              >
                {client.name}
                {selectedClientId === client.id && (
                  <Check className="h-4 w-4 ml-auto" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Tags Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
            Tags{selectedTags.length > 0 && ` (${selectedTags.length})`}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[180px]">
          {tags.length > 0 ? (
            tags.map((tag) => (
              <DropdownMenuItem
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
              >
                <div
                  className="h-2 w-2 rounded-full mr-2"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.label}
                {selectedTagIds.includes(tag.id) && (
                  <Check className="h-4 w-4 ml-auto" />
                )}
              </DropdownMenuItem>
            ))
          ) : (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              No tags created yet
            </div>
          )}
          {onManageTags && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onManageTags} className="gap-2">
                <Settings className="h-3.5 w-3.5" />
                Manage tags
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Selected Tags Pills */}
      {selectedTags.map((tag) => (
        <Badge
          key={tag.id}
          variant="secondary"
          className="h-7 gap-1 text-xs cursor-pointer"
          style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
          onClick={() => toggleTag(tag.id)}
        >
          {tag.label}
          <X className="h-3 w-3" />
        </Badge>
      ))}

      {/* Clear All */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground hover:text-foreground"
          onClick={onClearAll}
        >
          Clear all
        </Button>
      )}
    </div>
  );
}
