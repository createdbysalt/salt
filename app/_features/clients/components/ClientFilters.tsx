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
import { ChevronDown, Check, X, Settings, Circle, CircleDot, Zap, CheckCircle2, PauseCircle, XCircle, Users, Archive, Trash2 } from "lucide-react";

export type LifecycleStage = "all" | "lead" | "discovery" | "pitch" | "active" | "complete" | "on_hold" | "lost";
export type ClientStatusFilter = "active" | "archived" | "deleted";

interface Company {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  label: string;
  color: string;
}

interface ClientFiltersProps {
  // Status filter (Active/Archived/Trash)
  statusFilter: ClientStatusFilter;
  onStatusFilterChange: (status: ClientStatusFilter) => void;
  statusCounts?: { active: number; archived: number; deleted: number };

  // Stage filter
  stage: LifecycleStage;
  onStageChange: (stage: LifecycleStage) => void;

  // Company filter
  companies: Company[];
  selectedCompanyId: string | null;
  onCompanyChange: (companyId: string | null) => void;

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

const STATUS_OPTIONS: { value: ClientStatusFilter; label: string; icon: React.ReactNode }[] = [
  { value: "active", label: "Active", icon: <Users className="h-3.5 w-3.5 text-foreground" /> },
  { value: "archived", label: "Archived", icon: <Archive className="h-3.5 w-3.5 text-muted-foreground" /> },
  { value: "deleted", label: "Trash", icon: <Trash2 className="h-3.5 w-3.5 text-destructive" /> },
];

const STAGE_OPTIONS: { value: LifecycleStage; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "All", icon: null },
  { value: "lead", label: "Inquiry", icon: <Circle className="h-3.5 w-3.5 text-muted-foreground" /> },
  { value: "discovery", label: "Discovery", icon: <CircleDot className="h-3.5 w-3.5 text-muted-foreground" /> },
  { value: "pitch", label: "Pitch", icon: <Zap className="h-3.5 w-3.5 text-warning" /> },
  { value: "active", label: "Client", icon: <CircleDot className="h-3.5 w-3.5 text-info" /> },
  { value: "complete", label: "Complete", icon: <CheckCircle2 className="h-3.5 w-3.5 text-success" /> },
  { value: "on_hold", label: "On Hold", icon: <PauseCircle className="h-3.5 w-3.5 text-warning" /> },
  { value: "lost", label: "Lost", icon: <XCircle className="h-3.5 w-3.5 text-destructive" /> },
];

export function ClientFilters({
  statusFilter,
  onStatusFilterChange,
  statusCounts,
  stage,
  onStageChange,
  companies,
  selectedCompanyId,
  onCompanyChange,
  tags,
  selectedTagIds,
  onTagsChange,
  onManageTags,
  onClearAll,
  hasActiveFilters,
}: ClientFiltersProps) {
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
  };

  const currentStage = STAGE_OPTIONS.find((s) => s.value === stage);

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === statusFilter);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground">Filters:</span>

      {/* Status Filter (Active/Archived/Trash) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
            {currentStatus?.icon}
            {currentStatus?.label}
            {statusCounts && (
              <span className="text-muted-foreground">
                ({statusCounts[statusFilter]})
              </span>
            )}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[160px]">
          {STATUS_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onStatusFilterChange(option.value)}
              className="gap-2"
            >
              {option.icon}
              {option.label}
              {statusCounts && (
                <span className="ml-auto text-muted-foreground text-xs">
                  {statusCounts[option.value]}
                </span>
              )}
              {statusFilter === option.value && <Check className="h-4 w-4 ml-auto" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Stage Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
            {currentStage?.icon}
            Stage: {currentStage?.label}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[160px]">
          {STAGE_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onStageChange(option.value)}
              className="gap-2"
            >
              {option.icon || <span className="w-3.5" />}
              {option.label}
              {stage === option.value && <Check className="h-4 w-4 ml-auto" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Company Filter */}
      {companies.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
              Company: {selectedCompany?.name || "All"}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[180px]">
            <DropdownMenuItem onClick={() => onCompanyChange(null)}>
              All companies
              {!selectedCompanyId && <Check className="h-4 w-4 ml-auto" />}
            </DropdownMenuItem>
            {companies.map((company) => (
              <DropdownMenuItem
                key={company.id}
                onClick={() => onCompanyChange(company.id)}
              >
                {company.name}
                {selectedCompanyId === company.id && (
                  <Check className="h-4 w-4 ml-auto" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={() => onCompanyChange("none")}>
              No company
              {selectedCompanyId === "none" && (
                <Check className="h-4 w-4 ml-auto" />
              )}
            </DropdownMenuItem>
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
