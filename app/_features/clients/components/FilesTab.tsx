"use client";

import * as React from "react";
import { useEffect, useState, useMemo } from "react";
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
  Lock,
  Eye,
  Trash2,
  ExternalLink,
  FolderOpen,
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
} from "@repo/ui";
import { cn } from "@repo/utils";
import {
  getClientFiles,
  type ClientFile,
  type FileTag,
} from "@/app/actions/files/get-client-files";

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

function getFileIcon(mimeType: string | null) {
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

function formatFileSize(bytes: number): string {
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

function getFileType(mimeType: string | null): string {
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
            {getFileIcon(file.mimeType)}
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
          {getFileType(row.original.mimeType)}
        </span>
      ),
      sortingFn: (rowA, rowB) => {
        const a = getFileType(rowA.original.mimeType);
        const b = getFileType(rowB.original.mimeType);
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
          {formatFileSize(row.original.sizeBytes)}
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
// Toolbar
// =============================================================================

interface ToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  projectFilter: string;
  onProjectFilterChange: (projectId: string) => void;
  tagFilter: string[];
  onTagFilterChange: (tagIds: string[]) => void;
  projects: Array<{ id: string; name: string }>;
  availableTags: FileTag[];
}

function Toolbar({
  searchQuery,
  onSearchChange,
  projectFilter,
  onProjectFilterChange,
  tagFilter,
  onTagFilterChange,
  projects,
  availableTags,
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

      {/* Project Filter */}
      <Select value={projectFilter} onValueChange={onProjectFilterChange}>
        <SelectTrigger className="h-9 w-[140px] bg-muted/50 border-transparent">
          <SelectValue placeholder="All projects" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All projects</SelectItem>
          <SelectItem value="none">No project</SelectItem>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Tag Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground">
            <SlidersHorizontal className="size-4" />
            Filter
            {tagFilter.length > 0 && (
              <Badge variant="secondary" className="ml-0.5 px-1.5 min-w-[20px] h-5">
                {tagFilter.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="start">
          <div className="space-y-2">
            <p className="text-sm font-medium">Filter by tags</p>
            <div className="space-y-1">
              {availableTags.map((tag) => (
                <label
                  key={tag.id}
                  className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted cursor-pointer"
                >
                  <Checkbox
                    checked={tagFilter.includes(tag.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onTagFilterChange([...tagFilter, tag.id]);
                      } else {
                        onTagFilterChange(tagFilter.filter((id) => id !== tag.id));
                      }
                    }}
                  />
                  <span className="text-sm">{tag.label}</span>
                </label>
              ))}
            </div>
            {tagFilter.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2"
                onClick={() => onTagFilterChange([])}
              >
                Clear filters
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right-side actions - ghost style */}
      <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground">
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

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState<string[]>([]);

  const columns = useMemo(() => createColumns(), []);

  // Fetch files on mount
  useEffect(() => {
    async function fetchFiles() {
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
    }

    fetchFiles();
  }, [clientId]);

  // Apply filters
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

    // Tag filter
    if (tagFilter.length > 0) {
      result = result.filter((f) =>
        tagFilter.some((tagId) => f.tags.some((t) => t.id === tagId))
      );
    }

    return result;
  }, [files, searchQuery, projectFilter, tagFilter]);

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
    <div className={cn("p-6 space-y-4", className)}>
      {/* Toolbar */}
      <Toolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        projectFilter={projectFilter}
        onProjectFilterChange={setProjectFilter}
        tagFilter={tagFilter}
        onTagFilterChange={setTagFilter}
        projects={projects}
        availableTags={availableTags}
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
                <TableRow key={row.id} className="hover:bg-muted/50">
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
  );
}
