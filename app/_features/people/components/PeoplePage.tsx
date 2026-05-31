"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Sparkles,
  ArrowRight,
  Plus,
  CheckCircle2,
  Archive,
  ArrowUpDown,
  ChevronDown,
  Filter,
  MoreHorizontal,
  MessageSquare,
  RotateCcw,
  Search,
  Settings2,
  StickyNote,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Avatar,
  AvatarFallback,
  Button,
  Checkbox,
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
  MOCK_WORTH_REACHING_OUT,
  type MockPerson,
  type MockWorthReachingOutItem,
} from "@/app/_lib/demo";

/**
 * People page (/people).
 *
 * Unified directory of people. Worth Attention is the smart queue; Directory
 * is the browse mode with relationship and signal filters.
 */

type ViewMode = "worth_attention" | "directory";
type DirectoryFilter =
  | "all"
  | "clients"
  | "prospects"
  | "partners"
  | "team"
  | "archived";
type SignalFilter = "payment_due" | "quiet" | "recent";
type PendingDestructiveAction = {
  type: "archive" | "delete";
  people: MockPerson[];
} | null;

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

const DIRECTORY_FILTERS = [
  { label: "All", value: "all" as const },
  { label: "Clients", value: "clients" as const },
  { label: "Prospects", value: "prospects" as const },
  { label: "Partners", value: "partners" as const },
  { label: "Team", value: "team" as const },
  { label: "Archived", value: "archived" as const },
];

const SIGNAL_FILTERS = [
  { label: "Payment due", value: "payment_due" as const },
  { label: "Quiet", value: "quiet" as const },
  { label: "Recently active", value: "recent" as const },
];

export function PeoplePage() {
  const [mode, setMode] = React.useState<ViewMode>("worth_attention");
  const [directoryFilter, setDirectoryFilter] = React.useState<DirectoryFilter>("all");
  const [signalFilter, setSignalFilter] = React.useState<SignalFilter | null>(null);
  const [queueSnoozedIds, setQueueSnoozedIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const [queueHandledIds, setQueueHandledIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const [archivedPersonIds, setArchivedPersonIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const [deletedPersonIds, setDeletedPersonIds] = React.useState<Set<string>>(
    () => new Set()
  );

  const openQueueCount = React.useMemo(
    () =>
      MOCK_WORTH_REACHING_OUT.filter(
        (item) =>
          !queueSnoozedIds.has(item.personId) && !queueHandledIds.has(item.personId)
      ).length,
    [queueSnoozedIds, queueHandledIds]
  );

  const viewTabs = React.useMemo(
    () => [
      {
        label: (
          <span className="flex items-center">
            Worth Attention
            {openQueueCount > 0 && <TabBadge count={openQueueCount} />}
          </span>
        ),
        value: "worth_attention" as const,
      },
      { label: "Directory", value: "directory" as const },
    ],
    [openQueueCount]
  );

  const availablePeople = React.useMemo(
    () => MOCK_PEOPLE.filter((person) => !deletedPersonIds.has(person.id)),
    [deletedPersonIds]
  );

  const activePeople = React.useMemo(
    () => availablePeople.filter((person) => !archivedPersonIds.has(person.id)),
    [availablePeople, archivedPersonIds]
  );

  const archivePeople = React.useCallback((people: MockPerson[]) => {
    setArchivedPersonIds((current) => {
      const next = new Set(current);
      for (const person of people) {
        next.add(person.id);
      }
      return next;
    });
  }, []);

  const restorePeople = React.useCallback((people: MockPerson[]) => {
    setArchivedPersonIds((current) => {
      const next = new Set(current);
      for (const person of people) {
        next.delete(person.id);
      }
      return next;
    });
  }, []);

  const deletePeople = React.useCallback((people: MockPerson[]) => {
    setDeletedPersonIds((current) => {
      const next = new Set(current);
      for (const person of people) {
        next.add(person.id);
      }
      return next;
    });
    setArchivedPersonIds((current) => {
      const next = new Set(current);
      for (const person of people) {
        next.delete(person.id);
      }
      return next;
    });
  }, []);

  return (
    <div className="w-full px-16 py-8">
      <PageBanner
        size="hero"
        eyebrow="CONNECTIONS"
        title="People"
        subtitle="Every relationship in one place, with the context you need to decide who needs a touch and why."
        tabs={viewTabs}
        activeTab={mode}
        onTabChange={(value) => setMode(value as ViewMode)}
        fullWidthDivider
        actions={
          <Button size="sm" className="cursor-pointer" onClick={openNewPersonCapture}>
            <Plus className="size-3.5" />
            New person
          </Button>
        }
      />

      {mode === "worth_attention" && (
        <WorthAttentionView
          people={activePeople}
          snoozedIds={queueSnoozedIds}
          handledIds={queueHandledIds}
          onSnooze={(personId) => {
            setQueueSnoozedIds((current) => new Set(current).add(personId));
          }}
          onMarkHandled={(personId) => {
            setQueueHandledIds((current) => new Set(current).add(personId));
          }}
          onRestoreQueueItem={(personId) => {
            setQueueSnoozedIds((current) => {
              const next = new Set(current);
              next.delete(personId);
              return next;
            });
            setQueueHandledIds((current) => {
              const next = new Set(current);
              next.delete(personId);
              return next;
            });
          }}
          onViewDirectory={(options) => {
            setDirectoryFilter(options?.filter ?? "all");
            setSignalFilter(options?.signal ?? null);
            setMode("directory");
          }}
        />
      )}
      {mode === "directory" && (
        <DirectoryView
          people={availablePeople}
          filter={directoryFilter}
          signalFilter={signalFilter}
          archivedPersonIds={archivedPersonIds}
          onFilterChange={setDirectoryFilter}
          onSignalFilterChange={setSignalFilter}
          onArchivePeople={archivePeople}
          onRestorePeople={restorePeople}
          onDeletePeople={deletePeople}
        />
      )}
    </div>
  );
}

// ============================================================================
// WORTH ATTENTION VIEW (default landing)
// ============================================================================

type WorthAttentionViewProps = {
  people: MockPerson[];
  snoozedIds: Set<string>;
  handledIds: Set<string>;
  onSnooze: (personId: string) => void;
  onMarkHandled: (personId: string) => void;
  onRestoreQueueItem: (personId: string) => void;
  onViewDirectory: (options?: {
    filter?: DirectoryFilter;
    signal?: SignalFilter | null;
  }) => void;
};

function WorthAttentionView({
  people,
  snoozedIds,
  handledIds,
  onSnooze,
  onMarkHandled,
  onRestoreQueueItem,
  onViewDirectory,
}: WorthAttentionViewProps) {
  const [snoozedExpanded, setSnoozedExpanded] = React.useState(false);

  const openQueue = React.useMemo(() => {
    return MOCK_WORTH_REACHING_OUT.filter(
      (item) => !snoozedIds.has(item.personId) && !handledIds.has(item.personId)
    ).sort((a, b) => {
      if (a.tier !== b.tier) {
        return a.tier === "today" ? -1 : 1;
      }
      return a.priority - b.priority;
    });
  }, [snoozedIds, handledIds]);

  const deferredCount = snoozedIds.size + handledIds.size;
  const snoozedItems = MOCK_WORTH_REACHING_OUT.filter((item) =>
    snoozedIds.has(item.personId)
  );

  return (
    <div className="space-y-4">
      {openQueue.length === 0 ? (
        <WorthAttentionEmptyState
          deferredCount={deferredCount}
          onViewDirectory={() => onViewDirectory()}
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {openQueue.length} {openQueue.length === 1 ? "person" : "people"}
            </span>{" "}
            to reach out to right now.
          </p>

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {openQueue.map((item, index) => {
              const person = people.find((p) => p.id === item.personId);
              if (!person) return null;

              const previousTier = index > 0 ? openQueue[index - 1].tier : null;
              const showTierLabel = item.tier !== previousTier;

              return (
                <React.Fragment key={item.personId}>
                  {showTierLabel && (
                    <div className="border-b border-border bg-muted/30 px-4 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {item.tier === "today" ? "Today" : "This week"}
                      </p>
                    </div>
                  )}
                  <WorthAttentionListRow
                    item={item}
                    person={person}
                    onDraft={() => draftMessageForPeople([person])}
                    onDone={() => onMarkHandled(person.id)}
                    onSnooze={() => onSnooze(person.id)}
                  />
                </React.Fragment>
              );
            })}
          </div>
        </>
      )}

      {snoozedItems.length > 0 && (
        <div className="text-sm">
          <button
            type="button"
            onClick={() => setSnoozedExpanded((value) => !value)}
            className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronDown
              className={cn("size-4", snoozedExpanded && "rotate-180")}
            />
            {snoozedItems.length} snoozed
          </button>
          {snoozedExpanded && (
            <div className="mt-2 overflow-hidden rounded-lg border border-border">
              {snoozedItems.map((item) => {
                const person = people.find((p) => p.id === item.personId);
                if (!person) return null;
                return (
                  <div
                    key={item.personId}
                    className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0"
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="text-sm text-muted-foreground">{person.name}</span>
                      <RelationshipPill status={person.relationshipStatus} />
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRestoreQueueItem(person.id)}
                    >
                      Restore
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WorthAttentionEmptyState({
  deferredCount,
  onViewDirectory,
}: {
  deferredCount: number;
  onViewDirectory: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-6 py-10 text-center">
      <CheckCircle2 className="mx-auto mb-3 size-8 text-muted-foreground/60" />
      <p className="text-sm font-semibold tracking-tight">
        You&apos;re caught up
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {deferredCount > 0
          ? `${deferredCount} ${deferredCount === 1 ? "person" : "people"} snoozed or marked done. Salt will add new suggestions when something changes.`
          : "Salt will suggest outreach when a relationship needs a touch."}
      </p>
      <Button size="sm" variant="outline" className="mt-4" onClick={onViewDirectory}>
        Browse Directory
      </Button>
    </div>
  );
}

function WorthAttentionListRow({
  item,
  person,
  onDraft,
  onDone,
  onSnooze,
}: {
  item: MockWorthReachingOutItem;
  person: MockPerson;
  onDraft: () => void;
  onDone: () => void;
  onSnooze: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border px-4 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Avatar className="size-9 shrink-0 ring-1 ring-border">
          <AvatarFallback
            className={cn("text-[10px] font-semibold", person.avatarColor)}
          >
            {person.avatar}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href={`/people/${person.id}`}
              className="text-sm font-semibold leading-tight hover:text-primary transition-colors"
            >
              {person.name}
            </Link>
            <RelationshipPill status={person.relationshipStatus} />
          </div>

          <p className="text-sm leading-snug text-foreground">{item.summary}</p>

          <WhyThisDetails
            trigger={item.reason}
            contextUsed={getWorthAttentionContextUsed(person, item)}
            confidence={getWorthAttentionConfidence(item)}
            guardrail={getWorthAttentionGuardrail(person, item)}
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 pl-12 sm:pl-0">
        <Button size="sm" className="cursor-pointer" onClick={onDraft}>
          <MessageSquare className="size-3.5" />
          {item.primaryActionLabel}
        </Button>
        <Button size="sm" variant="outline" onClick={onDone}>
          Done
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="size-8 px-0">
              <MoreHorizontal className="size-4" />
              <span className="sr-only">More</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/people/${person.id}`}>Open profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSnooze}>Snooze</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/** Matches Plays queue "Why this?" collapsible block */
function WhyThisDetails({
  trigger,
  contextUsed,
  confidence,
  guardrail,
}: {
  trigger: string;
  contextUsed: string[];
  confidence: number;
  guardrail?: string;
}) {
  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-primary transition-opacity hover:opacity-80">
        <Sparkles className="size-3" />
        <span>Why this?</span>
        <ChevronDown className="size-3 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3 space-y-2 rounded-lg border border-border/50 bg-muted/50 p-3 text-xs">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-2">
            <span className="w-16 shrink-0 text-muted-foreground/70">Trigger</span>
            <span className="text-muted-foreground">{trigger}</span>
          </div>
          <span className="shrink-0 border border-border px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            {confidence}% confidence
          </span>
        </div>
        <div className="flex items-start gap-2 pb-1">
          <span className="w-16 shrink-0 text-muted-foreground/70">Context</span>
          <span className="text-muted-foreground">{contextUsed.join(" · ")}</span>
        </div>
        {guardrail ? (
          <div className="flex items-start gap-2">
            <span className="w-16 shrink-0 text-muted-foreground/70">Guardrail</span>
            <span className="text-muted-foreground">{guardrail}</span>
          </div>
        ) : null}
      </div>
    </details>
  );
}

function getWorthAttentionContextUsed(
  person: MockPerson,
  item: MockWorthReachingOutItem
): string[] {
  const parts: string[] = [];

  if (person.organizationName) parts.push(person.organizationName);
  parts.push(item.timingLabel);

  if (person.lastContactDays !== null) {
    parts.push(`Last contact ${formatLastContact(person.lastContactDays).toLowerCase()}`);
  }

  if (person.outstandingAmount > 0) {
    parts.push(`$${person.outstandingAmount.toLocaleString()} outstanding`);
  } else if (person.lifetimeValue > 0) {
    parts.push(`$${person.lifetimeValue.toLocaleString()} lifetime value`);
  }

  return parts;
}

function getWorthAttentionConfidence(item: MockWorthReachingOutItem): number {
  if (item.tier === "today") {
    return item.priority === 1 ? 94 : 88;
  }
  return item.priority === 1 ? 82 : 76;
}

function getWorthAttentionGuardrail(
  person: MockPerson,
  item: MockWorthReachingOutItem
): string | undefined {
  if (item.signals.includes("payment") && person.outstandingAmount > 0) {
    return "Payment timing mentioned. Confirm before sending.";
  }
  if (item.signals.includes("renewal")) {
    return "Contract renewal approaching. Review terms before outreach.";
  }
  if (item.signals.includes("proposal")) {
    return "Proposal still open. Avoid pressure language.";
  }
  return undefined;
}

// ============================================================================
// DIRECTORY VIEW
// ============================================================================

function DirectoryView({
  people,
  filter,
  signalFilter,
  archivedPersonIds,
  onFilterChange,
  onSignalFilterChange,
  onArchivePeople,
  onRestorePeople,
  onDeletePeople,
}: {
  people: MockPerson[];
  filter: DirectoryFilter;
  signalFilter: SignalFilter | null;
  archivedPersonIds: Set<string>;
  onFilterChange: (filter: DirectoryFilter) => void;
  onSignalFilterChange: (filter: SignalFilter | null) => void;
  onArchivePeople: (people: MockPerson[]) => void;
  onRestorePeople: (people: MockPerson[]) => void;
  onDeletePeople: (people: MockPerson[]) => void;
}) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const archivedCount = archivedPersonIds.size;

  const filteredPeople = React.useMemo(() => {
    return people
      .filter((person) => matchesArchiveFilter(person, filter, archivedPersonIds))
      .filter((person) => matchesDirectoryFilter(person, filter))
      .filter((person) => matchesSignalFilter(person, signalFilter))
      .filter((person) => matchesSearchQuery(person, searchQuery));
  }, [people, filter, archivedPersonIds, signalFilter, searchQuery]);

  const clearFilters = () => {
    onFilterChange("all");
    onSignalFilterChange(null);
    setSearchQuery("");
  };

  const emptyState = getDirectoryEmptyState({
    hasAnyPeople: people.length > 0,
    archivedCount,
    filter,
    signalFilter,
    searchQuery,
    onClearFilters: clearFilters,
  });

  return (
    <div>
      <PeopleDirectoryTable
        people={filteredPeople}
        archivedPersonIds={archivedPersonIds}
        emptyState={emptyState}
        searchQuery={searchQuery}
        filter={filter}
        signalFilter={signalFilter}
        archivedCount={archivedCount}
        onSearchQueryChange={setSearchQuery}
        onFilterChange={onFilterChange}
        onSignalFilterChange={onSignalFilterChange}
        onClearFilters={clearFilters}
        onArchivePeople={onArchivePeople}
        onRestorePeople={onRestorePeople}
        onDeletePeople={onDeletePeople}
      />
    </div>
  );
}

function getDirectoryEmptyState({
  hasAnyPeople,
  archivedCount,
  filter,
  signalFilter,
  searchQuery,
  onClearFilters,
}: {
  hasAnyPeople: boolean;
  archivedCount: number;
  filter: DirectoryFilter;
  signalFilter: SignalFilter | null;
  searchQuery: string;
  onClearFilters: () => void;
}) {
  if (!hasAnyPeople) {
    return {
      title: "No people in the directory",
      description:
        "Deleted mock rows are hidden for this local session. Refreshing the page resets the demo data.",
    };
  }

  if (filter === "archived" && archivedCount === 0) {
    return {
      title: "No archived people",
      description:
        "Archived people will appear here so you can restore them in the mock UI.",
      actionLabel: "Show active people",
      onAction: onClearFilters,
    };
  }

  if (filter !== "all" || signalFilter || searchQuery.trim()) {
    return {
      title: "No people match these filters",
      description:
        "Try clearing search, changing Type, or choosing a different Signal filter.",
      actionLabel: "Clear filters",
      onAction: onClearFilters,
    };
  }

  return {
    title: "No visible people",
    description:
      "Everyone in this view may have been archived or deleted in this local session.",
  };
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
      className={cn(
        "h-8 cursor-pointer px-2",
        align === "right" && "ml-auto justify-end"
      )}
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {title}
      <ArrowUpDown className="size-3.5" />
    </Button>
  );
}

function getPeopleDirectoryColumns({
  archivedPersonIds,
  onRequestAction,
  onRestorePeople,
}: {
  archivedPersonIds: Set<string>;
  onRequestAction: (type: "archive" | "delete", people: MockPerson[]) => void;
  onRestorePeople: (people: MockPerson[]) => void;
}): ColumnDef<MockPerson>[] {
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
            aria-label="Select all people"
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
      header: ({ column }) => (
        <SortableColumnHeader column={column} title="Person" />
      ),
      cell: ({ row }) => {
        const person = row.original;
        return (
          <Link href={`/people/${person.id}`} className="flex items-center gap-3">
            <Avatar className="size-8 ring-1 ring-border">
              <AvatarFallback
                className={cn("text-[10px] font-semibold", person.avatarColor)}
              >
                {person.avatar}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{person.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {person.title ?? "No title"}
              </p>
            </div>
          </Link>
        );
      },
      enableHiding: false,
    },
    {
      accessorFn: (person) => person.organizationName ?? "",
      id: "organization",
      header: ({ column }) => <SortableColumnHeader column={column} title="Org" />,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.organizationName ?? "Independent"}
        </span>
      ),
    },
    {
      accessorKey: "relationshipStatus",
      header: "Type",
      cell: ({ row }) => <RelationshipPill status={row.original.relationshipStatus} />,
    },
    {
      accessorFn: (person) => person.lastContactDays ?? Number.POSITIVE_INFINITY,
      id: "lastContact",
      header: ({ column }) => (
        <SortableColumnHeader column={column} title="Last contact" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatLastContact(row.original.lastContactDays)}
        </span>
      ),
    },
    {
      id: "signals",
      header: "Signals",
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-2">
          <PaymentSignal person={row.original} />
          <ContactSignal person={row.original} compact />
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorFn: (person) => person.outstandingAmount || person.lifetimeValue,
      id: "value",
      header: ({ column }) => (
        <SortableColumnHeader column={column} title="Value" align="right" />
      ),
      cell: ({ row }) => (
        <div className="text-right font-mono text-xs text-muted-foreground tabular-nums">
          {formatPersonValue(row.original)}
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <PersonRowActions
          person={row.original}
          isArchived={archivedPersonIds.has(row.original.id)}
          onRequestAction={onRequestAction}
          onRestorePeople={onRestorePeople}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}

function PeopleDirectoryTable({
  people,
  archivedPersonIds,
  emptyState,
  searchQuery,
  filter,
  signalFilter,
  archivedCount,
  onSearchQueryChange,
  onFilterChange,
  onSignalFilterChange,
  onClearFilters,
  onArchivePeople,
  onRestorePeople,
  onDeletePeople,
}: {
  people: MockPerson[];
  archivedPersonIds: Set<string>;
  emptyState: {
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
  };
  searchQuery: string;
  filter: DirectoryFilter;
  signalFilter: SignalFilter | null;
  archivedCount: number;
  onSearchQueryChange: (query: string) => void;
  onFilterChange: (filter: DirectoryFilter) => void;
  onSignalFilterChange: (filter: SignalFilter | null) => void;
  onClearFilters: () => void;
  onArchivePeople: (people: MockPerson[]) => void;
  onRestorePeople: (people: MockPerson[]) => void;
  onDeletePeople: (people: MockPerson[]) => void;
}) {
  const router = useRouter();
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "lastContact", desc: false },
  ]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [pendingAction, setPendingAction] =
    React.useState<PendingDestructiveAction>(null);
  const bulkBarAnchorRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setRowSelection({});
  }, [people]);

  const columns = React.useMemo(
    () =>
      getPeopleDirectoryColumns({
        archivedPersonIds,
        onRequestAction: (type, selectedPeople) =>
          setPendingAction({ type, people: selectedPeople }),
        onRestorePeople,
      }),
    [archivedPersonIds, onRestorePeople]
  );

  const table = useReactTable({
    data: people,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: (row) => row.id,
    state: {
      rowSelection,
      sorting,
      columnVisibility,
    },
  });

  const selectedPeople = table.getSelectedRowModel().rows.map((row) => row.original);

  return (
    <div ref={bulkBarAnchorRef} className="space-y-3">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search people..."
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <ColumnVisibilityMenu table={table} />
          <PeopleDirectoryFilterMenu
            filter={filter}
            signalFilter={signalFilter}
            archivedCount={archivedCount}
            onFilterChange={onFilterChange}
            onSignalFilterChange={onSignalFilterChange}
            onClearFilters={onClearFilters}
          />
        </div>
      </div>
      <PeopleBulkActionBar
        anchorRef={bulkBarAnchorRef}
        selectedPeople={selectedPeople}
        onDraftMessage={() => draftMessageForPeople(selectedPeople)}
        onAddNote={() => addNoteForPeople(selectedPeople)}
        onRequestAction={(type) => setPendingAction({ type, people: selectedPeople })}
      />
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={isPeopleRightAlignedColumn(header.column.id) ? "text-right" : undefined}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="cursor-pointer"
                  onClick={() => router.push(`/people/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={isPeopleRightAlignedColumn(cell.column.id) ? "text-right" : undefined}
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
                      <p className="text-sm font-medium">{emptyState.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {emptyState.description}
                      </p>
                    </div>
                    {emptyState.actionLabel && emptyState.onAction && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 cursor-pointer"
                        onClick={emptyState.onAction}
                      >
                        {emptyState.actionLabel}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <PeopleDestructiveDialog
        pendingAction={pendingAction}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
        onConfirm={(type, allowedPeople) => {
          if (type === "archive") {
            onArchivePeople(allowedPeople);
          } else {
            onDeletePeople(allowedPeople);
          }
          setRowSelection({});
          setPendingAction(null);
        }}
      />
    </div>
  );
}

function isPeopleRightAlignedColumn(columnId: string) {
  return columnId === "value";
}

function ColumnVisibilityMenu({ table }: { table: TanStackTable<MockPerson> }) {
  const labelMap: Record<string, string> = {
    organization: "Org",
    relationshipStatus: "Type",
    lastContact: "Last contact",
    signals: "Signals",
    value: "Value",
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
              className="capitalize"
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

function PeopleDirectoryFilterMenu({
  filter,
  signalFilter,
  archivedCount,
  onFilterChange,
  onSignalFilterChange,
  onClearFilters,
}: {
  filter: DirectoryFilter;
  signalFilter: SignalFilter | null;
  archivedCount: number;
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
              <span className="flex items-center gap-2">
                {option.value === "archived" && archivedCount > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {archivedCount}
                  </span>
                )}
                {filter === option.value && (
                  <CheckCircle2 className="size-3.5 text-primary" />
                )}
              </span>
            </button>
          ))}

          <div className="my-1 border-t border-border" />

          <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Signals
          </div>
          <button
            type="button"
            onClick={() => onSignalFilterChange(null)}
            className={cn(
              "flex w-full items-center justify-between px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted",
              signalFilter === null && "bg-muted"
            )}
          >
            <span>Any signal</span>
            {signalFilter === null && (
              <CheckCircle2 className="size-3.5 text-primary" />
            )}
          </button>
          {SIGNAL_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onSignalFilterChange(option.value)}
              className={cn(
                "flex w-full items-center justify-between px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted",
                signalFilter === option.value && "bg-muted"
              )}
            >
              <span>{option.label}</span>
              {signalFilter === option.value && (
                <CheckCircle2 className="size-3.5 text-primary" />
              )}
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

function PeopleBulkActionBar({
  anchorRef,
  selectedPeople,
  onDraftMessage,
  onAddNote,
  onRequestAction,
}: {
  anchorRef: React.RefObject<HTMLDivElement | null>;
  selectedPeople: MockPerson[];
  onDraftMessage: () => void;
  onAddNote: () => void;
  onRequestAction: (type: "archive" | "delete") => void;
}) {
  const protectedCount = selectedPeople.filter(isProtectedPerson).length;
  const actionableCount = selectedPeople.length - protectedCount;
  const [panelCenter, setPanelCenter] = React.useState<number | null>(null);

  React.useLayoutEffect(() => {
    if (selectedPeople.length === 0) return;

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
  }, [anchorRef, selectedPeople.length]);

  if (selectedPeople.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 flex w-fit max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5"
      style={panelCenter === null ? undefined : { left: panelCenter }}
    >
      <div className="flex shrink-0 items-center gap-2 whitespace-nowrap border-r border-border/70 pr-2.5">
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-muted px-1.5 font-mono text-xs text-foreground">
          {selectedPeople.length}
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
        <Button
          size="xs"
          variant="ghost"
          className="cursor-pointer"
          disabled={actionableCount === 0}
          onClick={() => onRequestAction("archive")}
        >
          <Archive className="size-3.5" />
          Archive
        </Button>
        <Button
          size="xs"
          variant="destructive"
          className="cursor-pointer"
          disabled={actionableCount === 0}
          onClick={() => onRequestAction("delete")}
        >
          <Trash2 className="size-3.5" />
          Delete
        </Button>
      </div>
    </div>
  );
}

function PersonRowActions({
  person,
  isArchived,
  onRequestAction,
  onRestorePeople,
}: {
  person: MockPerson;
  isArchived: boolean;
  onRequestAction: (type: "archive" | "delete", people: MockPerson[]) => void;
  onRestorePeople: (people: MockPerson[]) => void;
}) {
  const protectedPerson = isProtectedPerson(person);

  return (
    <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 cursor-pointer">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Open actions for {person.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href={`/people/${person.id}`}>
              <ArrowRight className="mr-2 size-4" />
              Open profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => draftMessageForPeople([person])}>
            <MessageSquare className="mr-2 size-4" />
            Draft message
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addNoteForPeople([person])}>
            <StickyNote className="mr-2 size-4" />
            Add note
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isArchived ? (
            <DropdownMenuItem onClick={() => onRestorePeople([person])}>
              <RotateCcw className="mr-2 size-4" />
              Restore
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              disabled={protectedPerson}
              onClick={() => onRequestAction("archive", [person])}
            >
              <Archive className="mr-2 size-4" />
              Archive
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            disabled={protectedPerson}
            className="text-destructive focus:text-destructive"
            onClick={() => onRequestAction("delete", [person])}
          >
            <Trash2 className="mr-2 size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function PeopleDestructiveDialog({
  pendingAction,
  onOpenChange,
  onConfirm,
}: {
  pendingAction: PendingDestructiveAction;
  onOpenChange: (open: boolean) => void;
  onConfirm: (type: "archive" | "delete", allowedPeople: MockPerson[]) => void;
}) {
  const allowedPeople = pendingAction?.people.filter((person) => !isProtectedPerson(person)) ?? [];
  const skippedPeople = pendingAction?.people.filter(isProtectedPerson) ?? [];
  const type = pendingAction?.type;
  const isDelete = type === "delete";

  return (
    <AlertDialog open={Boolean(pendingAction)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isDelete ? "Delete people?" : "Archive people?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isDelete
              ? "This removes the selected people from this mock directory only. Real deletion is not wired until persistence is ready."
              : "This hides the selected people from active views and keeps them recoverable from the Archived filter. This is local mock state only."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 text-sm">
          <p>
            {allowedPeople.length} {allowedPeople.length === 1 ? "person" : "people"} will be {isDelete ? "deleted" : "archived"}.
          </p>
          {skippedPeople.length > 0 && (
            <p className="text-muted-foreground">
              {skippedPeople.length} protected team {skippedPeople.length === 1 ? "member" : "members"} will be skipped.
            </p>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={isDelete ? "destructive" : "default"}
            disabled={allowedPeople.length === 0}
            onClick={() => {
              if (!type) return;
              onConfirm(type, allowedPeople);
            }}
          >
            {isDelete ? "Delete" : "Archive"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function PersonRow({ person }: { person: MockPerson }) {
  return (
    <Link
      href={`/people/${person.id}`}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg",
        "hover:bg-muted/40 transition-colors group"
      )}
    >
      <Avatar className="size-8 ring-1 ring-border">
        <AvatarFallback
          className={cn("text-[10px] font-semibold", person.avatarColor)}
        >
          {person.avatar}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{person.name}</p>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {person.title}
          {person.organizationName ? ` · ${person.organizationName}` : ""}
        </p>
      </div>
      <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
        <PaymentSignal person={person} />
        <ContactSignal person={person} compact />
        {person.lastContactDays !== null && (
          <span>
            {person.lastContactDays === 0
              ? "Today"
              : `${person.lastContactDays}d ago`}
          </span>
        )}
      </div>
      <RelationshipPill status={person.relationshipStatus} />
      <ArrowRight className="size-3.5 text-muted-foreground/30 group-hover:text-foreground/60 transition-colors" />
    </Link>
  );
}

function PaymentSignal({
  person,
}: {
  person: MockPerson;
}) {
  const signal = getPaymentSignal(person);
  if (!signal) return null;
  const isOutstanding = person.outstandingAmount > 0;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
      <span
        className={cn(
          "size-1.5 rounded-[2px]",
          isOutstanding ? "bg-warning" : "bg-muted-foreground/40"
        )}
      />
      {signal}
    </span>
  );
}

function ContactSignal({
  person,
  compact = false,
}: {
  person: MockPerson;
  compact?: boolean;
}) {
  if (person.lastContactDays === null) return null;

  const isFresh = person.lastContactDays <= 7;
  const isQuiet = person.lastContactDays >= 30;
  const label =
    person.lastContactDays === 0
      ? "Contacted today"
      : isFresh
        ? "Recently active"
        : isQuiet
          ? "Quiet account"
          : "Warm relationship";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm bg-muted px-2 py-0.5 font-mono text-xs text-foreground",
        compact && "hidden lg:inline-flex"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-[2px]",
          isFresh
            ? "bg-success"
            : isQuiet
              ? "bg-warning"
              : "bg-muted-foreground/40"
        )}
      />
      {label}
    </span>
  );
}

// ============================================================================
// RELATIONSHIP STATUS PILL
// ============================================================================

function RelationshipPill({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    client: "var(--relationship-clients)",
    prospect: "var(--relationship-clients)",
    past_client: "var(--relationship-team)",
    partner: "var(--relationship-partners)",
    vendor: "var(--relationship-vendors)",
    internal: "var(--relationship-team)",
  };
  const labelMap: Record<string, string> = {
    client: "CLIENT",
    prospect: "PROSPECT",
    past_client: "PAST",
    partner: "PARTNER",
    vendor: "VENDOR",
    internal: "TEAM",
  };
  return (
    <StatusPill
      color={colorMap[status] ?? "var(--relationship-team)"}
      label={labelMap[status] ?? "OTHER"}
    />
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function openNewPersonCapture() {
  window.dispatchEvent(
    new CustomEvent("salt:open-capture", {
      detail: { intent: "person" },
    })
  );
}

function matchesDirectoryFilter(person: MockPerson, filter: DirectoryFilter) {
  switch (filter) {
    case "archived":
      return true;
    case "clients":
      return person.relationshipStatus === "client";
    case "prospects":
      return person.relationshipStatus === "prospect";
    case "partners":
      return ["partner", "vendor"].includes(person.relationshipStatus);
    case "team":
      return person.isInternal;
    case "all":
      return true;
  }
}

function matchesArchiveFilter(
  person: MockPerson,
  filter: DirectoryFilter,
  archivedPersonIds: Set<string>
) {
  const isArchived = archivedPersonIds.has(person.id);
  return filter === "archived" ? isArchived : !isArchived;
}

function matchesSignalFilter(person: MockPerson, filter: SignalFilter | null) {
  if (!filter) return true;

  switch (filter) {
    case "payment_due":
      return person.outstandingAmount > 0;
    case "quiet":
      return person.lastContactDays !== null && person.lastContactDays >= 30;
    case "recent":
      return person.lastContactDays !== null && person.lastContactDays <= 7;
  }
}

function matchesSearchQuery(person: MockPerson, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  const haystack = [
    person.name,
    person.title,
    person.organizationName,
    person.email,
    person.notes,
    ...person.insights,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

function formatLastContact(days: number | null) {
  if (days === null) return "No contact yet";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function formatPersonValue(person: MockPerson) {
  if (person.outstandingAmount > 0) {
    return `$${person.outstandingAmount.toLocaleString()} due`;
  }

  if (person.lifetimeValue > 0) {
    return `$${person.lifetimeValue.toLocaleString()}`;
  }

  return "-";
}

function isProtectedPerson(person: MockPerson) {
  return person.isInternal;
}

function draftMessageForPeople(people: MockPerson[]) {
  window.dispatchEvent(
    new CustomEvent("salt:open-capture", {
      detail: {
        intent: "message",
        people: people.map((person) => person.id),
      },
    })
  );
}

function addNoteForPeople(people: MockPerson[]) {
  window.dispatchEvent(
    new CustomEvent("salt:open-capture", {
      detail: {
        intent: "note",
        people: people.map((person) => person.id),
      },
    })
  );
}

function getPaymentSignal(person: MockPerson) {
  if (person.outstandingAmount > 0) {
    return `$${person.outstandingAmount.toLocaleString()} outstanding`;
  }

  if (person.lifetimeValue > 0) {
    return `$${person.lifetimeValue.toLocaleString()} lifetime`;
  }

  return null;
}
