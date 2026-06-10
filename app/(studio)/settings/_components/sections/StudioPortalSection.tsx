"use client"

import * as React from "react"
import { Info, Loader2 } from "lucide-react"
import {
  Button,
  Textarea,
  Label,
  Alert,
  AlertDescription,
  Skeleton,
} from "@repo/ui"
import { toast } from "sonner"
import {
  getStudioDefaultAnnouncement,
  upsertStudioDefaultAnnouncement,
  deleteStudioDefaultAnnouncement,
} from "@/app/_features/relationships/actions"
import { SettingsPage } from "../SettingsPage"
import { SettingsSection } from "../SettingsSection"
import { SettingsCard } from "../SettingsCard"

const SUGGESTED_DEFAULT = `Welcome! This portal keeps you in the loop on your project.

Here you can view project progress, access shared files, send messages to your team, and manage billing.

We'll post updates here as things progress. Questions? Hit the Inbox — we typically respond within one business day.`

export function StudioPortalSection() {
  const [message, setMessage] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [hasExisting, setHasExisting] = React.useState(false)

  React.useEffect(() => {
    async function load() {
      const result = await getStudioDefaultAnnouncement()
      if (result.success && result.data?.studioDefault) {
        setMessage(result.data.studioDefault.message)
        setHasExisting(true)
      }
      setIsLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message")
      return
    }

    setIsSaving(true)
    const result = await upsertStudioDefaultAnnouncement(message.trim())
    setIsSaving(false)

    if (result.success) {
      setHasExisting(true)
      toast.success("Default message saved")
    } else {
      toast.error(result.error || "Failed to save")
    }
  }

  const handleDelete = async () => {
    setIsSaving(true)
    const result = await deleteStudioDefaultAnnouncement()
    setIsSaving(false)

    if (result.success) {
      setMessage("")
      setHasExisting(false)
      toast.success("Default message removed")
    } else {
      toast.error(result.error || "Failed to remove")
    }
  }

  const handleUseSuggested = () => {
    setMessage(SUGGESTED_DEFAULT)
  }

  if (isLoading) {
    return (
      <SettingsPage title="Bridge">
        <SettingsSection
          title="Default Welcome Message"
          description="This message appears on every client's portal overview."
        >
          <SettingsCard>
            <div className="p-4 space-y-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-24 w-full" />
            </div>
          </SettingsCard>
        </SettingsSection>
      </SettingsPage>
    )
  }

  return (
    <SettingsPage title="Bridge">
      <SettingsSection
        title="Default Welcome Message"
        description="This message appears on every client's portal overview. You can override it for specific clients on their profile page."
      >
        <SettingsCard>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="default-message">Message</Label>
              <Textarea
                id="default-message"
                placeholder="Welcome to your Spaces workspace..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Keep it brief (60-130 words). Focus on what they can do and how to get help.
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
                Clients with a custom message will see that instead of this default.
              </p>
            )}
          </div>
        </SettingsCard>
      </SettingsSection>
    </SettingsPage>
  )
}
