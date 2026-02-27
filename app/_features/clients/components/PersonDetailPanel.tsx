"use client";

import * as React from "react";
import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/ui";
import { cn } from "@repo/utils";
import {
  X,
  Send,
  RefreshCw,
  XCircle,
  Trash2,
  ShieldCheck,
  Users,
  Clock,
  CheckCircle2,
  Loader2,
  Check,
  Mail,
  Calendar,
  Activity,
} from "lucide-react";
import type { ClientContact, ContactRole, BridgeStatus } from "./PeopleTab";

// =============================================================================
// Types
// =============================================================================

interface PersonDetailPanelProps {
  contact: ClientContact;
  onClose: () => void;
  onSendInvite?: (id: string) => Promise<void>;
  onResendInvite?: (id: string) => Promise<void>;
  onRevokeAccess?: (id: string) => Promise<void>;
  onEdit?: (id: string, data: { name: string; email: string; role: ContactRole }) => Promise<void>;
  onRemove?: (id: string) => Promise<void>;
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

function getBridgeStatusInfo(status: BridgeStatus) {
  switch (status) {
    case "active":
      return {
        icon: <CheckCircle2 className="size-4" />,
        label: "Active",
        color: "text-green-600",
        bgColor: "bg-green-500/10",
        borderColor: "border-green-500/30",
      };
    case "pending":
      return {
        icon: <Clock className="size-4" />,
        label: "Pending",
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/30",
      };
    case "revoked":
      return {
        icon: <XCircle className="size-4" />,
        label: "Revoked",
        color: "text-destructive",
        bgColor: "bg-destructive/10",
        borderColor: "border-destructive/30",
      };
    case "not_invited":
    default:
      return {
        icon: <Mail className="size-4" />,
        label: "Not Invited",
        color: "text-muted-foreground",
        bgColor: "bg-muted/50",
        borderColor: "border-border",
      };
  }
}

// =============================================================================
// Main Component
// =============================================================================

export function PersonDetailPanel({
  contact,
  onClose,
  onSendInvite,
  onResendInvite,
  onRevokeAccess,
  onEdit,
  onRemove,
  className,
}: PersonDetailPanelProps) {
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(contact.name);
  const [editEmail, setEditEmail] = useState(contact.email);
  const [editRole, setEditRole] = useState<ContactRole>(contact.role);
  const [isSaving, setIsSaving] = useState(false);

  // Action states
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [isResendingInvite, setIsResendingInvite] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // Sync edit state with contact prop
  React.useEffect(() => {
    setEditName(contact.name);
    setEditEmail(contact.email);
    setEditRole(contact.role);
    setIsEditing(false);
  }, [contact.id, contact.name, contact.email, contact.role]);

  const statusInfo = getBridgeStatusInfo(contact.bridgeStatus);
  const canRemove = !contact.isPrimaryContact;

  const handleSave = async () => {
    if (!onEdit) return;
    setIsSaving(true);
    try {
      await onEdit(contact.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendInvite = async () => {
    if (!onSendInvite) return;
    setIsSendingInvite(true);
    try {
      await onSendInvite(contact.id);
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleResendInvite = async () => {
    if (!onResendInvite) return;
    setIsResendingInvite(true);
    try {
      await onResendInvite(contact.id);
    } finally {
      setIsResendingInvite(false);
    }
  };

  const handleRevokeAccess = async () => {
    if (!onRevokeAccess) return;
    setIsRevoking(true);
    try {
      await onRevokeAccess(contact.id);
    } finally {
      setIsRevoking(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    setIsRemoving(true);
    try {
      await onRemove(contact.id);
      onClose();
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-card/50", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <h3 className="text-sm font-medium">Contact Details</h3>
        <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-6 pt-4">
          {/* Avatar and Name - More compact */}
          <div className="flex items-start gap-3">
            <Avatar className="size-12">
              <AvatarImage src={contact.avatarUrl} alt={contact.name} />
              <AvatarFallback className="text-sm">
                {getInitials(contact.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium truncate">{contact.name}</h4>
                {contact.isPrimaryContact && (
                  <Badge variant="outline" className="text-[10px] px-1.5 shrink-0">Primary</Badge>
                )}
              </div>
              <a
                href={`mailto:${contact.email}`}
                className="text-sm text-muted-foreground hover:text-foreground truncate block"
              >
                {contact.email}
              </a>
            </div>
          </div>

          {/* Edit Form */}
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-xs font-medium text-muted-foreground">Name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email" className="text-xs font-medium text-muted-foreground">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role" className="text-xs font-medium text-muted-foreground">Type</Label>
                <Select value={editRole} onValueChange={(v) => setEditRole(v as ContactRole)}>
                  <SelectTrigger id="edit-role" className="h-9">
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
                  {editRole === "admin"
                    ? "Admins can add/remove users, view billing, and approve deliverables."
                    : "Team members can view projects, files, and messages."}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setIsEditing(false);
                    setEditName(contact.name);
                    setEditEmail(contact.email);
                    setEditRole(contact.role);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleSave}
                  disabled={isSaving || !editName.trim() || !editEmail.trim()}
                >
                  {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Details Section */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground mb-2">Details</p>
                <div className="rounded-lg border bg-muted/30 divide-y divide-border/50">
                  {/* Role */}
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-sm text-muted-foreground">Type</span>
                    <Badge variant={contact.role === "admin" ? "secondary" : "outline"} className="gap-1 font-normal">
                      {contact.role === "admin" ? (
                        <>
                          <ShieldCheck className="size-3" />
                          Admin
                        </>
                      ) : (
                        "Team Member"
                      )}
                    </Badge>
                  </div>

                  {/* Bridge Status */}
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-sm text-muted-foreground">Bridge Access</span>
                    <span className={cn("text-sm flex items-center gap-1.5", statusInfo.color)}>
                      {statusInfo.icon}
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Invited At */}
                  {contact.invitedAt && (
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-sm text-muted-foreground">Invited</span>
                      <span className="text-sm">
                        {format(contact.invitedAt, "MMM d, yyyy")}
                      </span>
                    </div>
                  )}

                  {/* Joined At */}
                  {contact.joinedAt && (
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-sm text-muted-foreground">Joined</span>
                      <span className="text-sm">
                        {format(contact.joinedAt, "MMM d, yyyy")}
                      </span>
                    </div>
                  )}

                  {/* Last Active */}
                  {contact.bridgeStatus === "active" && contact.lastActiveAt && (
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-sm text-muted-foreground">Last Active</span>
                      <span className="text-sm">
                        {formatDistanceToNow(contact.lastActiveAt, { addSuffix: true })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Permissions info for admins */}
              {contact.role === "admin" && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Permissions</p>
                  <div className="text-xs text-muted-foreground space-y-1.5 pl-1">
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="size-3 text-green-500" />
                      Add and remove team members
                    </p>
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="size-3 text-green-500" />
                      View billing and invoices
                    </p>
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="size-3 text-green-500" />
                      Approve deliverables
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer - Fixed at Bottom */}
      {!isEditing && (
        <div className="shrink-0 p-3 border-t border-border/60 space-y-2">
          {/* Bridge Actions based on status */}
          {contact.bridgeStatus === "not_invited" && onSendInvite && (
            <Button
              className="w-full h-9"
              onClick={handleSendInvite}
              disabled={isSendingInvite}
            >
              {isSendingInvite ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Send Bridge Invite
            </Button>
          )}

          {contact.bridgeStatus === "pending" && (
            <>
              {onResendInvite && (
                <Button
                  variant="outline"
                  className="w-full h-9"
                  onClick={handleResendInvite}
                  disabled={isResendingInvite}
                >
                  {isResendingInvite ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  Resend Invite
                </Button>
              )}
              {onRevokeAccess && (
                <Button
                  variant="ghost"
                  className="w-full h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleRevokeAccess}
                  disabled={isRevoking}
                >
                  {isRevoking ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <XCircle className="size-4" />
                  )}
                  Revoke Invite
                </Button>
              )}
            </>
          )}

          {contact.bridgeStatus === "active" && onRevokeAccess && (
            <Button
              variant="outline"
              className="w-full h-9 text-destructive border-destructive/50 hover:bg-destructive/10"
              onClick={handleRevokeAccess}
              disabled={isRevoking}
            >
              {isRevoking ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <XCircle className="size-4" />
              )}
              Revoke Access
            </Button>
          )}

          {contact.bridgeStatus === "revoked" && onSendInvite && (
            <Button
              className="w-full h-9"
              onClick={handleSendInvite}
              disabled={isSendingInvite}
            >
              {isSendingInvite ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Send New Invite
            </Button>
          )}

          {/* Edit button */}
          {onEdit && (
            <Button
              variant="outline"
              className="w-full h-9"
              onClick={() => setIsEditing(true)}
            >
              Edit Contact
            </Button>
          )}

          {/* Remove button */}
          {canRemove && onRemove && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-4" />
                  Remove Contact
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove contact?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove {contact.name} from this client&apos;s contacts.
                    {contact.bridgeStatus === "active" && " Their Bridge access will also be revoked."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRemove}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isRemoving}
                  >
                    {isRemoving ? <Loader2 className="size-4 animate-spin" /> : "Remove"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}
    </div>
  );
}
