"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type Table as TanStackTable,
  type VisibilityState,
} from "@tanstack/react-table";
import Link from "next/link";
import {
  Archive,
  ArrowRight,
  ArrowUpDown,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  Filter,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Sparkles,
  StickyNote,
  Trash2,
} from "lucide-react";
import {
  Button,
  Checkbox,
  Card,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import {
  MOCK_PEOPLE,
  MOCK_PROJECTS,
  MOCK_TEAMS,
  type MockProject,
} from "@/app/_lib/demo";
import { useMockContent } from "@/app/_features/shell/contexts/DashboardUserContext";
import { MockContentEmptyState } from "@/app/_features/shell/components/MockContentEmptyState";

type ViewMode = "worth_attention" | "directory";
type DirectoryFilter = "all" | "active" | "stalled" | "complete" | "on_hold";
type SignalFilter = "payment_due" | "overdue" | "high_progress";

const DIRECTORY_FILTERS = [
  { label: "All", value: "all" as const },
  { label: "Active", value: "active" as const },
  { label: "Stalled", value: "stalled" as const },
  { label: "Complete", value: "complete" as const },
  { label: "On hold", value: "on_hold" as const },
];

const SIGNAL_FILTERS = [
  { label: "Payment due", value: "payment_due" as const },
  { label: "Over 30 days", value: "overdue" as const },
  { label: "High progress", value: "high_progress" as const },
];

export function WorkPage() {
  const mockContent = useMockContent();
  const [mode, setMode] = React.useState<ViewMode>("worth_attention");
  const [directoryFilter, setDirectoryFilter] = React.useState<DirectoryFilter>("all");
  const [signalFilter, setSignalFilter] = React.useState<SignalFilter | null>(null);

  const attentionProjects = React.useMemo(
    () =>
      mockContent
        ? [...MOCK_PROJECTS]
            .filter((project) => projectPriority(project) > 0)
            .sort(
              (a, b) =>
                projectPriority(b) - projectPriority(a) || a.name.localeCompare(b.name),
            )
        : [],
    [mockContent],
  );

  const viewTabs = React.useMemo(
    () => [
      {
        label: (
          <span className="flex items-center">
            Worth Attention
            {attentionProjects.length > 0 && <TabBadge count={attentionProjects.length} />}
          </span>
        ),
        value: "worth_attention" as const,
      },
      { label: "Directory", value: "directory" as const },
    ],
    [attentionProjects.length]
  );

  return (
    <div className="w-full px-16 py-8">
      <PageBanner
        size="hero"
        eyebrow="CONNECTIONS"
        title="Work"
        subtitle="Projects and commitments tracked with the people, teams, and account context needed to keep momentum."
        tabs={viewTabs}
        activeTab={mode}
        onTabChange={(value) => setMode(value as ViewMode)}
        fullWidthDivider
        actions={
          <Button size="sm" className="cursor-pointer" onClick={openNewWorkCapture}>
            <Plus className="size-3.5" />
            New work
          </Button>
        }
      />

      {mode === "worth_attention" &&
        (mockContent ? (
          <WorthAttentionView
            projects={attentionProjects}
            onViewDirectory={(options) => {
              setDirectoryFilter(options?.filter ?? "all");
              setSignalFilter(options?.signal ?? null);
              setMode("directory");
            }}
          />
        ) : (
          <MockContentEmptyState
            title="No work items yet"
            description="Projects and deliverables show up here once you add work or connect your tools."
            className="mt-6"
          />
        ))}
      {mode === "directory" && (
        <DirectoryView
          filter={directoryFilter}
          signalFilter={signalFilter}
          onFilterChange={setDirectoryFilter}
          onSignalFilterChange={setSignalFilter}
        />
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

function WorthAttentionView({
  projects,
  onViewDirectory,
}: {
  projects: MockProject[];
  onViewDirectory: (options?: {
    filter?: DirectoryFilter;
    signal?: SignalFilter | null;
  }) => void;
}) {
  if (projects.length === 0) {
    return (
      <Card className="px-6 py-10 text-center">
        <CheckCircle2 className="mx-auto mb-3 size-8 text-muted-foreground/60" />
        <p className="text-sm font-semibold tracking-tight">Work is caught up</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Salt will surface project attention when momentum, payment, or deadline signals change.
        </p>
        <Button size="sm" variant="outline" className="mt-4" onClick={() => onViewDirectory()}>
          Browse Directory
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{projects.length} work items</span> worth attention right now.
      </p>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {projects.map((project) => (
          <ProjectAttentionRow
            key={project.id}
            project={project}
            onViewDirectory={onViewDirectory}
          />
        ))}
      </div>
    </div>
  );
}

function ProjectAttentionRow({
  project,
  onViewDirectory,
}: {
  project: MockProject;
  onViewDirectory: (options?: {
    filter?: DirectoryFilter;
    signal?: SignalFilter | null;
  }) => void;
}) {
  const team = project.teamId ? MOCK_TEAMS.find((item) => item.id === project.teamId) : undefined;
  const people = MOCK_PEOPLE.filter((person) => person.organizationId === project.organizationId);
  const paymentSignal = getProjectPaymentSignal(project.organizationId);
  const primarySignal =
    project.status === "stalled"
      ? "Stalled and waiting on a next move"
      : paymentSignal
        ? paymentSignal
        : project.daysActive >= 30
          ? `${project.daysActive} days active`
          : project.nextMilestone;

  return (
    <div className="flex flex-col gap-3 border-b border-border px-4 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
          <Briefcase className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/work/${project.id}`}
              className="text-sm font-semibold leading-tight transition-colors hover:text-primary"
            >
              {project.name}
            </Link>
            <ProjectStatusPill status={project.status} />
          </div>
          <p className="text-sm leading-snug text-foreground">{primarySignal}</p>
          <p className="text-xs text-muted-foreground">
            {project.organizationName}
            {team ? ` · ${team.name}` : ""}
            {` · ${people.length} linked people`}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 pl-12 sm:pl-0">
        <Button
          size="sm"
          onClick={() =>
            onViewDirectory({
              filter: project.status,
              signal: paymentSignal ? "payment_due" : project.daysActive >= 30 ? "overdue" : null,
            })
          }
        >
          View in directory
        </Button>
      </div>
    </div>
  );
}

function DirectoryView({
  filter,
  signalFilter,
  onFilterChange,
  onSignalFilterChange,
}: {
  filter: DirectoryFilter;
  signalFilter: SignalFilter | null;
  onFilterChange: (filter: DirectoryFilter) => void;
  onSignalFilterChange: (filter: SignalFilter | null) => void;
}) {
  const mockContent = useMockContent();
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredProjects = React.useMemo(
    () =>
      (mockContent ? MOCK_PROJECTS : [])
        .filter((project) => matchesDirectoryFilter(project, filter))
        .filter((project) => matchesSignalFilter(project, signalFilter))
        .filter((project) => matchesSearchQuery(project, searchQuery)),
    [mockContent, filter, signalFilter, searchQuery],
  );

  const clearFilters = () => {
    onFilterChange("all");
    onSignalFilterChange(null);
    setSearchQuery("");
  };

  return (
    <WorkDirectoryTable
      projects={filteredProjects}
      searchQuery={searchQuery}
      filter={filter}
      signalFilter={signalFilter}
      onSearchQueryChange={setSearchQuery}
      onFilterChange={onFilterChange}
      onSignalFilterChange={onSignalFilterChange}
      onClearFilters={clearFilters}
    />
  );
}

function SortableColumnHeader<TData, TValue>({
  column,
  title,
  align = "left",
}: {
  column: Column<TData, TValue>;
  title: string;
  align?: "left" | "right";
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("h-8 cursor-pointer px-2", align === "right" && "ml-auto")}
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {title}
      <ArrowUpDown className="size-3.5" />
    </Button>
  );
}

function getWorkDirectoryColumns(): ColumnDef<MockProject>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <div
          className="flex items-center justify-center"
          onClick={(event) => event.stopPropagation()}
        >
          <Checkbox
            className="rounded-[3px]"
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all work"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div
          className="flex items-center justify-center"
          onClick={(event) => event.stopPropagation()}
        >
          <Checkbox
            className="rounded-[3px]"
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={`Select ${row.original.name}`}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => <SortableColumnHeader column={column} title="Work" />,
      cell: ({ row }) => {
        const project = row.original;
        return (
          <Link href={`/work/${project.id}`} className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-muted">
              <Briefcase className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{project.name}</p>
              <p className="truncate text-xs text-muted-foreground">{project.nextMilestone}</p>
            </div>
          </Link>
        );
      },
      enableHiding: false,
    },
    {
      accessorKey: "organizationName",
      header: ({ column }) => <SortableColumnHeader column={column} title="Org" />,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.organizationName}</span>
      ),
    },
    {
      accessorFn: (project) =>
        project.teamId ? MOCK_TEAMS.find((team) => team.id === project.teamId)?.name ?? "" : "",
      id: "team",
      header: ({ column }) => <SortableColumnHeader column={column} title="Team" />,
      cell: ({ row }) => {
        const team = row.original.teamId
          ? MOCK_TEAMS.find((item) => item.id === row.original.teamId)
          : undefined;
        return <span className="text-sm text-muted-foreground">{team?.name ?? "Unassigned"}</span>;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <ProjectStatusPill status={row.original.status} />,
    },
    {
      id: "signals",
      header: "Signals",
      cell: ({ row }) => <ProjectSignal project={row.original} />,
      enableSorting: false,
    },
    {
      accessorKey: "daysActive",
      header: ({ column }) => <SortableColumnHeader column={column} title="Age" align="right" />,
      cell: ({ row }) => (
        <div className="text-right font-mono text-xs text-muted-foreground tabular-nums">
          {row.original.daysActive}d
        </div>
      ),
    },
    {
      accessorKey: "progress",
      header: ({ column }) => <SortableColumnHeader column={column} title="Progress" align="right" />,
      cell: ({ row }) => (
        <div className="text-right font-mono text-xs text-muted-foreground tabular-nums">
          {row.original.progress}%
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <WorkRowActions project={row.original} />,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}

function WorkDirectoryTable({
  projects,
  searchQuery,
  filter,
  signalFilter,
  onSearchQueryChange,
  onFilterChange,
  onSignalFilterChange,
  onClearFilters,
}: {
  projects: MockProject[];
  searchQuery: string;
  filter: DirectoryFilter;
  signalFilter: SignalFilter | null;
  onSearchQueryChange: (query: string) => void;
  onFilterChange: (filter: DirectoryFilter) => void;
  onSignalFilterChange: (filter: SignalFilter | null) => void;
  onClearFilters: () => void;
}) {
  const bulkBarAnchorRef = React.useRef<HTMLDivElement>(null);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "daysActive", desc: true },
  ]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const columns = React.useMemo(() => getWorkDirectoryColumns(), []);

  React.useEffect(() => {
    setRowSelection({});
  }, [projects]);

  const table = useReactTable({
    data: projects,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: (row) => row.id,
    state: { rowSelection, sorting, columnVisibility },
  });

  const selectedProjects = table.getSelectedRowModel().rows.map((row) => row.original);

  return (
    <div ref={bulkBarAnchorRef} className="space-y-3">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search work..."
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <ColumnVisibilityMenu table={table} />
          <WorkDirectoryFilterMenu
            filter={filter}
            signalFilter={signalFilter}
            onFilterChange={onFilterChange}
            onSignalFilterChange={onSignalFilterChange}
            onClearFilters={onClearFilters}
          />
        </div>
      </div>
      <DirectoryBulkActionBar
        anchorRef={bulkBarAnchorRef}
        selectedCount={selectedProjects.length}
        entityLabel="work"
        onDraftMessage={() => draftMessageForProjects(selectedProjects)}
        onAddNote={() => addNoteForProjects(selectedProjects)}
        onArchive={() => archiveProjects(selectedProjects)}
        onDelete={() => deleteProjects(selectedProjects)}
      />
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={isRightAlignedColumn(header.column.id) ? "text-right" : undefined}
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
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={isRightAlignedColumn(cell.column.id) ? "text-right" : undefined}
                    >
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
                      <p className="text-sm font-medium">No work matches these filters</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Try clearing search or choosing a different Status or Signal filter.
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

function DirectoryBulkActionBar({
  anchorRef,
  selectedCount,
  entityLabel,
  onDraftMessage,
  onAddNote,
  onArchive,
  onDelete,
}: {
  anchorRef: React.RefObject<HTMLDivElement | null>;
  selectedCount: number;
  entityLabel: string;
  onDraftMessage: () => void;
  onAddNote: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [panelCenter, setPanelCenter] = React.useState<number | null>(null);

  React.useLayoutEffect(() => {
    if (selectedCount === 0) return;

    const anchor = anchorRef.current;
    if (!anchor) return;

    const updatePanelCenter = () => {
      const rect = anchor.getBoundingClientRect();
      setPanelCenter(rect.left + rect.width / 2);
    };

    updatePanelCenter();
    const resizeObserver = new ResizeObserver(updatePanelCenter);
    resizeObserver.observe(anchor);
    window.addEventListener("resize", updatePanelCenter);
    const animationFrame = window.requestAnimationFrame(updatePanelCenter);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updatePanelCenter);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [anchorRef, selectedCount]);

  if (selectedCount === 0) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 flex w-fit max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5"
      style={panelCenter === null ? undefined : { left: panelCenter }}
    >
      <div className="flex shrink-0 items-center gap-2 whitespace-nowrap border-r border-border/70 pr-2.5">
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-muted px-1.5 font-mono text-xs text-foreground">
          {selectedCount}
        </span>
        <div className="leading-none whitespace-nowrap">
          <p className="text-xs font-medium">selected</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 whitespace-nowrap">
        <Button size="xs" variant="ghost" className="cursor-pointer" onClick={onDraftMessage}>
          <MessageSquare className="size-3.5" />
          Draft message
        </Button>
        <Button size="xs" variant="ghost" className="cursor-pointer" onClick={onAddNote}>
          <StickyNote className="size-3.5" />
          Add note
        </Button>
        <Button size="xs" variant="ghost" className="cursor-pointer" onClick={onArchive}>
          <Archive className="size-3.5" />
          Archive
        </Button>
        <Button size="xs" variant="destructive" className="cursor-pointer" onClick={onDelete}>
          <Trash2 className="size-3.5" />
          Delete {entityLabel}
        </Button>
      </div>
    </div>
  );
}

function WorkRowActions({ project }: { project: MockProject }) {
  return (
    <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 cursor-pointer">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Open actions for {project.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href={`/work/${project.id}`}>
              <ArrowRight className="mr-2 size-4" />
              Open work
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => draftMessageForProjects([project])}>
            <MessageSquare className="mr-2 size-4" />
            Draft message
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addNoteForProjects([project])}>
            <StickyNote className="mr-2 size-4" />
            Add note
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => archiveProjects([project])}>
            <Archive className="mr-2 size-4" />
            Archive
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => deleteProjects([project])}
          >
            <Trash2 className="mr-2 size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function isRightAlignedColumn(columnId: string) {
  return ["daysActive", "progress"].includes(columnId);
}

function ColumnVisibilityMenu({ table }: { table: TanStackTable<MockProject> }) {
  const labelMap: Record<string, string> = {
    organizationName: "Org",
    team: "Team",
    status: "Status",
    signals: "Signals",
    daysActive: "Age",
    progress: "Progress",
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

function WorkDirectoryFilterMenu({
  filter,
  signalFilter,
  onFilterChange,
  onSignalFilterChange,
  onClearFilters,
}: {
  filter: DirectoryFilter;
  signalFilter: SignalFilter | null;
  onFilterChange: (filter: DirectoryFilter) => void;
  onSignalFilterChange: (filter: SignalFilter | null) => void;
  onClearFilters: () => void;
}) {
  const [showFilterMenu, setShowFilterMenu] = React.useState(false);
  const hasActiveFilters = filter !== "all" || signalFilter !== null;
  const activeFilterCount = (filter !== "all" ? 1 : 0) + (signalFilter ? 1 : 0);

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
            {activeFilterCount}
          </span>
        )}
        <ChevronDown className="size-3.5 opacity-50" />
      </button>
      {showFilterMenu && (
        <div className="absolute right-0 top-full z-10 mt-1 w-56 rounded-lg border border-border bg-card py-1 shadow-lg">
          <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Status
          </div>
          {DIRECTORY_FILTERS.map((option) => (
            <FilterMenuButton
              key={option.value}
              active={filter === option.value}
              onClick={() => onFilterChange(option.value)}
            >
              {option.label}
            </FilterMenuButton>
          ))}
          <div className="my-1 border-t border-border" />
          <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Signals
          </div>
          <FilterMenuButton active={signalFilter === null} onClick={() => onSignalFilterChange(null)}>
            Any signal
          </FilterMenuButton>
          {SIGNAL_FILTERS.map((option) => (
            <FilterMenuButton
              key={option.value}
              active={signalFilter === option.value}
              onClick={() => onSignalFilterChange(option.value)}
            >
              {option.label}
            </FilterMenuButton>
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

function FilterMenuButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted",
        active && "bg-muted"
      )}
    >
      <span>{children}</span>
      {active && <CheckCircle2 className="size-3.5 text-primary" />}
    </button>
  );
}

function ProjectStatusPill({ status }: { status: MockProject["status"] }) {
  const meta: Record<MockProject["status"], { label: string; color: string }> = {
    active: { label: "ACTIVE", color: "var(--relationship-clients)" },
    stalled: { label: "STALLED", color: "var(--relationship-vendors)" },
    complete: { label: "DONE", color: "var(--relationship-team)" },
    on_hold: { label: "ON HOLD", color: "var(--relationship-team)" },
  };

  return <StatusPill color={meta[status].color} label={meta[status].label} />;
}

function ProjectSignal({ project }: { project: MockProject }) {
  const paymentSignal = getProjectPaymentSignal(project.organizationId);

  if (project.status === "stalled") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
        <span className="size-1.5 rounded-[2px] bg-warning" />
        Stalled
      </span>
    );
  }

  if (paymentSignal) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
        <span className="size-1.5 rounded-[2px] bg-warning" />
        {paymentSignal}
      </span>
    );
  }

  if (project.progress >= 75) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
        <span className="size-1.5 rounded-[2px] bg-success" />
        High progress
      </span>
    );
  }

  return <span className="text-xs text-muted-foreground">No urgent signal</span>;
}

function projectPriority(project: MockProject) {
  const stalledScore = project.status === "stalled" ? 100 : 0;
  const deadlineScore = Math.max(0, 60 - project.daysActive);
  const paymentScore = getProjectPaymentSignal(project.organizationId) ? 30 : 0;
  return stalledScore + deadlineScore + paymentScore;
}

function matchesDirectoryFilter(project: MockProject, filter: DirectoryFilter) {
  return filter === "all" ? true : project.status === filter;
}

function matchesSignalFilter(project: MockProject, filter: SignalFilter | null) {
  if (!filter) return true;

  switch (filter) {
    case "payment_due":
      return getProjectPaymentSignal(project.organizationId) !== null;
    case "overdue":
      return project.daysActive >= 30;
    case "high_progress":
      return project.progress >= 75;
  }
}

function matchesSearchQuery(project: MockProject, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  const team = project.teamId ? MOCK_TEAMS.find((item) => item.id === project.teamId) : undefined;

  return [
    project.name,
    project.organizationName,
    project.status,
    project.nextMilestone,
    team?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

function getProjectPaymentSignal(organizationId: string) {
  const totalOutstanding = MOCK_PEOPLE
    .filter((person) => person.organizationId === organizationId)
    .reduce((sum, person) => sum + person.outstandingAmount, 0);

  if (totalOutstanding <= 0) return null;
  return `$${totalOutstanding.toLocaleString()} outstanding`;
}

function draftMessageForProjects(projects: MockProject[]) {
  window.dispatchEvent(
    new CustomEvent("salt:open-capture", {
      detail: {
        intent: "message",
        projects: projects.map((project) => project.id),
      },
    })
  );
}

function addNoteForProjects(projects: MockProject[]) {
  window.dispatchEvent(
    new CustomEvent("salt:open-capture", {
      detail: {
        intent: "note",
        projects: projects.map((project) => project.id),
      },
    })
  );
}

function archiveProjects(projects: MockProject[]) {
  window.dispatchEvent(
    new CustomEvent("salt:mock-action", {
      detail: {
        action: "archive_projects",
        projects: projects.map((project) => project.id),
      },
    })
  );
}

function deleteProjects(projects: MockProject[]) {
  window.dispatchEvent(
    new CustomEvent("salt:mock-action", {
      detail: {
        action: "delete_projects",
        projects: projects.map((project) => project.id),
      },
    })
  );
}

function openNewWorkCapture() {
  window.dispatchEvent(
    new CustomEvent("salt:open-capture", {
      detail: { intent: "work" },
    })
  );
}

function triggerAskSalt() {
  const event = new KeyboardEvent("keydown", {
    key: "k",
    metaKey: true,
    bubbles: true,
  });
  window.dispatchEvent(event);
}
