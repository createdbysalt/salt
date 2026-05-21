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
import {
  Archive,
  ArrowRight,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  Filter,
  Handshake,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Sparkles,
  StickyNote,
  Trash2,
  Users,
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
  MOCK_ORGANIZATIONS,
  MOCK_PEOPLE,
  MOCK_PROJECTS,
  type MockOrganization,
} from "@/app/_lib/demo";

type ViewMode = "worth_attention" | "directory";
type DirectoryFilter = "all" | "clients" | "prospects" | "partners" | "past";
type SignalFilter = "payment_due" | "quiet" | "active_work";

const DIRECTORY_FILTERS = [
  { label: "All", value: "all" as const },
  { label: "Clients", value: "clients" as const },
  { label: "Prospects", value: "prospects" as const },
  { label: "Partners", value: "partners" as const },
  { label: "Past", value: "past" as const },
];

const SIGNAL_FILTERS = [
  { label: "Payment due", value: "payment_due" as const },
  { label: "Quiet account", value: "quiet" as const },
  { label: "Active work", value: "active_work" as const },
];

export function OrgsPage() {
  const [mode, setMode] = React.useState<ViewMode>("worth_attention");
  const [directoryFilter, setDirectoryFilter] = React.useState<DirectoryFilter>("all");
  const [signalFilter, setSignalFilter] = React.useState<SignalFilter | null>(null);

  const attentionOrgs = React.useMemo(
    () =>
      [...MOCK_ORGANIZATIONS]
        .filter((org) => getOrgAttentionScore(org) > 0)
        .sort((a, b) => getOrgAttentionScore(b) - getOrgAttentionScore(a)),
    []
  );

  const viewTabs = React.useMemo(
    () => [
      {
        label: (
          <span className="flex items-center">
            Worth Attention
            {attentionOrgs.length > 0 && <TabBadge count={attentionOrgs.length} />}
          </span>
        ),
        value: "worth_attention" as const,
      },
      { label: "Directory", value: "directory" as const },
    ],
    [attentionOrgs.length]
  );

  return (
    <div className="w-full px-16 py-8">
      <PageBanner
        size="hero"
        eyebrow="CONNECTIONS"
        title="Organizations"
        subtitle="Accounts, partners, and prospects organized around the people, work, and signals that shape each relationship."
        tabs={viewTabs}
        activeTab={mode}
        onTabChange={(value) => setMode(value as ViewMode)}
        fullWidthDivider
        actions={
          <Button size="sm" className="cursor-pointer" onClick={openNewOrgCapture}>
            <Plus className="size-3.5" />
            New org
          </Button>
        }
      />

      {mode === "worth_attention" && (
        <WorthAttentionView
          orgs={attentionOrgs}
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
  orgs,
  onViewDirectory,
}: {
  orgs: MockOrganization[];
  onViewDirectory: (options?: {
    filter?: DirectoryFilter;
    signal?: SignalFilter | null;
  }) => void;
}) {
  if (orgs.length === 0) {
    return (
      <Card className="px-6 py-10 text-center">
        <CheckCircle2 className="mx-auto mb-3 size-8 text-muted-foreground/60" />
        <p className="text-sm font-semibold tracking-tight">Organizations are steady</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Salt will surface account-level attention when payment, activity, or work signals change.
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
        <span className="font-medium text-foreground">{orgs.length} orgs</span> worth attention right now.
      </p>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {orgs.map((org) => (
          <OrgAttentionRow key={org.id} org={org} onViewDirectory={onViewDirectory} />
        ))}
      </div>
    </div>
  );
}

function OrgAttentionRow({
  org,
  onViewDirectory,
}: {
  org: MockOrganization;
  onViewDirectory: (options?: {
    filter?: DirectoryFilter;
    signal?: SignalFilter | null;
  }) => void;
}) {
  const linkedPeople = getOrgPeople(org);
  const outstanding = getOrgOutstandingAmount(org);
  const activeWorkCount = getOrgActiveWorkCount(org);
  const quietCount = linkedPeople.filter(
    (person) => person.lastContactDays !== null && person.lastContactDays >= 30
  ).length;
  const signal = outstanding > 0
    ? `$${outstanding.toLocaleString()} outstanding`
    : quietCount > 0
      ? `${quietCount} quiet relationship${quietCount === 1 ? "" : "s"}`
      : activeWorkCount > 0
        ? `${activeWorkCount} active work item${activeWorkCount === 1 ? "" : "s"}`
        : org.insights[0] ?? "Account context changed";

  return (
    <div className="flex flex-col gap-3 border-b border-border px-4 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <Avatar className="size-9 shrink-0 ring-1 ring-border">
          <AvatarFallback className={cn("text-[11px] font-semibold", org.avatarColor)}>
            {org.avatar}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold leading-tight">{org.name}</p>
            <OrgPill status={org.relationshipStatus} />
          </div>
          <p className="text-sm leading-snug text-foreground">{signal}</p>
          <p className="text-xs text-muted-foreground">
            {org.industry} · {linkedPeople.length || org.peopleCount} linked people
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 pl-12 sm:pl-0">
        <Button
          size="sm"
          onClick={() =>
            onViewDirectory({
              filter: org.relationshipStatus === "client"
                ? "clients"
                : org.relationshipStatus === "prospect"
                  ? "prospects"
                  : ["partner", "vendor"].includes(org.relationshipStatus)
                    ? "partners"
                    : "all",
              signal: outstanding > 0 ? "payment_due" : activeWorkCount > 0 ? "active_work" : null,
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

  const filteredOrgs = React.useMemo(
    () =>
      MOCK_ORGANIZATIONS.filter((org) => matchesDirectoryFilter(org, filter))
        .filter((org) => matchesSignalFilter(org, signalFilter))
        .filter((org) => matchesSearchQuery(org, searchQuery)),
    [filter, signalFilter, searchQuery]
  );

  const clearFilters = () => {
    onFilterChange("all");
    onSignalFilterChange(null);
    setSearchQuery("");
  };

  return (
    <OrgsDirectoryTable
      orgs={filteredOrgs}
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

function getOrgDirectoryColumns(): ColumnDef<MockOrganization>[] {
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
            aria-label="Select all organizations"
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
      header: ({ column }) => <SortableColumnHeader column={column} title="Organization" />,
      cell: ({ row }) => {
        const org = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="size-8 ring-1 ring-border">
              <AvatarFallback className={cn("text-[10px] font-semibold", org.avatarColor)}>
                {org.avatar}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{org.name}</p>
              <p className="truncate text-xs text-muted-foreground">{org.website ?? org.industry}</p>
            </div>
          </div>
        );
      },
      enableHiding: false,
    },
    {
      accessorKey: "industry",
      header: ({ column }) => <SortableColumnHeader column={column} title="Industry" />,
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.industry}</span>,
    },
    {
      accessorKey: "relationshipStatus",
      header: "Type",
      cell: ({ row }) => <OrgPill status={row.original.relationshipStatus} />,
    },
    {
      accessorFn: (org) => getOrgPeople(org).length || org.peopleCount,
      id: "people",
      header: ({ column }) => <SortableColumnHeader column={column} title="People" />,
      cell: ({ row }) => (
        <div className="font-mono text-xs text-muted-foreground">
          {getOrgPeople(row.original).length || row.original.peopleCount}
        </div>
      ),
    },
    {
      accessorFn: (org) => getOrgActiveWorkCount(org),
      id: "work",
      header: ({ column }) => <SortableColumnHeader column={column} title="Work" />,
      cell: ({ row }) => (
        <div className="font-mono text-xs text-muted-foreground">
          {getOrgActiveWorkCount(row.original)}
        </div>
      ),
    },
    {
      id: "signals",
      header: "Signals",
      cell: ({ row }) => <OrgSignal org={row.original} />,
      enableSorting: false,
    },
    {
      accessorKey: "mrr",
      header: ({ column }) => <SortableColumnHeader column={column} title="MRR" />,
      cell: ({ row }) => (
        <div className="font-mono text-xs text-muted-foreground tabular-nums">
          {row.original.mrr > 0 ? `$${row.original.mrr.toLocaleString()}` : "-"}
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <OrgRowActions org={row.original} />,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}

function OrgsDirectoryTable({
  orgs,
  searchQuery,
  filter,
  signalFilter,
  onSearchQueryChange,
  onFilterChange,
  onSignalFilterChange,
  onClearFilters,
}: {
  orgs: MockOrganization[];
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
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "mrr", desc: true }]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const columns = React.useMemo(() => getOrgDirectoryColumns(), []);

  React.useEffect(() => {
    setRowSelection({});
  }, [orgs]);

  const table = useReactTable({
    data: orgs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: (row) => row.id,
    state: { rowSelection, sorting, columnVisibility },
  });

  const selectedOrgs = table.getSelectedRowModel().rows.map((row) => row.original);

  return (
    <div ref={bulkBarAnchorRef} className="space-y-3">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search orgs..."
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <ColumnVisibilityMenu table={table} />
          <OrgsDirectoryFilterMenu
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
        selectedCount={selectedOrgs.length}
        entityLabel="org"
        onDraftMessage={() => draftMessageForOrgs(selectedOrgs)}
        onAddNote={() => addNoteForOrgs(selectedOrgs)}
        onArchive={() => archiveOrgs(selectedOrgs)}
        onDelete={() => deleteOrgs(selectedOrgs)}
      />
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
                      <p className="text-sm font-medium">No orgs match these filters</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Try clearing search or choosing a different Type or Signal filter.
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

function OrgRowActions({ org }: { org: MockOrganization }) {
  return (
    <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 cursor-pointer">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Open actions for {org.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => triggerAskSalt()}>
            <Sparkles className="mr-2 size-4" />
            Ask Salt
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => draftMessageForOrgs([org])}>
            <MessageSquare className="mr-2 size-4" />
            Draft message
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addNoteForOrgs([org])}>
            <StickyNote className="mr-2 size-4" />
            Add note
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => archiveOrgs([org])}>
            <Archive className="mr-2 size-4" />
            Archive
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => deleteOrgs([org])}
          >
            <Trash2 className="mr-2 size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ColumnVisibilityMenu({ table }: { table: TanStackTable<MockOrganization> }) {
  const labelMap: Record<string, string> = {
    industry: "Industry",
    relationshipStatus: "Type",
    people: "People",
    work: "Work",
    mrr: "MRR",
    signals: "Signals",
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

function OrgsDirectoryFilterMenu({
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
            Type
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

function OrgPill({ status }: { status: MockOrganization["relationshipStatus"] }) {
  const colorMap: Record<MockOrganization["relationshipStatus"], string> = {
    client: "var(--relationship-clients)",
    prospect: "var(--relationship-clients)",
    past_client: "var(--relationship-team)",
    partner: "var(--relationship-partners)",
    vendor: "var(--relationship-vendors)",
    other: "var(--relationship-team)",
  };
  const labelMap: Record<MockOrganization["relationshipStatus"], string> = {
    client: "CLIENT",
    prospect: "PROSPECT",
    past_client: "PAST",
    partner: "PARTNER",
    vendor: "VENDOR",
    other: "OTHER",
  };

  return <StatusPill color={colorMap[status]} label={labelMap[status]} />;
}

function OrgSignal({ org }: { org: MockOrganization }) {
  const outstanding = getOrgOutstandingAmount(org);
  const activeWorkCount = getOrgActiveWorkCount(org);

  if (outstanding > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
        <span className="size-1.5 rounded-[2px] bg-warning" />
        ${outstanding.toLocaleString()} due
      </span>
    );
  }

  if (activeWorkCount > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
        <span className="size-1.5 rounded-[2px] bg-success" />
        Active work
      </span>
    );
  }

  return <span className="text-xs text-muted-foreground">No urgent signal</span>;
}

function matchesDirectoryFilter(org: MockOrganization, filter: DirectoryFilter) {
  switch (filter) {
    case "clients":
      return org.relationshipStatus === "client";
    case "prospects":
      return org.relationshipStatus === "prospect";
    case "partners":
      return ["partner", "vendor"].includes(org.relationshipStatus);
    case "past":
      return org.relationshipStatus === "past_client";
    case "all":
      return true;
  }
}

function matchesSignalFilter(org: MockOrganization, filter: SignalFilter | null) {
  if (!filter) return true;

  switch (filter) {
    case "payment_due":
      return getOrgOutstandingAmount(org) > 0;
    case "quiet":
      return getOrgPeople(org).some(
        (person) => person.lastContactDays !== null && person.lastContactDays >= 30
      );
    case "active_work":
      return getOrgActiveWorkCount(org) > 0;
  }
}

function matchesSearchQuery(org: MockOrganization, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [
    org.name,
    org.website,
    org.industry,
    org.relationshipStatus,
    ...org.insights,
    ...getOrgPeople(org).map((person) => person.name),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

function getOrgPeople(org: MockOrganization) {
  return MOCK_PEOPLE.filter((person) => person.organizationId === org.id);
}

function getOrgOutstandingAmount(org: MockOrganization) {
  return getOrgPeople(org).reduce((sum, person) => sum + person.outstandingAmount, 0);
}

function getOrgActiveWorkCount(org: MockOrganization) {
  return MOCK_PROJECTS.filter(
    (project) =>
      project.organizationId === org.id &&
      (project.status === "active" || project.status === "stalled")
  ).length;
}

function getOrgAttentionScore(org: MockOrganization) {
  const outstandingScore = getOrgOutstandingAmount(org) > 0 ? 100 : 0;
  const quietScore = getOrgPeople(org).some(
    (person) => person.lastContactDays !== null && person.lastContactDays >= 30
  )
    ? 60
    : 0;
  const prospectScore = org.relationshipStatus === "prospect" ? 35 : 0;
  const activeWorkScore = getOrgActiveWorkCount(org) > 0 ? 20 : 0;
  return outstandingScore + quietScore + prospectScore + activeWorkScore;
}

function draftMessageForOrgs(orgs: MockOrganization[]) {
  window.dispatchEvent(
    new CustomEvent("salt:open-capture", {
      detail: {
        intent: "message",
        organizations: orgs.map((org) => org.id),
      },
    })
  );
}

function addNoteForOrgs(orgs: MockOrganization[]) {
  window.dispatchEvent(
    new CustomEvent("salt:open-capture", {
      detail: {
        intent: "note",
        organizations: orgs.map((org) => org.id),
      },
    })
  );
}

function archiveOrgs(orgs: MockOrganization[]) {
  window.dispatchEvent(
    new CustomEvent("salt:mock-action", {
      detail: {
        action: "archive_orgs",
        organizations: orgs.map((org) => org.id),
      },
    })
  );
}

function deleteOrgs(orgs: MockOrganization[]) {
  window.dispatchEvent(
    new CustomEvent("salt:mock-action", {
      detail: {
        action: "delete_orgs",
        organizations: orgs.map((org) => org.id),
      },
    })
  );
}

function openNewOrgCapture() {
  window.dispatchEvent(
    new CustomEvent("salt:open-capture", {
      detail: { intent: "organization" },
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
