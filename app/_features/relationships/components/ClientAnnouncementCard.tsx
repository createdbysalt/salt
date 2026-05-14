"use client";

import * as React from "react";
import { Pin, Pencil, Trash2, Loader2, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Textarea,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Alert,
  AlertDescription,
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  getClientAnnouncement,
  upsertClientAnnouncement,
  deleteClientAnnouncement,
} from "../actions";

interface ClientAnnouncementCardProps {
  clientId: string;
}

export function ClientAnnouncementCard({ clientId }: ClientAnnouncementCardProps) {
  const [message, setMessage] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [clientAnnouncement, setClientAnnouncement] = React.useState<{
    id: string;
    message: string;
    authorName: string;
    authorAvatarUrl: string | null;
    createdAt: string;
  } | null>(null);
  const [studioDefault, setStudioDefault] = React.useState<{
    message: string;
  } | null>(null);

  // Load existing announcement
  const loadAnnouncement = React.useCallback(async () => {
    const result = await getClientAnnouncement(clientId);
    if (result.success && result.data) {
      if (result.data.clientAnnouncement) {
        setClientAnnouncement(result.data.clientAnnouncement);
        setMessage(result.data.clientAnnouncement.message);
      } else {
        setClientAnnouncement(null);
        setMessage("");
      }
      if (result.data.studioDefault) {
        setStudioDefault({ message: result.data.studioDefault.message });
      }
    }
    setIsLoading(false);
  }, [clientId]);

  React.useEffect(() => {
    loadAnnouncement();
  }, [loadAnnouncement]);

  const handleSave = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setIsSaving(true);
    const result = await upsertClientAnnouncement(clientId, message.trim());
    setIsSaving(false);

    if (result.success) {
      setIsDialogOpen(false);
      toast.success("Message saved");
      loadAnnouncement();
    } else {
      toast.error(result.error || "Failed to save");
    }
  };

  const handleDelete = async () => {
    setIsSaving(true);
    const result = await deleteClientAnnouncement(clientId);
    setIsSaving(false);

    if (result.success) {
      setClientAnnouncement(null);
      setMessage("");
      toast.success("Custom message removed");
    } else {
      toast.error(result.error || "Failed to remove");
    }
  };

  const openEditDialog = () => {
    setMessage(clientAnnouncement?.message || "");
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const initials = clientAnnouncement?.authorName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Pin className="size-4" />
          Pinned Message
        </CardTitle>
        <CardDescription>
          This message appears on this client&apos;s portal overview.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {clientAnnouncement ? (
          <>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm leading-relaxed">
                &ldquo;{clientAnnouncement.message}&rdquo;
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Avatar className="size-5">
                  <AvatarImage src={clientAnnouncement.authorAvatarUrl || undefined} />
                  <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                </Avatar>
                <span>
                  {clientAnnouncement.authorName} &middot;{" "}
                  {formatDistanceToNow(new Date(clientAnnouncement.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={openEditDialog}>
                <Pencil className="size-3.5" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isSaving}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
                Remove
              </Button>
            </div>
          </>
        ) : (
          <>
            {studioDefault ? (
              <Alert>
                <Info className="size-4" />
                <AlertDescription>
                  Using your studio&apos;s default message. Set a custom message
                  to override it for this client.
                </AlertDescription>
              </Alert>
            ) : (
              <p className="text-sm text-muted-foreground">
                No message set. Add a pinned message to keep this client informed.
              </p>
            )}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Pin className="size-3.5" />
                  {studioDefault ? "Set Custom Message" : "Add Message"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Pinned Message</DialogTitle>
                  <DialogDescription>
                    This message will appear on the client&apos;s portal overview.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Textarea
                    placeholder="We're working on your homepage mockups — expect them by Friday!"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Keep it brief and actionable. Good for: project updates, status
                    changes, heads-up notices.
                  </p>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || !message.trim()}
                  >
                    {isSaving && <Loader2 className="size-4 animate-spin" />}
                    Save Message
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}

        {/* Edit Dialog (separate from create) */}
        {clientAnnouncement && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Pinned Message</DialogTitle>
                <DialogDescription>
                  Update the message shown on this client&apos;s portal.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Textarea
                  placeholder="We're working on your homepage mockups — expect them by Friday!"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !message.trim()}
                >
                  {isSaving && <Loader2 className="size-4 animate-spin" />}
                  Update Message
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
