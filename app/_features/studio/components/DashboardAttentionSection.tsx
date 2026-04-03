"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui";
import {
  FileText,
  Users,
  Target,
  Send,
  TrendingUp,
  CheckCircle2,
  UserPlus,
  Clock,
} from "lucide-react";
import type { ActionItem, RecentWin } from "@/app/actions/insights/types";

interface DashboardAttentionSectionProps {
  actionItems: ActionItem[];
  recentWins: RecentWin[];
}

// Type labels and icons for action items
const typeLabels: Record<ActionItem["type"], string> = {
  invoice: "Invoice",
  lead: "Inquiry",
  milestone: "Milestone",
  proposal: "Proposal",
};

const typeIcons: Record<ActionItem["type"], React.ReactNode> = {
  invoice: <FileText className="size-4" />,
  lead: <Users className="size-4" />,
  milestone: <Target className="size-4" />,
  proposal: <Send className="size-4" />,
};

// Type labels and icons for recent wins
const winTypeLabels: Record<RecentWin["type"], string> = {
  invoice_paid: "Payment",
  project_completed: "Completed",
  new_client: "New Client",
  proposal_accepted: "Accepted",
};

const winTypeIcons: Record<RecentWin["type"], React.ReactNode> = {
  invoice_paid: <TrendingUp className="size-4 text-green-500" />,
  project_completed: <CheckCircle2 className="size-4 text-blue-500" />,
  new_client: <UserPlus className="size-4 text-purple-500" />,
  proposal_accepted: <Send className="size-4 text-green-500" />,
};

// Status styles and labels
const statusStyles: Record<ActionItem["status"], string> = {
  overdue: "border-red-500/50 bg-red-500/10 text-red-600",
  due_soon: "border-amber-500/50 bg-amber-500/10 text-amber-600",
  stale: "border-orange-500/50 bg-orange-500/10 text-orange-600",
  pending: "border-border bg-muted text-muted-foreground",
};

const statusLabels: Record<ActionItem["status"], string> = {
  overdue: "Overdue",
  due_soon: "Due Soon",
  stale: "Needs Follow-up",
  pending: "Pending",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Column definitions for Action Items table
const actionItemColumns: ColumnDef<ActionItem>[] = [
  {
    accessorKey: "title",
    header: "Item",
    cell: ({ row }) => {
      const item = row.original;
      return (
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
            {typeIcons[item.type]}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{item.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {item.subtitle}
              {item.daysOverdue && ` · ${item.daysOverdue} days overdue`}
              {item.daysInStage && ` · ${item.daysInStage} days in stage`}
            </p>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <Badge variant="outline" className="text-muted-foreground">
        {typeLabels[row.original.type]}
      </Badge>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant="outline" className={statusStyles[row.original.status]}>
        {statusLabels[row.original.status]}
      </Badge>
    ),
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => (
      <div className="text-right">
        {row.original.amount ? (
          <span className="font-medium tabular-nums">
            {formatCurrency(row.original.amount)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
    ),
  },
];

// Column definitions for Recent Wins table
const recentWinColumns: ColumnDef<RecentWin>[] = [
  {
    accessorKey: "title",
    header: "Win",
    cell: ({ row }) => {
      const win = row.original;
      return (
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
            {winTypeIcons[win.type]}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{win.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {win.subtitle}
            </p>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <Badge variant="outline" className="text-muted-foreground">
        {winTypeLabels[row.original.type]}
      </Badge>
    ),
  },
  {
    id: "when",
    header: "When",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatRelativeDate(row.original.timestamp)}
      </span>
    ),
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => (
      <div className="text-right">
        {row.original.amount ? (
          <span className="font-medium tabular-nums text-green-600">
            +{formatCurrency(row.original.amount)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
    ),
  },
];

// Action Items DataTable component
function ActionItemsTable({ data }: { data: ActionItem[] }) {
  const table = useReactTable({
    data,
    columns: actionItemColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/50">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
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
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => (window.location.href = row.original.href)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={actionItemColumns.length}
                className="h-24 text-center"
              >
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// Recent Wins DataTable component
function RecentWinsTable({ data }: { data: RecentWin[] }) {
  const table = useReactTable({
    data,
    columns: recentWinColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/50">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
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
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => (window.location.href = row.original.href)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={recentWinColumns.length}
                className="h-24 text-center"
              >
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function DashboardAttentionSection({
  actionItems,
  recentWins,
}: DashboardAttentionSectionProps) {
  return (
    <Tabs
      defaultValue="action-items"
      className="w-full flex-col justify-start"
    >
      <div className="flex items-center justify-between py-3">
          <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1">
            <TabsTrigger value="action-items">
              Action Items{" "}
              {actionItems.length > 0 && (
                <Badge variant="secondary">{actionItems.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="recent-wins">
              Recent Wins{" "}
              {recentWins.length > 0 && (
                <Badge variant="secondary">{recentWins.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="action-items"
          className="relative flex flex-col gap-4"
        >
          {actionItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
              <CheckCircle2 className="mb-2 size-8 text-green-500" />
              <p className="text-sm font-medium">All caught up!</p>
              <p className="text-xs text-muted-foreground">
                No items need your attention right now.
              </p>
            </div>
          ) : (
            <ActionItemsTable data={actionItems} />
          )}
        </TabsContent>

        <TabsContent
          value="recent-wins"
          className="relative flex flex-col gap-4"
        >
          {recentWins.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
              <Clock className="mb-2 size-8 text-muted-foreground" />
              <p className="text-sm font-medium">No recent wins yet</p>
              <p className="text-xs text-muted-foreground">
                Completed projects and paid invoices will appear here.
              </p>
            </div>
          ) : (
            <RecentWinsTable data={recentWins} />
          )}
        </TabsContent>
      </Tabs>
  );
}
