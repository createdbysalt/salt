"use client";

import * as React from "react";
import Link from "next/link";
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
import {
  Archive,
  ArrowRight,
  ArrowUpDown,
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
  Avatar,
  AvatarFallback,
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
  type MockTeam,
} from "@/app/_lib/demo";

type ViewMode = "worth_attention" | "directory";
type DirectoryFilter = "all" | "over_capacity" | "steady" | "open";
type SignalFilter = "active_work" | "shared_members";

const DIRECTORY_FILTERS = [
  { label: "All", value: "all" as const },
  { label: "Over capacity", value: "over_capacity" as const },
  { label: "Steady", value: "steady" as const },
  { label: "Open", value: "open" as const },
];

const SIGNAL_FILTERS = [
  { label: "Active work", value: "active_work" as const },
  { label: "Shared members", value: "shared_members" as const },
];

export function TeamsPage() {
  const [mode, setMode] = React.useState<ViewMode>("worth_attention");
  const [directoryFilter, setDirectoryFilter] = React.useState<DirectoryFilter>("all");
  const [signalFilter, setSignalFilter] = React.useState<SignalFilter | null>(null);

  const attentionTeams = React.useMemo(
    () =>
      [...MOCK_TEAMS]
        .filter((team) => getTeamAttentionScore(team) > 0)
        .sort((a, b) => getTeamAttentionScore(b) - getTeamAttentionScore(a)),
    []
  );

  const viewTabs = React.useMemo(
    () => [
      {
        label: (
          <span className="flex items-center">
            Worth Attention
            {attentionTeams.length > 0 && <TabBadge count={attentionTeams.length} />}
          </span>
        ),
        value: "worth_attention" as const,
      },
      { label: "Directory", value: "directory" as const },
    ],
    [attentionTeams.length]
  );

  return (
    <div className="w-full px-16 py-8">
      <PageBanner
        size="hero"
        eyebrow="CONNECTIONS"
        title="Teams"
        subtitle="Internal groups mapped to active work, capacity, and the relationships they support."
        tabs={viewTabs}
        activeTab={mode}
        onTabChange={(value) => setMode(value as ViewMode)}
        fullWidthDivider
        actions={
          <Button size="sm" className="cursor-pointer" onClick={openNewTeamCapture}>
            <Plus className="size-3.5" />
            New team
          </Button>
        }
      />

      {mode === "worth_attention" && (
        <WorthAttentionView
          teams={attentionTeams}
          onViewDirectory={(options) => {
            setDirectoryFilter(options?.filter ?? "all");
            setSignalFilter(options?.signal ?? null);
            setMode("directory");
          }}
        />
      )}
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
  teams,
  onViewDirectory,
}: {
  teams: MockTeam[];
  onViewDirectory: (options?: {
    filter?: DirectoryFilter;
    signal?: SignalFilter | null;
  }) => void;
}) {
  if (teams.length === 0) {
    return (
      <Card className="px-6 py-10 text-center">
        <CheckCircle2 className="mx-auto mb-3 size-8 text-muted-foreground/60" />
        <p className="text-sm font-semibold tracking-tight">Teams are steady</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Salt will flag coordination when capacity, active work, or staffing signals change.
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
        <span className="font-medium text-foreground">{teams.length} teams</span> worth attention right now.
      </p>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {teams.map((team) => (
          <TeamAttentionRow key={team.id} team={team} onViewDirectory={onViewDirectory} />
        ))}
      </div>
    </div>
  );
}

function TeamAttentionRow({
  team,
  onViewDirectory,
}: {
  team: MockTeam;
  onViewDirectory: (options?: {
    filter?: DirectoryFilter;
    signal?: SignalFilter | null;
  }) => void;
}) {
  const Icon = team.icon;
  const members = MOCK_PEOPLE.filter((person) => team.memberIds.includes(person.id));
  const projects = MOCK_PROJECTS.filter((project) => project.teamId === team.id);
  const primarySignal =
    team.capacityPercent > 100
      ? `${team.capacityPercent}% capacity across ${projects.length} active work items`
      : team.capacityPercent < 70
        ? "Capacity available for new work"
        : `${projects.length} active work items need coordination`;

  return (
    <div className="flex flex-col gap-3 border-b border-border px-4 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/teams/${team.id}`}
              className="text-sm font-semibold leading-tight transition-colors hover:text-primary"
            >
              {team.name}
            </Link>
            <CapacityPill value={team.capacityPercent} />
          </div>
          <p className="text-sm leading-snug text-foreground">{primarySignal}</p>
          <p className="text-xs text-muted-foreground">
            {members.length} member{members.length === 1 ? "" : "s"} · {team.activeProjects} active project{team.activeProjects === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 pl-12 sm:pl-0">
        <Button
          size="sm"
          onClick={() =>
            onViewDirectory({
              filter: getCapacityFilter(team),
              signal: projects.length > 0 ? "active_work" : null,
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
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredTeams = React.useMemo(
    () =>
      MOCK_TEAMS.filter((team) => matchesDirectoryFilter(team, filter))
        .filter((team) => matchesSignalFilter(team, signalFilter))
        .filter((team) => matchesSearchQuery(team, searchQuery)),
    [filter, signalFilter, searchQuery]
  );

  const clearFilters = () => {
    onFilterChange("all");
    onSignalFilterChange(null);
    setSearchQuery("");
  };

  return (
    <TeamsDirectoryTable
      teams={filteredTeams}
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

function getTeamsDirectoryColumns(): ColumnDef<MockTeam>[] {
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
            aria-label="Select all teams"
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
      header: ({ column }) => <SortableColumnHeader column={column} title="Team" />,
      cell: ({ row }) => {
        const team = row.original;
        const Icon = team.icon;
        return (
          <Link href={`/teams/${team.id}`} className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-muted">
              <Icon className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{team.name}</p>
              <p className="truncate text-xs text-muted-foreground">{team.slug}</p>
            </div>
          </Link>
        );
      },
      enableHiding: false,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <CapacityPill value={row.original.capacityPercent} />,
    },
    {
      accessorFn: (team) => getTeamMembers(team).length,
      id: "members",
      header: ({ column }) => <SortableColumnHeader column={column} title="Members" align="right" />,
      cell: ({ row }) => (
        <div className="text-right font-mono text-xs text-muted-foreground">
          {getTeamMembers(row.original).length}
        </div>
      ),
    },
    {
      accessorFn: (team) => getTeamProjects(team).length,
      id: "work",
      header: ({ column }) => <SortableColumnHeader column={column} title="Work" align="right" />,
      cell: ({ row }) => (
        <div className="text-right font-mono text-xs text-muted-foreground">
          {getTeamProjects(row.original).length}
        </div>
      ),
    },
    {
      id: "signals",
      header: "Signals",
      cell: ({ row }) => <TeamSignal team={row.original} />,
      enableSorting: false,
    },
    {
      accessorKey: "capacityPercent",
      header: ({ column }) => <SortableColumnHeader column={column} title="Capacity" align="right" />,
      cell: ({ row }) => (
        <div className="text-right font-mono text-xs text-muted-foreground tabular-nums">
          {row.original.capacityPercent}%
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <TeamRowActions team={row.original} />,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}

function TeamsDirectoryTable({
  teams,
  searchQuery,
  filter,
  signalFilter,
  onSearchQueryChange,
  onFilterChange,
  onSignalFilterChange,
  onClearFilters,
}: {
  teams: MockTeam[];
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
    { id: "capacityPercent", desc: true },
  ]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const columns = React.useMemo(() => getTeamsDirectoryColumns(), []);

  React.useEffect(() => {
    setRowSelection({});
  }, [teams]);

  const table = useReactTable({
    data: teams,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: (row) => row.id,
    state: { rowSelection, sorting, columnVisibility },
  });

  const selectedTeams = table.getSelectedRowModel().rows.map((row) => row.original);

  return (
    <div ref={bulkBarAnchorRef} className="space-y-3">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search teams..."
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <ColumnVisibilityMenu table={table} />
          <TeamsDirectoryFilterMenu
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
        selectedCount={selectedTeams.length}
        entityLabel="team"
        onDraftMessage={() => draftMessageForTeams(selectedTeams)}
        onAddNote={() => addNoteForTeams(selectedTeams)}
        onArchive={() => archiveTeams(selectedTeams)}
        onDelete={() => deleteTeams(selectedTeams)}
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
                      <p className="text-sm font-medium">No teams match these filters</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Try clearing search or choosing a different Capacity or Signal filter.
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

function TeamRowActions({ team }: { team: MockTeam }) {
  return (
    <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 cursor-pointer">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Open actions for {team.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href={`/teams/${team.id}`}>
              <ArrowRight className="mr-2 size-4" />
              Open team
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => draftMessageForTeams([team])}>
            <MessageSquare className="mr-2 size-4" />
            Draft message
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addNoteForTeams([team])}>
            <StickyNote className="mr-2 size-4" />
            Add note
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => archiveTeams([team])}>
            <Archive className="mr-2 size-4" />
            Archive
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => deleteTeams([team])}
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
  return ["members", "work", "capacityPercent"].includes(columnId);
}

function ColumnVisibilityMenu({ table }: { table: TanStackTable<MockTeam> }) {
  const labelMap: Record<string, string> = {
    status: "Status",
    members: "Members",
    work: "Work",
    signals: "Signals",
    capacityPercent: "Capacity",
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

function TeamsDirectoryFilterMenu({
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
            Capacity
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

function CapacityPill({ value }: { value: number }) {
  if (value > 100) {
    return <StatusPill color="var(--relationship-vendors)" label="AT RISK" />;
  }

  if (value < 70) {
    return <StatusPill color="var(--relationship-team)" label="OPEN" />;
  }

  return <StatusPill color="var(--relationship-clients)" label="STEADY" />;
}

function TeamSignal({ team }: { team: MockTeam }) {
  const projects = getTeamProjects(team);

  if (team.capacityPercent > 100) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
        <span className="size-1.5 rounded-[2px] bg-warning" />
        Over capacity
      </span>
    );
  }

  if (projects.length > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
        <span className="size-1.5 rounded-[2px] bg-success" />
        Active work
      </span>
    );
  }

  return <span className="text-xs text-muted-foreground">No urgent signal</span>;
}

function matchesDirectoryFilter(team: MockTeam, filter: DirectoryFilter) {
  if (filter === "all") return true;
  return getCapacityFilter(team) === filter;
}

function matchesSignalFilter(team: MockTeam, filter: SignalFilter | null) {
  if (!filter) return true;

  switch (filter) {
    case "active_work":
      return getTeamProjects(team).length > 0;
    case "shared_members":
      return getTeamMembers(team).some(
        (member) => MOCK_TEAMS.filter((teamItem) => teamItem.memberIds.includes(member.id)).length > 1
      );
  }
}

function matchesSearchQuery(team: MockTeam, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [
    team.name,
    team.slug,
    ...getTeamMembers(team).map((person) => person.name),
    ...getTeamProjects(team).map((project) => project.name),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

function getCapacityFilter(team: MockTeam): Exclude<DirectoryFilter, "all"> {
  if (team.capacityPercent > 100) return "over_capacity";
  if (team.capacityPercent < 70) return "open";
  return "steady";
}

function getTeamMembers(team: MockTeam) {
  return MOCK_PEOPLE.filter((person) => team.memberIds.includes(person.id));
}

function getTeamProjects(team: MockTeam) {
  return MOCK_PROJECTS.filter((project) => project.teamId === team.id);
}

function getTeamAttentionScore(team: MockTeam) {
  const capacityScore = team.capacityPercent > 100 ? 100 : team.capacityPercent < 70 ? 25 : 0;
  const workScore = getTeamProjects(team).length * 15;
  const sharedMemberScore = getTeamMembers(team).some(
    (member) => MOCK_TEAMS.filter((teamItem) => teamItem.memberIds.includes(member.id)).length > 1
  )
    ? 20
    : 0;
  return capacityScore + workScore + sharedMemberScore;
}

function draftMessageForTeams(teams: MockTeam[]) {
  window.dispatchEvent(
    new CustomEvent("salt:open-capture", {
      detail: {
        intent: "message",
        teams: teams.map((team) => team.id),
      },
    })
  );
}

function addNoteForTeams(teams: MockTeam[]) {
  window.dispatchEvent(
    new CustomEvent("salt:open-capture", {
      detail: {
        intent: "note",
        teams: teams.map((team) => team.id),
      },
    })
  );
}

function archiveTeams(teams: MockTeam[]) {
  window.dispatchEvent(
    new CustomEvent("salt:mock-action", {
      detail: {
        action: "archive_teams",
        teams: teams.map((team) => team.id),
      },
    })
  );
}

function deleteTeams(teams: MockTeam[]) {
  window.dispatchEvent(
    new CustomEvent("salt:mock-action", {
      detail: {
        action: "delete_teams",
        teams: teams.map((team) => team.id),
      },
    })
  );
}

function openNewTeamCapture() {
  window.dispatchEvent(
    new CustomEvent("salt:open-capture", {
      detail: { intent: "team" },
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
