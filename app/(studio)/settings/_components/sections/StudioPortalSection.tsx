"use client";

import * as React from "react";
import { MessageSquare, Info, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Textarea,
  Label,
  Alert,
  AlertDescription,
} from "@repo/ui";
import { toast } from "sonner";
import {
  getStudioDefaultAnnouncement,
  upsertStudioDefaultAnnouncement,
  deleteStudioDefaultAnnouncement,
} from "@/app/_features/clients/actions";

const SUGGESTED_DEFAULT = `Welcome! This portal keeps you in the loop on your project.

Here you can view project progress, access shared files, send messages to your team, and manage billing.

We'll post updates here as things progress. Questions? Hit the Inbox — we typically respond within one business day.`;

export function StudioPortalSection() {
  const [message, setMessage] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [hasExisting, setHasExisting] = React.useState(false);

  // Load existing default message
  React.useEffect(() => {
    async function load() {
      const result = await getStudioDefaultAnnouncement();
      if (result.success && result.data?.studioDefault) {
        setMessage(result.data.studioDefault.message);
        setHasExisting(true);
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setIsSaving(true);
    const result = await upsertStudioDefaultAnnouncement(message.trim());
    setIsSaving(false);

    if (result.success) {
      setHasExisting(true);
      toast.success("Default message saved");
    } else {
      toast.error(result.error || "Failed to save");
    }
  };

  const handleDelete = async () => {
    setIsSaving(true);
    const result = await deleteStudioDefaultAnnouncement();
    setIsSaving(false);

    if (result.success) {
      setMessage("");
      setHasExisting(false);
      toast.success("Default message removed");
    } else {
      toast.error(result.error || "Failed to remove");
    }
  };

  const handleUseSuggested = () => {
    setMessage(SUGGESTED_DEFAULT);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Client Portal</h2>
        <p className="text-muted-foreground">
          Configure the Bridge client portal experience.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="size-5" />
            Default Welcome Message
          </CardTitle>
          <CardDescription>
            This message appears on every client&apos;s portal overview. You can
            override it for specific clients on their profile page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="default-message">Message</Label>
            <Textarea
              id="default-message"
              placeholder="Welcome to your client portal..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Keep it brief (60-130 words). Focus on what they can do and how to
              get help.
            </p>
          </div>

          {!message && (
            <Alert>
              <Info className="size-4" />
              <AlertDescription>
                Need inspiration?{" "}
                <button
                  type="button"
                  onClick={handleUseSuggested}
                  className="font-medium underline underline-offset-4 hover:no-underline"
                >
                  Use our suggested message
                </button>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={isSaving || !message.trim()}>
              {isSaving && <Loader2 className="size-4 animate-spin" />}
              {hasExisting ? "Update Message" : "Save Message"}
            </Button>
            {hasExisting && (
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={isSaving}
              >
                Remove
              </Button>
            )}
          </div>

          {hasExisting && (
            <p className="text-sm text-muted-foreground">
              Clients with a custom message will see that instead of this
              default.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
