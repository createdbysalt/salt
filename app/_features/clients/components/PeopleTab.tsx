"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from "@tanstack/react-table";
import {
  Plus,
  MoreHorizontal,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  Send,
  RefreshCw,
  Trash2,
  Pencil,
  ShieldCheck,
  Loader2,
  ArrowUpDown,
  Search,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
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
} from "@repo/ui";
import { cn } from "@repo/utils";
import { toast } from "sonner";
import { PersonDetailPanel } from "./PersonDetailPanel";
import { PeopleBulkActionBar } from "./PeopleBulkActionBar";

// =============================================================================
// Types
// =============================================================================

export type ContactRole = "admin" | "member";
export type BridgeStatus = "not_invited" | "pending" | "active" | "revoked";

export interface ClientContact {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: ContactRole;
  bridgeStatus: BridgeStatus;
  invitedAt?: Date;
  joinedAt?: Date;
  lastActiveAt?: Date;
  isPrimaryContact?: boolean;
}

interface PeopleTabProps {
  clientId: string;
  clientName: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  contacts: ClientContact[];
  isLoading?: boolean;
  onAddPerson?: (_data: { name: string; email: string; role: ContactRole; sendInvite: boolean }) => Promise<void>;
  onEditPerson?: (_id: string, _data: { name: string; email: string; role: ContactRole }) => Promise<void>;
  onSendInvite?: (_id: string) => Promise<void>;
  onResendInvite?: (_id: string) => Promise<void>;
  onRevokeAccess?: (_id: string) => Promise<void>;
  onRemovePerson?: (_id: string) => Promise<void>;
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getRoleBadge(role: ContactRole) {
  if (role === "admin") {
    return (
      <Badge variant="secondary" className="gap-1">
        <ShieldCheck className="size-3" />
        Admin
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Team Member
    </Badge>
  );
}

function getBridgeStatusBadge(status: BridgeStatus) {
  switch (status) {
    case "active":
      return (
        <Badge variant="outline" className="text-foreground">
          <CheckCircle2 className="size-3 mr-1" />
          Active
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <Clock className="size-3 mr-1" />
          Pending
        </Badge>
      );
    case "revoked":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <XCircle className="size-3 mr-1" />
          Revoked
        </Badge>
      );
    case "not_invited":
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Not Invited
        </Badge>
      );
  }
}

// Bridge status sort order (active first, then pending, not_invited, revoked)
const BRIDGE_STATUS_ORDER: Record<BridgeStatus, number> = {
  active: 0,
  pending: 1,
  not_invited: 2,
  revoked: 3,
};

// Role sort order (admin first)
const ROLE_ORDER: Record<ContactRole, number> = {
  admin: 0,
  member: 1,
};

// =============================================================================
// Add Person Dialog
// =============================================================================

interface AddPersonDialogProps {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  onSubmit: (_data: { name: string; email: string; role: ContactRole; sendInvite: boolean }) => Promise<void>;
}

function AddPersonDialog({ open, onOpenChange, onSubmit }: AddPersonDialogProps) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<ContactRole>("member");
  const [sendInvite, setSendInvite] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), email: email.trim(), role, sendInvite });
      // Reset form
      setName("");
      setEmail("");
      setRole("member");
      setSendInvite(true);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Person</DialogTitle>
          <DialogDescription>
            Add a new contact from this client&apos;s team.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sarah Chen"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah@company.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Type</Label>
            <Select value={role} onValueChange={(v) => setRole(v as ContactRole)}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4" />
                    Admin
                  </div>
                </SelectItem>
                <SelectItem value="member">
                  <div className="flex items-center gap-2">
                    <Users className="size-4" />
                    Team Member
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {role === "admin"
                ? "Admins can add/remove users, view billing, and approve deliverables."
                : "Team members can view projects, files, and messages."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="send-invite"
              checked={sendInvite}
              onCheckedChange={(checked) => setSendInvite(checked === true)}
            />
            <Label htmlFor="send-invite" className="text-sm font-normal">
              Send Bridge invite immediately
            </Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim() || !email.trim()}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Add Person
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Row Actions
// =============================================================================

interface RowActionsProps {
  contact: ClientContact;
  onSendInvite?: () => void;
  onResendInvite?: () => void;
  onRevokeAccess?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
}

function RowActions({
  contact,
  onSendInvite,
  onResendInvite,
  onRevokeAccess,
  onEdit,
  onRemove,
}: RowActionsProps) {
  const canRemove = !contact.isPrimaryContact;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* Bridge invite actions based on status */}
        {contact.bridgeStatus === "not_invited" && onSendInvite && (
          <DropdownMenuItem onClick={onSendInvite}>
            <Send className="size-4 mr-2" />
            Send Bridge Invite
          </DropdownMenuItem>
        )}
        {contact.bridgeStatus === "pending" && onResendInvite && (
          <DropdownMenuItem onClick={onResendInvite}>
            <RefreshCw className="size-4 mr-2" />
            Resend Invite
          </DropdownMenuItem>
        )}
        {contact.bridgeStatus === "pending" && onRevokeAccess && (
          <DropdownMenuItem onClick={onRevokeAccess}>
            <XCircle className="size-4 mr-2" />
            Revoke Invite
          </DropdownMenuItem>
        )}
        {contact.bridgeStatus === "active" && onRevokeAccess && (
          <DropdownMenuItem onClick={onRevokeAccess}>
            <XCircle className="size-4 mr-2" />
            Revoke Access
          </DropdownMenuItem>
        )}
        {contact.bridgeStatus === "revoked" && onSendInvite && (
          <DropdownMenuItem onClick={onSendInvite}>
            <Send className="size-4 mr-2" />
            Send New Invite
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="size-4 mr-2" />
            Edit
          </DropdownMenuItem>
        )}

        {canRemove && onRemove && (
          <DropdownMenuItem
            onClick={onRemove}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="size-4 mr-2" />
            Remove
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      {/* Table skeleton */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Bridge Status</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map((i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="size-4" /></TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-8 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
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
// Empty State
// =============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="size-10 rounded-full bg-muted flex items-center justify-center mb-3">
        <Users className="size-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">No contacts yet</p>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">
        Add people from this client&apos;s team to manage their Bridge access.
      </p>
    </div>
  );
}

// =============================================================================
// Toolbar
// =============================================================================

interface ToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onAddPerson?: () => void;
}

function Toolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onAddPerson,
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

      {/* Status Filter */}
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="h-9 w-[140px] bg-muted/50 border-transparent">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="not_invited">Not Invited</SelectItem>
          <SelectItem value="revoked">Revoked</SelectItem>
        </SelectContent>
      </Select>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right-side actions */}
      {onAddPerson && (
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground" onClick={onAddPerson}>
          <Plus className="size-4" />
          Add Person
        </Button>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function PeopleTab({
  clientId: _clientId,
  clientName: _clientName,
  primaryContactName,
  primaryContactEmail,
  contacts,
  isLoading = false,
  onAddPerson,
  onEditPerson,
  onSendInvite,
  onResendInvite,
  onRevokeAccess,
  onRemovePerson,
  className,
}: PeopleTabProps) {
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  // Selected person for detail panel
  const [selectedPerson, setSelectedPerson] = React.useState<ClientContact | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");

  // Merge primary contact into contacts list if they exist and aren't already in the list
  const allContacts = React.useMemo(() => {
    if (!primaryContactEmail) return contacts;

    const primaryExists = contacts.some(
      (c) => c.email.toLowerCase() === primaryContactEmail.toLowerCase()
    );

    if (primaryExists) {
      // Mark the existing contact as primary and use client's contact name if available
      return contacts.map((c) =>
        c.email.toLowerCase() === primaryContactEmail.toLowerCase()
          ? {
              ...c,
              isPrimaryContact: true,
              role: "admin" as ContactRole,
              // Use primaryContactName from client profile if available
              name: primaryContactName || c.name,
            }
          : c
      );
    }

    // Add primary contact at the top
    const primaryContact: ClientContact = {
      id: "primary",
      name: primaryContactName || primaryContactEmail.split("@")[0],
      email: primaryContactEmail,
      role: "admin",
      bridgeStatus: "not_invited",
      isPrimaryContact: true,
    };

    return [primaryContact, ...contacts];
  }, [contacts, primaryContactEmail, primaryContactName]);

  // Apply filters
  const filteredContacts = React.useMemo(() => {
    let result = allContacts;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((c) => c.bridgeStatus === statusFilter);
    }

    return result;
  }, [allContacts, searchQuery, statusFilter]);

  // Handle row click to select person
  const handleRowClick = React.useCallback((contact: ClientContact) => {
    setSelectedPerson(contact);
  }, []);

  // Handle closing detail panel
  const handleClosePanel = React.useCallback(() => {
    setSelectedPerson(null);
  }, []);

  // Handle edit from panel - update local state after edit
  const handleEditFromPanel = React.useCallback(async (
    id: string,
    data: { name: string; email: string; role: ContactRole }
  ) => {
    await onEditPerson?.(id, data);
    // Update selected person to reflect changes
    setSelectedPerson((prev) =>
      prev?.id === id ? { ...prev, ...data } : prev
    );
  }, [onEditPerson]);

  // Handle send invite from panel
  const handleSendInviteFromPanel = React.useCallback(async (id: string) => {
    await onSendInvite?.(id);
    // Update selected person status
    setSelectedPerson((prev) =>
      prev?.id === id ? { ...prev, bridgeStatus: "pending" as BridgeStatus, invitedAt: new Date() } : prev
    );
  }, [onSendInvite]);

  // Handle resend invite from panel
  const handleResendInviteFromPanel = React.useCallback(async (id: string) => {
    await onResendInvite?.(id);
    setSelectedPerson((prev) =>
      prev?.id === id ? { ...prev, invitedAt: new Date() } : prev
    );
  }, [onResendInvite]);

  // Handle revoke access from panel
  const handleRevokeFromPanel = React.useCallback(async (id: string) => {
    await onRevokeAccess?.(id);
    setSelectedPerson((prev) =>
      prev?.id === id ? { ...prev, bridgeStatus: "revoked" as BridgeStatus } : prev
    );
  }, [onRevokeAccess]);

  // Handle remove from panel
  const handleRemoveFromPanel = React.useCallback(async (id: string) => {
    await onRemovePerson?.(id);
    setSelectedPerson(null);
  }, [onRemovePerson]);

  // Column definitions with sorting
  const columns: ColumnDef<ClientContact>[] = React.useMemo(() => [
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
      accessorKey: "name",
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
        const contact = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="size-8">
              <AvatarImage src={contact.avatarUrl} alt={contact.name} />
              <AvatarFallback className="text-xs">
                {getInitials(contact.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <span className="font-medium">{contact.name}</span>
              {contact.isPrimaryContact && (
                <Badge variant="outline" className="text-xs">
                  Primary
                </Badge>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Email
          <ArrowUpDown className="size-3.5" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.email}</span>
      ),
    },
    {
      accessorKey: "role",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Type
          <ArrowUpDown className="size-3.5" />
        </button>
      ),
      cell: ({ row }) => getRoleBadge(row.original.role),
      sortingFn: (rowA, rowB) => {
        return ROLE_ORDER[rowA.original.role] - ROLE_ORDER[rowB.original.role];
      },
    },
    {
      accessorKey: "bridgeStatus",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Bridge Status
          <ArrowUpDown className="size-3.5" />
        </button>
      ),
      cell: ({ row }) => getBridgeStatusBadge(row.original.bridgeStatus),
      sortingFn: (rowA, rowB) => {
        return BRIDGE_STATUS_ORDER[rowA.original.bridgeStatus] - BRIDGE_STATUS_ORDER[rowB.original.bridgeStatus];
      },
    },
    {
      accessorKey: "lastActiveAt",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Last Active
          <ArrowUpDown className="size-3.5" />
        </button>
      ),
      cell: ({ row }) => {
        const contact = row.original;
        return (
          <span className="text-muted-foreground text-sm">
            {contact.bridgeStatus === "active" && contact.lastActiveAt
              ? formatDistanceToNow(contact.lastActiveAt, { addSuffix: true })
              : "—"}
          </span>
        );
      },
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.lastActiveAt;
        const b = rowB.original.lastActiveAt;
        if (!a && !b) return 0;
        if (!a) return 1;
        if (!b) return -1;
        return new Date(a).getTime() - new Date(b).getTime();
      },
    },
    {
      id: "actions",
      header: () => null,
      cell: ({ row }) => {
        const contact = row.original;
        return (
          <RowActions
            contact={contact}
            onSendInvite={onSendInvite ? () => onSendInvite(contact.id) : undefined}
            onResendInvite={onResendInvite ? () => onResendInvite(contact.id) : undefined}
            onRevokeAccess={onRevokeAccess ? () => onRevokeAccess(contact.id) : undefined}
            onEdit={onEditPerson ? () => {} : undefined}
            onRemove={onRemovePerson ? () => onRemovePerson(contact.id) : undefined}
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ], [onSendInvite, onResendInvite, onRevokeAccess, onEditPerson, onRemovePerson]);

  const table = useReactTable({
    data: filteredContacts,
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
    getRowId: (row) => row.id,
  });

  // Get selected contact IDs
  const selectedContactIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
  const selectedCount = selectedContactIds.length;

  // Get selected contacts for bulk action filtering
  const selectedContacts = filteredContacts.filter((c) => selectedContactIds.includes(c.id));
  const invitableCount = selectedContacts.filter((c) => c.bridgeStatus === "not_invited" || c.bridgeStatus === "revoked").length;
  const revokableCount = selectedContacts.filter((c) => c.bridgeStatus === "active" || c.bridgeStatus === "pending").length;
  const removableCount = selectedContacts.filter((c) => !c.isPrimaryContact).length;

  // Clear selection
  const clearSelection = () => setRowSelection({});

  // Bulk action handlers
  const handleBulkSendInvites = async () => {
    const invitableContacts = selectedContacts.filter((c) => c.bridgeStatus === "not_invited" || c.bridgeStatus === "revoked");
    for (const contact of invitableContacts) {
      await onSendInvite?.(contact.id);
    }
    toast.success(`Invites sent to ${invitableContacts.length} contact${invitableContacts.length === 1 ? "" : "s"}`);
    clearSelection();
  };

  const handleBulkRevokeAccess = async () => {
    const revokableContacts = selectedContacts.filter((c) => c.bridgeStatus === "active" || c.bridgeStatus === "pending");
    for (const contact of revokableContacts) {
      await onRevokeAccess?.(contact.id);
    }
    toast.success(`Access revoked for ${revokableContacts.length} contact${revokableContacts.length === 1 ? "" : "s"}`);
    clearSelection();
  };

  const handleBulkRemove = async () => {
    const removableContacts = selectedContacts.filter((c) => !c.isPrimaryContact);
    for (const contact of removableContacts) {
      await onRemovePerson?.(contact.id);
    }
    toast.success(`${removableContacts.length} contact${removableContacts.length === 1 ? "" : "s"} removed`);
    clearSelection();
  };

  const handleAddPerson = async (data: {
    name: string;
    email: string;
    role: ContactRole;
    sendInvite: boolean;
  }) => {
    await onAddPerson?.(data);
  };

  if (isLoading) {
    return (
      <div className={cn("p-6", className)}>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <>
      {/* Add Person Dialog */}
      {onAddPerson && (
        <AddPersonDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSubmit={handleAddPerson}
        />
      )}

      <div className={cn("flex h-full", className)}>
        {/* Left Side - Toolbar + Table */}
        <div className="flex-1 min-w-0 p-6 space-y-4">
          {/* Toolbar */}
          <Toolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onAddPerson={onAddPerson ? () => setAddDialogOpen(true) : undefined}
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
                      <EmptyState />
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={cn(
                        "hover:bg-muted/50 cursor-pointer",
                        selectedPerson?.id === row.original.id && "bg-muted/50"
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

        {/* Right Side - Detail Panel */}
        {selectedPerson && (
          <div className="w-[340px] shrink-0 border-l">
            <PersonDetailPanel
              contact={selectedPerson}
              onClose={handleClosePanel}
              onSendInvite={onSendInvite ? handleSendInviteFromPanel : undefined}
              onResendInvite={onResendInvite ? handleResendInviteFromPanel : undefined}
              onRevokeAccess={onRevokeAccess ? handleRevokeFromPanel : undefined}
              onEdit={onEditPerson ? handleEditFromPanel : undefined}
              onRemove={onRemovePerson ? handleRemoveFromPanel : undefined}
              className="h-full"
            />
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      <PeopleBulkActionBar
        selectedCount={selectedCount}
        onClearSelection={clearSelection}
        onSendInvites={onSendInvite ? handleBulkSendInvites : undefined}
        onRevokeAccess={onRevokeAccess ? handleBulkRevokeAccess : undefined}
        onRemove={onRemovePerson ? handleBulkRemove : undefined}
        invitableCount={invitableCount}
        revokableCount={revokableCount}
        removableCount={removableCount}
      />
    </>
  );
}
