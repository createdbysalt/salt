"use client";

import * as React from "react";
import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from "@tanstack/react-table";
import {
  Search,
  Download,
  SlidersHorizontal,
  Plus,
  MoreHorizontal,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  File,
  ArrowUpDown,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeft,
  Lock,
  Eye,
  Trash2,
  ExternalLink,
  FolderOpen,
  Link2,
  Tag,
  Check,
} from "lucide-react";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Checkbox,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  Separator,
} from "@repo/ui";
import { cn } from "@repo/utils";
import {
  getClientFiles,
  type ClientFile,
  type FileTag,
} from "@/app/actions/files/get-client-files";
import {
  updateFileDescription,
  updateFileDirection,
  updateFileProject,
  addFileTag,
  removeFileTag,
  deleteFile,
  getFileDownloadUrl,
} from "@/app/actions/files/update-client-file";
import {
  getBulkDownloadUrls,
  bulkDeleteFiles,
  bulkUpdateDirection,
  bulkUpdateProject,
  bulkAddTags,
} from "@/app/actions/files/bulk-download-files";
import { FileUploadDialog } from "./FileUploadDialog";
import { FileDetailPanel } from "./FileDetailPanel";
import { BulkActionBar } from "./BulkActionBar";
import JSZip from "jszip";

// =============================================================================
// Types
// =============================================================================

interface FilesTabProps {
  clientId: string;
  clientName: string;
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

function getFileIcon(mimeType: string | null, fileType: "file" | "link" = "file") {
  // Links always show a link icon
  if (fileType === "link") {
    return <Link2 className="size-4 text-muted-foreground" />;
  }

  if (!mimeType) return <File className="size-4 text-muted-foreground" />;

  if (mimeType.startsWith("image/")) {
    return <FileImage className="size-4 text-muted-foreground" />;
  }
  if (mimeType === "application/pdf") {
    return <FileText className="size-4 text-muted-foreground" />;
  }
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType === "text/csv"
  ) {
    return <FileSpreadsheet className="size-4 text-muted-foreground" />;
  }
  if (
    mimeType.includes("word") ||
    mimeType.includes("document") ||
    mimeType === "text/plain"
  ) {
    return <FileText className="size-4 text-muted-foreground" />;
  }
  if (mimeType.includes("zip") || mimeType.includes("rar")) {
    return <FileArchive className="size-4 text-muted-foreground" />;
  }
  return <File className="size-4 text-muted-foreground" />;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDirectionBadge(direction: "from_client" | "to_client" | "internal") {
  switch (direction) {
    case "from_client":
      return (
        <Badge variant="secondary" className="gap-1 text-xs font-normal">
          <ArrowDownLeft className="size-3" />
          Received
        </Badge>
      );
    case "to_client":
      return (
        <Badge variant="secondary" className="gap-1 text-xs font-normal">
          <ArrowUpRight className="size-3" />
          Sent
        </Badge>
      );
    case "internal":
      return (
        <Badge variant="secondary" className="gap-1 text-xs font-normal text-muted-foreground">
          <Lock className="size-3" />
          Internal
        </Badge>
      );
  }
}

function getFileType(mimeType: string | null, fileType: "file" | "link" = "file"): string {
  // Links always show "Link" as type
  if (fileType === "link") return "Link";

  if (!mimeType) return "File";
  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "Spreadsheet";
  if (mimeType.includes("word") || mimeType.includes("document")) return "Document";
  if (mimeType === "text/csv") return "CSV";
  if (mimeType === "text/plain") return "Text";
  if (mimeType.includes("zip") || mimeType.includes("rar")) return "Archive";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "Presentation";
  return "File";
}

// =============================================================================
// Row Actions
// =============================================================================

function RowActions({ file }: { file: ClientFile }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>
          <Eye className="size-4 mr-2" />
          Preview
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Download className="size-4 mr-2" />
          Download
        </DropdownMenuItem>
        {file.projectId && (
          <DropdownMenuItem asChild>
            <Link href={`/studio/projects/${file.projectId}`}>
              <ExternalLink className="size-4 mr-2" />
              View Project
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <FileText className="size-4 mr-2" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive focus:text-destructive">
          <Trash2 className="size-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// =============================================================================
// Column Definitions
// =============================================================================

function createColumns(): ColumnDef<ClientFile>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "fileName",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="size-3.5" />
        </button>
      ),
      cell: ({ row }) => {
        const file = row.original;
        return (
          <div className="flex items-center gap-3">
            {getFileIcon(file.mimeType, file.fileType)}
            <div className="min-w-0">
              <p className="font-medium truncate max-w-[200px]">{file.fileName}</p>
              {file.projectName && (
                <p className="text-xs text-muted-foreground truncate">
                  {file.projectName}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "mimeType",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Type
          <ArrowUpDown className="size-3.5" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {getFileType(row.original.mimeType, row.original.fileType)}
        </span>
      ),
      sortingFn: (rowA, rowB) => {
        const a = getFileType(rowA.original.mimeType, rowA.original.fileType);
        const b = getFileType(rowB.original.mimeType, rowB.original.fileType);
        return a.localeCompare(b);
      },
    },
    {
      accessorKey: "tags",
      header: "Tags",
      cell: ({ row }) => {
        const tags = row.original.tags;
        if (tags.length === 0) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {tags.slice(0, 2).map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="text-xs font-normal"
              >
                {tag.label}
              </Badge>
            ))}
            {tags.length > 2 && (
              <Badge variant="secondary" className="text-xs font-normal">
                +{tags.length - 2}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "direction",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Direction
          <ArrowUpDown className="size-3.5" />
        </button>
      ),
      cell: ({ row }) => getDirectionBadge(row.original.direction),
    },
    {
      accessorKey: "sizeBytes",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Size
          <ArrowUpDown className="size-3.5" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {row.original.sizeBytes ? formatFileSize(row.original.sizeBytes) : "—"}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Uploaded
          <ArrowUpDown className="size-3.5" />
        </button>
      ),
      cell: ({ row }) => {
        const file = row.original;
        return (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground text-sm cursor-default">
                  {format(new Date(file.createdAt), "MMM d, yyyy")}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Uploaded by {file.uploadedByName}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
      sortingFn: (rowA, rowB) => {
        return new Date(rowA.original.createdAt).getTime() - new Date(rowB.original.createdAt).getTime();
      },
    },
    {
      id: "actions",
      header: () => null,
      cell: ({ row }) => <RowActions file={row.original} />,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-32" />
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
      {/* Table skeleton */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map((i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="size-4" /></TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-4" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="size-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// =============================================================================
// Filter Options
// =============================================================================

const FILE_TYPE_OPTIONS = [
  { value: "image", label: "Images" },
  { value: "pdf", label: "PDFs" },
  { value: "document", label: "Documents" },
  { value: "spreadsheet", label: "Spreadsheets" },
  { value: "link", label: "Links" },
  { value: "file", label: "Other Files" },
];

const DIRECTION_OPTIONS = [
  { value: "from_client", label: "Received" },
  { value: "to_client", label: "Sent" },
  { value: "internal", label: "Internal" },
];

// =============================================================================
// Filter Dropdown Component
// =============================================================================

interface FileFilterDropdownProps {
  typeFilter: string[];
  onTypeFilterChange: (types: string[]) => void;
  directionFilter: string[];
  onDirectionFilterChange: (directions: string[]) => void;
  tagFilter: string[];
  onTagFilterChange: (tagIds: string[]) => void;
  projectFilter: string;
  onProjectFilterChange: (projectId: string) => void;
  projects: Array<{ id: string; name: string }>;
  availableTags: FileTag[];
}

function FileFilterDropdown({
  typeFilter,
  onTypeFilterChange,
  directionFilter,
  onDirectionFilterChange,
  tagFilter,
  onTagFilterChange,
  projectFilter,
  onProjectFilterChange,
  projects,
  availableTags,
}: FileFilterDropdownProps) {
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const totalFilterCount =
    typeFilter.length +
    directionFilter.length +
    tagFilter.length +
    (projectFilter !== "all" ? 1 : 0);

  const handleClearFilters = () => {
    onTypeFilterChange([]);
    onDirectionFilterChange([]);
    onTagFilterChange([]);
    onProjectFilterChange("all");
  };

  const toggleTypeFilter = (value: string) => {
    if (typeFilter.includes(value)) {
      onTypeFilterChange(typeFilter.filter((v) => v !== value));
    } else {
      onTypeFilterChange([...typeFilter, value]);
    }
  };

  const toggleDirectionFilter = (value: string) => {
    if (directionFilter.includes(value)) {
      onDirectionFilterChange(directionFilter.filter((v) => v !== value));
    } else {
      onDirectionFilterChange([...directionFilter, value]);
    }
  };

  const toggleTagFilter = (tagId: string) => {
    if (tagFilter.includes(tagId)) {
      onTagFilterChange(tagFilter.filter((id) => id !== tagId));
    } else {
      onTagFilterChange([...tagFilter, tagId]);
    }
  };

  const FILTER_CATEGORIES = [
    {
      id: "type",
      label: "Type",
      icon: File,
      count: typeFilter.length,
    },
    {
      id: "direction",
      label: "Direction",
      icon: ArrowUpDown,
      count: directionFilter.length,
    },
    {
      id: "tags",
      label: "Tags",
      icon: Tag,
      count: tagFilter.length,
    },
    {
      id: "project",
      label: "Project",
      icon: FolderOpen,
      count: projectFilter !== "all" ? 1 : 0,
    },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 gap-1.5",
            totalFilterCount > 0 ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <SlidersHorizontal className="size-4" />
          Filter
          {totalFilterCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-foreground text-background rounded-full">
              {totalFilterCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        {selectedFilter === null ? (
          // Main filter list
          <Command>
            <CommandInput placeholder="Filter by..." className="h-9" />
            <CommandList>
              <CommandEmpty>No filters found.</CommandEmpty>
              <CommandGroup>
                {FILTER_CATEGORIES.map((filter) => {
                  const Icon = filter.icon;
                  return (
                    <CommandItem
                      key={filter.id}
                      onSelect={() => setSelectedFilter(filter.id)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="size-4 text-muted-foreground" />
                        <span>{filter.label}</span>
                      </div>
                      {filter.count > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {filter.count} selected
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              {totalFilterCount > 0 && (
                <>
                  <Separator className="my-1" />
                  <CommandGroup>
                    <CommandItem onSelect={handleClearFilters} className="justify-center text-muted-foreground">
                      Clear all filters
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        ) : (
          // Filter options view
          <div>
            <div className="flex items-center gap-2 p-2 border-b">
              <Button variant="ghost" size="sm" onClick={() => setSelectedFilter(null)} className="h-7 px-2">
                <ArrowLeft className="size-3.5" />
              </Button>
              <span className="text-sm font-medium">
                {FILTER_CATEGORIES.find((f) => f.id === selectedFilter)?.label}
              </span>
            </div>
            <div className="p-1 max-h-[300px] overflow-y-auto">
              {selectedFilter === "type" &&
                FILE_TYPE_OPTIONS.map((option) => {
                  const isSelected = typeFilter.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      onClick={() => toggleTypeFilter(option.value)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md",
                        "hover:bg-accent transition-colors",
                        isSelected && "bg-accent"
                      )}
                    >
                      <div
                        className={cn(
                          "size-4 rounded border flex items-center justify-center",
                          isSelected ? "bg-foreground border-foreground" : "border-border"
                        )}
                      >
                        {isSelected && <Check className="size-3 text-background" />}
                      </div>
                      <span>{option.label}</span>
                    </button>
                  );
                })}

              {selectedFilter === "direction" &&
                DIRECTION_OPTIONS.map((option) => {
                  const isSelected = directionFilter.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      onClick={() => toggleDirectionFilter(option.value)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md",
                        "hover:bg-accent transition-colors",
                        isSelected && "bg-accent"
                      )}
                    >
                      <div
                        className={cn(
                          "size-4 rounded border flex items-center justify-center",
                          isSelected ? "bg-foreground border-foreground" : "border-border"
                        )}
                      >
                        {isSelected && <Check className="size-3 text-background" />}
                      </div>
                      <span>{option.label}</span>
                    </button>
                  );
                })}

              {selectedFilter === "tags" &&
                availableTags.map((tag) => {
                  const isSelected = tagFilter.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTagFilter(tag.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md",
                        "hover:bg-accent transition-colors",
                        isSelected && "bg-accent"
                      )}
                    >
                      <div
                        className={cn(
                          "size-4 rounded border flex items-center justify-center",
                          isSelected ? "bg-foreground border-foreground" : "border-border"
                        )}
                      >
                        {isSelected && <Check className="size-3 text-background" />}
                      </div>
                      <span>{tag.label}</span>
                    </button>
                  );
                })}

              {selectedFilter === "project" && (
                <>
                  <button
                    onClick={() => onProjectFilterChange("all")}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md",
                      "hover:bg-accent transition-colors",
                      projectFilter === "all" && "bg-accent"
                    )}
                  >
                    <div
                      className={cn(
                        "size-4 rounded border flex items-center justify-center",
                        projectFilter === "all" ? "bg-foreground border-foreground" : "border-border"
                      )}
                    >
                      {projectFilter === "all" && <Check className="size-3 text-background" />}
                    </div>
                    <span>All projects</span>
                  </button>
                  <button
                    onClick={() => onProjectFilterChange("none")}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md",
                      "hover:bg-accent transition-colors",
                      projectFilter === "none" && "bg-accent"
                    )}
                  >
                    <div
                      className={cn(
                        "size-4 rounded border flex items-center justify-center",
                        projectFilter === "none" ? "bg-foreground border-foreground" : "border-border"
                      )}
                    >
                      {projectFilter === "none" && <Check className="size-3 text-background" />}
                    </div>
                    <span>No project</span>
                  </button>
                  {projects.map((project) => {
                    const isSelected = projectFilter === project.id;
                    return (
                      <button
                        key={project.id}
                        onClick={() => onProjectFilterChange(project.id)}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md",
                          "hover:bg-accent transition-colors",
                          isSelected && "bg-accent"
                        )}
                      >
                        <div
                          className={cn(
                            "size-4 rounded border flex items-center justify-center",
                            isSelected ? "bg-foreground border-foreground" : "border-border"
                          )}
                        >
                          {isSelected && <Check className="size-3 text-background" />}
                        </div>
                        <span>{project.name}</span>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// =============================================================================
// Toolbar
// =============================================================================

interface ToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  projectFilter: string;
  onProjectFilterChange: (projectId: string) => void;
  typeFilter: string[];
  onTypeFilterChange: (types: string[]) => void;
  directionFilter: string[];
  onDirectionFilterChange: (directions: string[]) => void;
  tagFilter: string[];
  onTagFilterChange: (tagIds: string[]) => void;
  projects: Array<{ id: string; name: string }>;
  availableTags: FileTag[];
  onUploadClick: () => void;
}

function Toolbar({
  searchQuery,
  onSearchChange,
  projectFilter,
  onProjectFilterChange,
  typeFilter,
  onTypeFilterChange,
  directionFilter,
  onDirectionFilterChange,
  tagFilter,
  onTagFilterChange,
  projects,
  availableTags,
  onUploadClick,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9 w-[240px] bg-muted/50 border-transparent focus:border-border"
        />
      </div>

      {/* Filter Dropdown */}
      <FileFilterDropdown
        typeFilter={typeFilter}
        onTypeFilterChange={onTypeFilterChange}
        directionFilter={directionFilter}
        onDirectionFilterChange={onDirectionFilterChange}
        tagFilter={tagFilter}
        onTagFilterChange={onTagFilterChange}
        projectFilter={projectFilter}
        onProjectFilterChange={onProjectFilterChange}
        projects={projects}
        availableTags={availableTags}
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right-side actions - ghost style */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
        onClick={onUploadClick}
      >
        <Plus className="size-4" />
        Upload File
      </Button>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function FilesTab({ clientId, clientName: _clientName, className }: FilesTabProps) {
  const [files, setFiles] = useState<ClientFile[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [availableTags, setAvailableTags] = useState<FileTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // Selected file for detail panel
  const [selectedFile, setSelectedFile] = useState<ClientFile | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [directionFilter, setDirectionFilter] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);

  // Download state
  const [isDownloadingSelected, setIsDownloadingSelected] = useState(false);

  const columns = useMemo(() => createColumns(), []);

  // Fetch files function
  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getClientFiles(clientId);
      setFiles(data.files);
      setProjects(data.projects);
      setAvailableTags(data.availableTags);
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  // Fetch files on mount
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Handle row click to select file
  const handleRowClick = useCallback((file: ClientFile) => {
    setSelectedFile(file);
  }, []);

  // Handle closing detail panel
  const handleClosePanel = useCallback(() => {
    setSelectedFile(null);
  }, []);

  // File operation handlers
  const handleUpdateDescription = useCallback(async (fileId: string, description: string) => {
    const result = await updateFileDescription(fileId, description);
    if (result.success) {
      // Update local state
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, description } : f))
      );
      setSelectedFile((prev) =>
        prev?.id === fileId ? { ...prev, description } : prev
      );
    }
  }, []);

  const handleUpdateDirection = useCallback(async (
    fileId: string,
    direction: "from_client" | "to_client" | "internal"
  ) => {
    const result = await updateFileDirection(fileId, direction);
    if (result.success) {
      const sharedWithClient = direction === "to_client";
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, direction, sharedWithClient } : f
        )
      );
      setSelectedFile((prev) =>
        prev?.id === fileId ? { ...prev, direction, sharedWithClient } : prev
      );
    }
  }, []);

  const handleUpdateProject = useCallback(async (fileId: string, projectId: string | null) => {
    const result = await updateFileProject(fileId, projectId);
    if (result.success) {
      const project = projectId ? projects.find((p) => p.id === projectId) : null;
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, projectId, projectName: project?.name || null }
            : f
        )
      );
      setSelectedFile((prev) =>
        prev?.id === fileId
          ? { ...prev, projectId, projectName: project?.name || null }
          : prev
      );
    }
  }, [projects]);

  const handleAddTag = useCallback(async (fileId: string, tagId: string) => {
    const result = await addFileTag(fileId, tagId);
    if (result.success) {
      const tag = availableTags.find((t) => t.id === tagId);
      if (tag) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId ? { ...f, tags: [...f.tags, tag] } : f
          )
        );
        setSelectedFile((prev) =>
          prev?.id === fileId ? { ...prev, tags: [...prev.tags, tag] } : prev
        );
      }
    }
  }, [availableTags]);

  const handleRemoveTag = useCallback(async (fileId: string, tagId: string) => {
    const result = await removeFileTag(fileId, tagId);
    if (result.success) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, tags: f.tags.filter((t) => t.id !== tagId) }
            : f
        )
      );
      setSelectedFile((prev) =>
        prev?.id === fileId
          ? { ...prev, tags: prev.tags.filter((t) => t.id !== tagId) }
          : prev
      );
    }
  }, []);

  const handleDeleteFile = useCallback(async (fileId: string) => {
    const result = await deleteFile(fileId);
    if (result.success) {
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      setSelectedFile(null);
    }
  }, []);

  const handleDownloadFile = useCallback(async (fileId: string) => {
    const result = await getFileDownloadUrl(fileId);
    if (result.success && result.url) {
      // Open download URL in new tab
      window.open(result.url, "_blank");
    }
  }, []);

  // Apply filters - MUST be defined before bulk handlers that use it
  const filteredFiles = useMemo(() => {
    let result = files;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.fileName.toLowerCase().includes(query) ||
          f.projectName?.toLowerCase().includes(query) ||
          f.tags.some((t) => t.label.toLowerCase().includes(query))
      );
    }

    // Project filter
    if (projectFilter === "none") {
      result = result.filter((f) => !f.projectId);
    } else if (projectFilter !== "all") {
      result = result.filter((f) => f.projectId === projectFilter);
    }

    // Type filter (now supports multiple selections)
    if (typeFilter.length > 0) {
      result = result.filter((f) => {
        // Check if file matches any of the selected types
        return typeFilter.some((filterType) => {
          if (filterType === "link") return f.fileType === "link";
          if (filterType === "file") return f.fileType === "file" && !["image", "pdf", "document", "spreadsheet"].includes(getFileType(f.mimeType, f.fileType).toLowerCase());
          // For specific file types, check mime type
          const fileTypeLabel = getFileType(f.mimeType, f.fileType).toLowerCase();
          return fileTypeLabel === filterType;
        });
      });
    }

    // Direction filter
    if (directionFilter.length > 0) {
      result = result.filter((f) => directionFilter.includes(f.direction));
    }

    // Tag filter
    if (tagFilter.length > 0) {
      result = result.filter((f) =>
        tagFilter.some((tagId) => f.tags.some((t) => t.id === tagId))
      );
    }

    return result;
  }, [files, searchQuery, projectFilter, typeFilter, directionFilter, tagFilter]);

  // Helper to create and download a ZIP file
  const createAndDownloadZip = useCallback(
    async (
      files: Array<{ fileName: string; url: string }>,
      zipName: string
    ) => {
      const zip = new JSZip();
      const fileNameCounts: Record<string, number> = {};

      // Download each file and add to ZIP
      for (const file of files) {
        try {
          const response = await fetch(file.url);
          const blob = await response.blob();

          // Handle duplicate filenames by appending a number
          let fileName = file.fileName;
          if (fileNameCounts[fileName]) {
            const ext = fileName.lastIndexOf(".");
            const name = ext > 0 ? fileName.slice(0, ext) : fileName;
            const extension = ext > 0 ? fileName.slice(ext) : "";
            fileName = `${name} (${fileNameCounts[fileName]})${extension}`;
          }
          fileNameCounts[file.fileName] = (fileNameCounts[file.fileName] || 0) + 1;

          zip.file(fileName, blob);
        } catch (error) {
          console.error(`Error downloading ${file.fileName}:`, error);
        }
      }

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = zipName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    []
  );

  // Download selected files
  const handleDownloadSelected = useCallback(async () => {
    const selectedIds = Object.keys(rowSelection).filter(
      (key) => rowSelection[key]
    );
    const selectedFileIds = selectedIds.map(
      (idx) => filteredFiles[parseInt(idx)]?.id
    ).filter(Boolean);

    if (selectedFileIds.length === 0) return;

    setIsDownloadingSelected(true);
    try {
      const result = await getBulkDownloadUrls(selectedFileIds);
      if (result.success && result.files && result.files.length > 0) {
        await createAndDownloadZip(result.files, `selected-files-${Date.now()}.zip`);
      }
    } catch (error) {
      console.error("Error downloading selected files:", error);
    } finally {
      setIsDownloadingSelected(false);
    }
  }, [rowSelection, filteredFiles, createAndDownloadZip]);

  // Bulk delete
  const handleBulkDelete = useCallback(async () => {
    const selectedIds = Object.keys(rowSelection).filter(
      (key) => rowSelection[key]
    );
    const selectedFileIds = selectedIds.map(
      (idx) => filteredFiles[parseInt(idx)]?.id
    ).filter(Boolean);

    if (selectedFileIds.length === 0) return;

    const result = await bulkDeleteFiles(selectedFileIds);
    if (result.success) {
      setFiles((prev) => prev.filter((f) => !selectedFileIds.includes(f.id)));
      setRowSelection({});
      setSelectedFile(null);
    }
  }, [rowSelection, filteredFiles]);

  // Bulk update direction
  const handleBulkSetDirection = useCallback(
    async (direction: "from_client" | "to_client" | "internal") => {
      const selectedIds = Object.keys(rowSelection).filter(
        (key) => rowSelection[key]
      );
      const selectedFileIds = selectedIds.map(
        (idx) => filteredFiles[parseInt(idx)]?.id
      ).filter(Boolean);

      if (selectedFileIds.length === 0) return;

      const result = await bulkUpdateDirection(selectedFileIds, direction);
      if (result.success) {
        const sharedWithClient = direction === "to_client";
        setFiles((prev) =>
          prev.map((f) =>
            selectedFileIds.includes(f.id)
              ? { ...f, direction, sharedWithClient }
              : f
          )
        );
      }
    },
    [rowSelection, filteredFiles]
  );

  // Bulk update project
  const handleBulkSetProject = useCallback(
    async (projectId: string | null) => {
      const selectedIds = Object.keys(rowSelection).filter(
        (key) => rowSelection[key]
      );
      const selectedFileIds = selectedIds.map(
        (idx) => filteredFiles[parseInt(idx)]?.id
      ).filter(Boolean);

      if (selectedFileIds.length === 0) return;

      const result = await bulkUpdateProject(selectedFileIds, projectId);
      if (result.success) {
        const project = projectId ? projects.find((p) => p.id === projectId) : null;
        setFiles((prev) =>
          prev.map((f) =>
            selectedFileIds.includes(f.id)
              ? { ...f, projectId, projectName: project?.name || null }
              : f
          )
        );
      }
    },
    [rowSelection, filteredFiles, projects]
  );

  // Bulk add tags
  const handleBulkAddTags = useCallback(
    async (tagIds: string[]) => {
      const selectedIds = Object.keys(rowSelection).filter(
        (key) => rowSelection[key]
      );
      const selectedFileIds = selectedIds.map(
        (idx) => filteredFiles[parseInt(idx)]?.id
      ).filter(Boolean);

      if (selectedFileIds.length === 0 || tagIds.length === 0) return;

      const result = await bulkAddTags(selectedFileIds, tagIds);
      if (result.success) {
        const newTags = availableTags.filter((t) => tagIds.includes(t.id));
        setFiles((prev) =>
          prev.map((f) => {
            if (selectedFileIds.includes(f.id)) {
              const existingTagIds = f.tags.map((t) => t.id);
              const tagsToAdd = newTags.filter(
                (t) => !existingTagIds.includes(t.id)
              );
              return { ...f, tags: [...f.tags, ...tagsToAdd] };
            }
            return f;
          })
        );
      }
    },
    [rowSelection, filteredFiles, availableTags]
  );

  // Clear selection
  const handleClearSelection = useCallback(() => {
    setRowSelection({});
  }, []);

  // Computed values for selection
  const selectedCount = useMemo(() => {
    return Object.values(rowSelection).filter(Boolean).length;
  }, [rowSelection]);

  const downloadableCount = useMemo(() => {
    const selectedIndices = Object.keys(rowSelection).filter(
      (key) => rowSelection[key]
    );
    return selectedIndices.filter((idx) => {
      const file = filteredFiles[parseInt(idx)];
      return file && file.fileType !== "link";
    }).length;
  }, [rowSelection, filteredFiles]);

  const table = useReactTable({
    data: filteredFiles,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
  });

  if (isLoading) {
    return (
      <div className={cn("p-6", className)}>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <>
      {/* Upload Dialog */}
      <FileUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        clientId={clientId}
        projects={projects}
        availableTags={availableTags}
        onUploadComplete={fetchFiles}
      />

      <div className={cn("flex h-full", className)}>
        {/* Left Side - Toolbar + Table */}
        <div className="flex-1 min-w-0 p-6 space-y-4">
          {/* Toolbar */}
          <Toolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            projectFilter={projectFilter}
            onProjectFilterChange={setProjectFilter}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            directionFilter={directionFilter}
            onDirectionFilterChange={setDirectionFilter}
            tagFilter={tagFilter}
            onTagFilterChange={setTagFilter}
            projects={projects}
            availableTags={availableTags}
            onUploadClick={() => setUploadDialogOpen(true)}
          />

          {/* Table */}
          <div className="rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={cn(
                          header.id === "select" && "w-12",
                          header.id === "actions" && "w-12"
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-48">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="size-10 rounded-full bg-muted flex items-center justify-center mb-3">
                          <FolderOpen className="size-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium">No files yet</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Upload files to share with this client or store internally.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={cn(
                        "hover:bg-muted/50 cursor-pointer",
                        selectedFile?.id === row.original.id && "bg-muted/50"
                      )}
                      onClick={() => handleRowClick(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Right Side - Detail Panel (spans full height when open) */}
        {selectedFile && (
          <div className="w-[340px] shrink-0 border-l">
            <FileDetailPanel
              file={selectedFile}
              onClose={handleClosePanel}
              onDelete={handleDeleteFile}
              onDownload={handleDownloadFile}
              onUpdateDescription={handleUpdateDescription}
              onUpdateDirection={handleUpdateDirection}
              onUpdateProject={handleUpdateProject}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              projects={projects}
              availableTags={availableTags}
              className="h-full"
            />
          </div>
        )}
      </div>

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedCount}
        downloadableCount={downloadableCount}
        onClearSelection={handleClearSelection}
        onDownloadSelected={handleDownloadSelected}
        onDeleteSelected={handleBulkDelete}
        onSetDirection={handleBulkSetDirection}
        onSetProject={handleBulkSetProject}
        onAddTags={handleBulkAddTags}
        projects={projects}
        availableTags={availableTags}
        isDownloading={isDownloadingSelected}
      />
    </>
  );
}
