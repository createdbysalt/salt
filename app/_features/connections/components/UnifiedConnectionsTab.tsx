"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Briefcase,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  CreditCard,
  File,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  SlidersHorizontal,
  StickyNote,
  Unlink,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui";
import { cn } from "@repo/utils";
import { MemoryCreateLinkButton } from "@/app/_features/memory/components/MemoryCreateLinkButton";
import { RadixAfterHydration } from "@/app/_features/memory/components/RadixAfterHydration";
import {
  MemoryRecordTabSearch,
  MemoryRecordTabShell,
  memoryRecordFilterIconButtonClass,
} from "@/app/_features/memory/components/MemoryRecordTabHeader";
import { removeMemoryConnection } from "@/app/_features/memory/actions/connections";
import type { ConnectionNode, NodeType } from "../types";
import { NODE_TYPE_META } from "../types";
import type { Connection } from "@/app/_lib/demo/people-demo-data";

type FilterOption = NodeType | "all";

const FILTER_OPTIONS: { value: FilterOption; label: string; icon: typeof User }[] = [
  { value: "all", label: "All types", icon: Users },
  { value: "person", label: "People", icon: User },
  { value: "org", label: "Orgs", icon: Building2 },
  { value: "work", label: "Work", icon: Briefcase },
  { value: "billing", label: "Billing", icon: CreditCard },
  { value: "meeting", label: "Meetings", icon: Calendar },
  { value: "conversation", label: "Conversations", icon: MessageSquare },
  { value: "file", label: "Files", icon: File },
  { value: "note", label: "Notes", icon: StickyNote },
];

const NODE_TYPE_ICONS: Record<NodeType, typeof User> = {
  person: User,
  org: Building2,
  work: Briefcase,
  billing: CreditCard,
  file: File,
  note: StickyNote,
  conversation: MessageSquare,
  meeting: Calendar,
};

const filterIconButtonClass = memoryRecordFilterIconButtonClass;

function formatTypeLabel(nodeType: NodeType): string {
  return NODE_TYPE_META[nodeType].label;
}

function groupByType(
  connections: ConnectionNode[]
): Record<NodeType, ConnectionNode[]> {
  const groups: Record<NodeType, ConnectionNode[]> = {
    person: [],
    org: [],
    work: [],
    billing: [],
    file: [],
    note: [],
    conversation: [],
    meeting: [],
  };

  for (const conn of connections) {
    groups[conn.nodeType].push(conn);
  }

  return groups;
}

function matchesSearch(node: ConnectionNode, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const haystack = [node.label, node.sublabel, formatTypeLabel(node.nodeType)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

function ConnectionRow({
  node,
  onUnlink,
  isUnlinking,
}: {
  node: ConnectionNode;
  onUnlink?: () => void;
  isUnlinking?: boolean;
}) {
  const Icon = NODE_TYPE_ICONS[node.nodeType];
  const trailingMeta = formatTypeLabel(node.nodeType);

  const content = (
    <>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-4 text-muted-foreground" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{node.label}</p>
        {node.sublabel ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{node.sublabel}</p>
        ) : null}
      </div>
      <span className="hidden max-w-[160px] truncate text-xs text-muted-foreground sm:block">
        {trailingMeta}
      </span>
    </>
  );

  const actionButton = onUnlink ? (
    <RadixAfterHydration
      fallback={
        <button
          type="button"
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 hover:bg-muted hover:text-foreground"
        >
          <MoreHorizontal className="size-4" strokeWidth={2} />
        </button>
      }
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={isUnlinking}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            {isUnlinking ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MoreHorizontal className="size-4" strokeWidth={2} />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onUnlink();
            }}
            className="text-destructive focus:text-destructive"
          >
            <Unlink className="mr-2 size-4" strokeWidth={1.75} />
            Unlink
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </RadixAfterHydration>
  ) : node.href ? (
    <ChevronRight className="size-4 shrink-0 text-muted-foreground/70" strokeWidth={2} />
  ) : null;

  if (node.href) {
    return (
      <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-muted/50">
        <Link href={node.href} className="flex min-w-0 flex-1 items-center gap-3">
          {content}
        </Link>
        {actionButton}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-muted/50">
      {content}
      {actionButton}
    </div>
  );
}

function TypeFilterPopover({
  filter,
  onFilterChange,
  counts,
  options,
}: {
  filter: FilterOption;
  onFilterChange: (value: FilterOption) => void;
  counts: Record<FilterOption, number>;
  options: (typeof FILTER_OPTIONS)[number][];
}) {
  const activeFilterCount = filter === "all" ? 0 : 1;

  const trigger = (
    <button
      type="button"
      aria-label="Filter connections"
      className={cn(
        filterIconButtonClass,
        activeFilterCount > 0 && "border-foreground/40 text-foreground"
      )}
    >
      <SlidersHorizontal className="size-4" strokeWidth={2} />
      {activeFilterCount > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background">
          {activeFilterCount}
        </span>
      ) : null}
    </button>
  );

  return (
    <RadixAfterHydration fallback={trigger}>
      <Popover>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent align="end" className="w-56 p-1">
          {options.map((option) => {
            const Icon = option.icon;
            const active = filter === option.value;
            const count = counts[option.value];

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onFilterChange(option.value)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition hover:bg-muted/60",
                  active ? "font-medium text-foreground" : "text-foreground/80"
                )}
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <Icon className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={2} />
                  <span className="truncate">{option.label}</span>
                  <span className="tabular-nums text-xs text-muted-foreground">{count}</span>
                </span>
                {active ? <Check className="size-3.5 shrink-0" strokeWidth={2.5} /> : null}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>
    </RadixAfterHydration>
  );
}

type UnifiedConnectionsTabProps = {
  recordKind: "person" | "org" | "work" | "billing" | "file" | "meeting";
  recordId: string;
  recordName: string;
  connections: ConnectionNode[];
  onLink?: (connection: Connection) => void;
  onUnlink?: (node: ConnectionNode) => void;
};

export function UnifiedConnectionsTab({
  recordKind,
  recordId,
  recordName,
  connections,
  onLink,
  onUnlink,
}: UnifiedConnectionsTabProps) {
  const [filter, setFilter] = useState<FilterOption>("all");
  const [query, setQuery] = useState("");
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleUnlink = (node: ConnectionNode) => {
    const entityId = node.id.split(":")[1] ?? node.id;
    setUnlinkingId(node.id);

    startTransition(async () => {
      const result = await removeMemoryConnection({
        recordKind,
        recordId,
        connectionType: node.nodeType as "person" | "org" | "work" | "billing" | "conversation" | "meeting",
        connectionId: entityId,
      });

      setUnlinkingId(null);

      if (result.success) {
        toast.success(`Unlinked ${node.label}`);
        onUnlink?.(node);
      } else {
        toast.error("Failed to unlink", { description: result.error });
      }
    });
  };

  const grouped = useMemo(() => groupByType(connections), [connections]);

  const counts = useMemo(() => {
    const result: Record<FilterOption, number> = {
      all: connections.length,
      person: grouped.person.length,
      org: grouped.org.length,
      work: grouped.work.length,
      billing: grouped.billing.length,
      file: grouped.file.length,
      note: grouped.note.length,
      conversation: grouped.conversation.length,
      meeting: grouped.meeting.length,
    };
    return result;
  }, [connections.length, grouped]);

  const filterOptions = useMemo(
    () => FILTER_OPTIONS.filter((opt) => opt.value === "all" || counts[opt.value] > 0),
    [counts]
  );

  const filteredConnections = useMemo(() => {
    const byType = filter === "all" ? connections : grouped[filter];
    return byType.filter((node) => matchesSearch(node, query));
  }, [filter, connections, grouped, query]);

  const existingAsConnections: Connection[] = useMemo(
    () =>
      connections.map((conn) => ({
        id: conn.id.split(":")[1] ?? conn.id,
        type: conn.nodeType,
        name: conn.label,
        subtitle: conn.sublabel,
      })),
    [connections]
  );

  const showToolbarControls = connections.length > 0;

  return (
    <MemoryRecordTabShell
      title="Connections"
      action={
        onLink ? (
          <MemoryCreateLinkButton
            variant="panel"
            recordKind={recordKind}
            recordId={recordId}
            recordName={recordName}
            existingConnections={existingAsConnections}
            onLink={onLink}
          />
        ) : null
      }
      showToolbar={showToolbarControls}
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          <MemoryRecordTabSearch
            value={query}
            onChange={setQuery}
            placeholder="Search connections…"
          />
          {filterOptions.length > 1 ? (
            <TypeFilterPopover
              filter={filter}
              onFilterChange={setFilter}
              counts={counts}
              options={filterOptions}
            />
          ) : null}
        </div>
      }
    >

      {connections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-8 text-center">
          <Users className="mx-auto mb-2 size-6 text-muted-foreground" strokeWidth={1.75} />
          <p className="text-sm text-muted-foreground">
            Nothing is connected to this {recordKind} yet.
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground/80">
            Link people, organizations, work, payments, or files so Salt can see the full context.
          </p>
        </div>
      ) : null}

      {connections.length > 0 && filteredConnections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-8 text-center">
          <p className="text-sm text-muted-foreground">No connections match your search or filter.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
            className="mt-2 text-xs font-medium text-foreground/80 hover:text-foreground"
          >
            Clear search and filter
          </button>
        </div>
      ) : null}

      {filteredConnections.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
          {filteredConnections.map((node, index) => (
            <div
              key={node.id}
              className={cn(index > 0 && "border-t border-border/50")}
            >
              <ConnectionRow
                node={node}
                onUnlink={() => handleUnlink(node)}
                isUnlinking={unlinkingId === node.id && isPending}
              />
            </div>
          ))}
        </div>
      ) : null}
    </MemoryRecordTabShell>
  );
}
