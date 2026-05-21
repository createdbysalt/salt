"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  CheckCircle2,
  FileText,
  Filter,
  Plus,
  Search,
  Settings2,
} from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Input,
  StatusPill,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui";
import { PageBanner } from "@repo/patterns";
import { cn } from "@repo/utils";
import { MOCK_PEOPLE } from "@/app/_lib/demo";
import { getMockPersonFiles } from "@/app/_features/people/components/person-detail/getMockPersonFiles";

type ViewMode = "recent" | "directory";
type FileFilter = "all" | "linked" | "review";

type MockConnectionFile = ReturnType<typeof getMockFiles>[number];

const FILE_FILTERS = [
  { label: "All", value: "all" as const },
  { label: "Linked", value: "linked" as const },
  { label: "Needs review", value: "review" as const },
];

export function FilesPage() {
  const [mode, setMode] = React.useState<ViewMode>("recent");
  const [filter, setFilter] = React.useState<FileFilter>("all");

  const files = React.useMemo(() => getMockFiles(), []);
  const reviewCount = files.filter((file) => !file.isConfirmed).length;

  const viewTabs = React.useMemo(
    () => [
      {
        label: (
          <span className="flex items-center">
            Recent
            {files.length > 0 && <TabBadge count={files.length} />}
          </span>
        ),
        value: "recent" as const,
      },
      { label: "Directory", value: "directory" as const },
    ],
    [files.length]
  );

  return (
    <div className="w-full px-16 py-8">
      <PageBanner
        size="hero"
        eyebrow="CONNECTIONS"
        title="Files"
        subtitle="Artifacts and links connected across people, orgs, work, teams, and notes."
        tabs={viewTabs}
        activeTab={mode}
        onTabChange={(value) => setMode(value as ViewMode)}
        fullWidthDivider
        actions={
          <Button size="sm" className="cursor-pointer" onClick={openNewFileCapture}>
            <Plus className="size-3.5" />
            New file
          </Button>
        }
      />

      {mode === "recent" && (
        <RecentFilesView
          files={files.slice(0, 6)}
          reviewCount={reviewCount}
          onViewDirectory={(nextFilter) => {
            setFilter(nextFilter ?? "all");
            setMode("directory");
          }}
        />
      )}
      {mode === "directory" && (
        <FilesDirectoryView files={files} filter={filter} onFilterChange={setFilter} />
      )}
    </div>
  );
}

function TabBadge({ count }: { count: number }) {
  return (
    <span
      className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-light text-foreground"
      style={{ backgroundColor: "#e8e9fe" }}
    >
      {count}
    </span>
  );
}

function RecentFilesView({
  files,
  reviewCount,
  onViewDirectory,
}: {
  files: MockConnectionFile[];
  reviewCount: number;
  onViewDirectory: (filter?: FileFilter) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{files.length} recent files</span> connected to the graph.
        {reviewCount > 0 ? ` ${reviewCount} need link review.` : ""}
      </p>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex flex-col gap-3 border-b border-border px-4 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <FileSummary file={file} />
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewDirectory(file.isConfirmed ? "linked" : "review")}
            >
              View in directory
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FileSummary({ file }: { file: MockConnectionFile }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
        <FileText className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold leading-tight">{file.name}</p>
          <FileStatusPill isConfirmed={file.isConfirmed} />
        </div>
        <p className="text-sm leading-snug text-foreground">{file.reason}</p>
        <p className="text-xs text-muted-foreground">
          {file.kind} · {file.source} · Linked to {file.linkedTo}
        </p>
      </div>
    </div>
  );
}

function FilesDirectoryView({
  files,
  filter,
  onFilterChange,
}: {
  files: MockConnectionFile[];
  filter: FileFilter;
  onFilterChange: (filter: FileFilter) => void;
}) {
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredFiles = React.useMemo(
    () =>
      files
        .filter((file) => matchesFileFilter(file, filter))
        .filter((file) => matchesSearchQuery(file, searchQuery)),
    [files, filter, searchQuery]
  );

  const clearFilters = () => {
    onFilterChange("all");
    setSearchQuery("");
  };

  return (
    <FilesDirectoryTable
      files={filteredFiles}
      filter={filter}
      searchQuery={searchQuery}
      onFilterChange={onFilterChange}
      onSearchQueryChange={setSearchQuery}
      onClearFilters={clearFilters}
    />
  );
}

function SortableColumnHeader<TData, TValue>({
  column,
  title,
}: {
  column: Column<TData, TValue>;
  title: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 cursor-pointer px-2"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {title}
      <ArrowUpDown className="size-3.5" />
    </Button>
  );
}

function getFilesDirectoryColumns(): ColumnDef<MockConnectionFile>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => <SortableColumnHeader column={column} title="File" />,
      cell: ({ row }) => <FileSummary file={row.original} />,
      enableHiding: false,
    },
    {
      accessorKey: "linkedTo",
      header: ({ column }) => <SortableColumnHeader column={column} title="Linked to" />,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.linkedTo}</span>
      ),
    },
    {
      accessorKey: "kind",
      header: ({ column }) => <SortableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.kind}</span>,
    },
    {
      accessorKey: "source",
      header: ({ column }) => <SortableColumnHeader column={column} title="Source" />,
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.source}</span>,
    },
    {
      accessorKey: "updated",
      header: ({ column }) => <SortableColumnHeader column={column} title="Updated" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.updated}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <FileStatusPill isConfirmed={row.original.isConfirmed} />,
    },
  ];
}

function FilesDirectoryTable({
  files,
  filter,
  searchQuery,
  onFilterChange,
  onSearchQueryChange,
  onClearFilters,
}: {
  files: MockConnectionFile[];
  filter: FileFilter;
  searchQuery: string;
  onFilterChange: (filter: FileFilter) => void;
  onSearchQueryChange: (query: string) => void;
  onClearFilters: () => void;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "updated", desc: true },
  ]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const columns = React.useMemo(() => getFilesDirectoryColumns(), []);
  const table = useReactTable({
    data: files,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: (row) => row.id,
    state: { sorting, columnVisibility },
  });

  return (
    <div className="space-y-3">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <ColumnVisibilityMenu table={table} />
          <FilesFilterMenu
            filter={filter}
            onFilterChange={onFilterChange}
            onClearFilters={onClearFilters}
          />
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2 py-6">
                    <div>
                      <p className="text-sm font-medium">No files match these filters</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Try clearing search or choosing a different file status.
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" className="h-8" onClick={onClearFilters}>
                      Clear filters
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ColumnVisibilityMenu({
  table,
}: {
  table: ReturnType<typeof useReactTable<MockConnectionFile>>;
}) {
  const labelMap: Record<string, string> = {
    linkedTo: "Linked to",
    kind: "Type",
    source: "Source",
    updated: "Updated",
    status: "Status",
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 cursor-pointer">
          <Settings2 className="size-3.5" />
          Display
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {table
          .getAllColumns()
          .filter((column) => column.getCanHide())
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
            >
              {labelMap[column.id] ?? column.id}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilesFilterMenu({
  filter,
  onFilterChange,
  onClearFilters,
}: {
  filter: FileFilter;
  onFilterChange: (filter: FileFilter) => void;
  onClearFilters: () => void;
}) {
  const [showFilterMenu, setShowFilterMenu] = React.useState(false);
  const hasActiveFilters = filter !== "all";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowFilterMenu((value) => !value)}
        className={cn(
          "group/button inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg border bg-clip-padding px-2.5 text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 active:translate-y-px",
          hasActiveFilters
            ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
            : "border-border bg-background text-foreground hover:bg-muted"
        )}
      >
        <Filter className="size-3.5" />
        <span>Filter</span>
        {hasActiveFilters && (
          <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
            1
          </span>
        )}
      </button>
      {showFilterMenu && (
        <div className="absolute right-0 top-full z-10 mt-1 w-56 rounded-lg border border-border bg-card py-1 shadow-lg">
          <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Status
          </div>
          {FILE_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onFilterChange(option.value)}
              className={cn(
                "flex w-full items-center justify-between px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted",
                filter === option.value && "bg-muted"
              )}
            >
              <span>{option.label}</span>
              {filter === option.value && <CheckCircle2 className="size-3.5 text-primary" />}
            </button>
          ))}
          {hasActiveFilters && (
            <>
              <div className="my-1 border-t border-border" />
              <button
                type="button"
                onClick={onClearFilters}
                className="w-full px-3 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Clear filters
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function FileStatusPill({ isConfirmed }: { isConfirmed: boolean }) {
  return (
    <StatusPill
      color={isConfirmed ? "var(--relationship-clients)" : "var(--relationship-team)"}
      label={isConfirmed ? "LINKED" : "CHECK"}
    />
  );
}

function getMockFiles() {
  return MOCK_PEOPLE.flatMap((person) =>
    getMockPersonFiles(person).map((file) => ({
      ...file,
      id: `${person.id}_${file.id}`,
      linkedTo: person.name,
      linkedEntityType: "person" as const,
      linkedEntityId: person.id,
    }))
  );
}

function matchesFileFilter(file: MockConnectionFile, filter: FileFilter) {
  switch (filter) {
    case "linked":
      return file.isConfirmed;
    case "review":
      return !file.isConfirmed;
    case "all":
      return true;
  }
}

function matchesSearchQuery(file: MockConnectionFile, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [
    file.name,
    file.kind,
    file.source,
    file.updated,
    file.reason,
    file.linkedTo,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

function openNewFileCapture() {
  window.dispatchEvent(
    new CustomEvent("salt:open-capture", {
      detail: { intent: "file" },
    })
  );
}
