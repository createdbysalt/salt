"use client"

import * as React from "react"
import {
  Calendar,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  Lock,
  Mic,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import {
  Button,
  Badge,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  Switch,
  Label,
} from "@repo/ui"
import { useMeetingTypes } from "@/app/_features/meetings/hooks/useMeetingTypes"
import {
  deleteMeetingType,
  syncAllMeetingTypesToCalcom,
} from "@/app/_features/meetings/actions"
import {
  getCalendarRecordingStatus,
  toggleCalendarRecording,
} from "@/app/_features/meetings/calendar-recording-actions"
import type { MeetingType, MeetingCurrency } from "@/app/_features/meetings/types"
import { useClientTags } from "@/app/_features/client-tags/hooks/useClientTags"
import {
  createClientTag,
  updateClientTag,
  deleteClientTag,
} from "@/app/_features/client-tags/actions"
import { cn } from "@repo/utils"
import { SettingsSection } from "../SettingsSection"
import { SettingsCard } from "../SettingsCard"
import { TagManager } from "../TagManager"
import { MeetingTypeDetailPanel } from "../MeetingTypeDetailPanel"

// =============================================================================
// CONSTANTS
// =============================================================================

const CURRENCY_OPTIONS: { value: MeetingCurrency; label: string; symbol: string }[] = [
  { value: "usd", label: "USD", symbol: "$" },
  { value: "eur", label: "EUR", symbol: "€" },
  { value: "gbp", label: "GBP", symbol: "£" },
  { value: "cad", label: "CAD", symbol: "CA$" },
  { value: "aud", label: "AUD", symbol: "A$" },
]

function formatPrice(cents: number | null, currency: MeetingCurrency = "usd"): string {
  if (cents === null || cents === 0) return "Free"
  const currencyInfo = CURRENCY_OPTIONS.find(c => c.value === currency)
  const symbol = currencyInfo?.symbol ?? "$"
  return `${symbol}${(cents / 100).toFixed(0)}`
}

// =============================================================================
// MEETING TYPE ROW
// =============================================================================

interface MeetingTypeRowProps {
  meetingType: MeetingType
  calcomUsername?: string
  isSelected?: boolean
  onSelect: () => void
  onDelete: () => void
}

function MeetingTypeRow({ meetingType, calcomUsername, isSelected, onSelect, onDelete }: MeetingTypeRowProps) {
  const [copied, setCopied] = React.useState(false)

  const bookingUrl = calcomUsername
    ? `https://cal.com/${calcomUsername}/${meetingType.slug}`
    : null

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!bookingUrl) return
    await navigator.clipboard.writeText(bookingUrl)
    setCopied(true)
    toast.success("Booking link copied")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between py-3 px-4 group cursor-pointer transition-colors",
        isSelected ? "bg-muted/50" : "hover:bg-muted/30"
      )}
      onClick={onSelect}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex size-8 items-center justify-center rounded-md bg-muted shrink-0">
          <Calendar className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{meetingType.name}</span>
            {!meetingType.is_active && (
              <Badge variant="secondary" className="text-xs">Inactive</Badge>
            )}
          </div>
          {meetingType.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {meetingType.description}
            </p>
          )}
          {bookingUrl && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                cal.com/{calcomUsername}/{meetingType.slug}
              </span>
              <button
                onClick={handleCopyLink}
                className="p-0.5 rounded hover:bg-muted"
                title="Copy booking link"
              >
                {copied ? (
                  <Check className="size-3 text-green-500" />
                ) : (
                  <Copy className="size-3 text-muted-foreground" />
                )}
              </button>
              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-0.5 rounded hover:bg-muted"
                title="Open booking page"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="size-3 text-muted-foreground" />
              </a>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {/* Duration */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="size-3.5" />
          <span className="text-sm">{meetingType.duration_minutes} min</span>
        </div>
        {/* Sync status */}
        {meetingType.cal_synced_at && (
          <div
            className="flex items-center gap-1 text-muted-foreground"
            title={`Synced ${new Date(meetingType.cal_synced_at).toLocaleString()}`}
          >
            <Check className="size-3.5 text-green-500" />
            <span className="text-xs">Synced</span>
          </div>
        )}
        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSelect()
            }}
            className="p-1.5 rounded-md hover:bg-muted"
          >
            <Pencil className="size-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="p-1.5 rounded-md hover:bg-muted"
          >
            <Trash2 className="size-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// DELETE CONFIRMATION DIALOG
// =============================================================================

interface DeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  meetingType: MeetingType | null
  onSuccess: () => void
}

function DeleteDialog({
  open,
  onOpenChange,
  meetingType,
  onSuccess,
}: DeleteDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)

  async function handleDelete() {
    if (!meetingType) return

    setIsDeleting(true)
    const result = await deleteMeetingType(meetingType.id)

    if (result.success) {
      toast.success(`Deleted "${meetingType.name}"`)
      onSuccess()
      onOpenChange(false)
    } else {
      toast.error(result.error)
    }

    setIsDeleting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Meeting Type</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &ldquo;{meetingType?.name}&rdquo;?
            This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface StudioClientBillingSectionProps {
  calcomConnected: boolean
  calcomUsername?: string
  googleConnected?: boolean
}

export function StudioClientBillingSection({ calcomConnected, calcomUsername, googleConnected }: StudioClientBillingSectionProps) {
  const { meetingTypes, isLoading: meetingsLoading, mutate: mutateMeetings } = useMeetingTypes()
  const { tags: clientTags, isLoading: tagsLoading, mutate: mutateTags } = useClientTags()

  // Selected meeting type for inline panel (null = closed, undefined = new meeting type)
  const [selectedMeetingType, setSelectedMeetingType] = React.useState<MeetingType | null | undefined>(null)

  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean
    meetingType: MeetingType | null
  }>({ open: false, meetingType: null })
  const [isSyncing, setIsSyncing] = React.useState(false)

  // Recording state
  const [recordingStatus, setRecordingStatus] = React.useState<{
    available: boolean
    enabled: boolean
    googleConnected: boolean
    recallConfigured: boolean
    calendarEmail?: string
  } | null>(null)
  const [isTogglingRecording, setIsTogglingRecording] = React.useState(false)

  // Load recording status
  React.useEffect(() => {
    getCalendarRecordingStatus().then(setRecordingStatus)
  }, [])

  // Handle recording toggle
  const handleToggleRecording = async (enabled: boolean) => {
    setIsTogglingRecording(true)
    const result = await toggleCalendarRecording(enabled)
    if (result.success) {
      toast.success(enabled ? "Auto-recording enabled" : "Auto-recording disabled")
      // Refresh status
      const newStatus = await getCalendarRecordingStatus()
      setRecordingStatus(newStatus)
    } else {
      toast.error(result.error)
    }
    setIsTogglingRecording(false)
  }

  const isPanelOpen = selectedMeetingType !== null

  // Sync all meeting types to Cal.com
  const handleSyncToCalcom = async () => {
    if (!calcomConnected) return
    setIsSyncing(true)
    try {
      const result = await syncAllMeetingTypesToCalcom()
      if (result.synced > 0) {
        toast.success(`Synced ${result.synced} meeting type${result.synced !== 1 ? "s" : ""} to Cal.com`)
        mutateMeetings()
      } else if (result.errors.length > 0) {
        toast.error(result.errors[0])
      }
      if (result.failed > 0) {
        toast.error(`Failed to sync ${result.failed} meeting type${result.failed !== 1 ? "s" : ""}`)
      }
    } catch {
      toast.error("Failed to sync to Cal.com")
    } finally {
      setIsSyncing(false)
    }
  }

  // Tag handlers
  const handleAddTag = async (name: string) => {
    const result = await createClientTag(name)
    if (result.success) {
      toast.success("Tag created")
      mutateTags()
    } else {
      toast.error(result.error || "Failed to create tag")
    }
    return result
  }

  const handleUpdateTag = async (id: string, name: string) => {
    const result = await updateClientTag(id, name)
    if (result.success) {
      toast.success("Tag updated")
      mutateTags()
    } else {
      toast.error(result.error || "Failed to update tag")
    }
    return result
  }

  const handleDeleteTag = async (id: string) => {
    const result = await deleteClientTag(id)
    if (result.success) {
      toast.success("Tag deleted")
      mutateTags()
    } else {
      toast.error(result.error || "Failed to delete tag")
    }
    return result
  }

  // Close panel and clear selection when meeting type is deleted
  const handleDeleteSuccess = () => {
    setSelectedMeetingType(null)
    mutateMeetings()
  }

  if (meetingsLoading || tagsLoading) {
    return (
      <div className="flex flex-1 flex-col p-6 md:p-10">
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="text-2xl font-medium mb-8">Clients</h1>
          <div className="space-y-8">
            <SettingsSection
              title="Tags"
              description="Categorize your clients by industry or type"
            >
              <Skeleton className="h-12 w-full" />
            </SettingsSection>
            <SettingsSection
              title="Meeting Types"
              description="Configure the types of meetings you offer to clients"
            >
              <SettingsCard>
                <div className="p-4 space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </SettingsCard>
            </SettingsSection>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex flex-1 h-full w-full overflow-hidden">
      {/* Main content */}
      <div className="flex-1 flex flex-col p-6 md:p-10 overflow-auto">
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="text-2xl font-medium mb-8">Clients</h1>
          <div className="space-y-8">
            {/* Tags Section */}
            <SettingsSection
              title="Tags"
              description="Categorize your clients by industry or type. These tags are also available when tagging portfolio items."
            >
              <TagManager
                tags={clientTags.map(t => ({ id: t.id, name: t.name }))}
                onAdd={handleAddTag}
                onUpdate={handleUpdateTag}
                onDelete={handleDeleteTag}
                placeholder="Type and press Enter to add..."
              />
            </SettingsSection>

            {/* Meeting Types Section */}
            <SettingsSection
              title="Meeting Types"
              description="Configure the types of meetings you offer to clients"
            >
              {calcomConnected ? (
                <SettingsCard>
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <span className="text-xs text-muted-foreground">
                      {meetingTypes.length} meeting type
                      {meetingTypes.length !== 1 ? "s" : ""}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSyncToCalcom}
                        disabled={isSyncing || meetingTypes.length === 0}
                      >
                        <RefreshCw className={cn("mr-1.5 size-4", isSyncing && "animate-spin")} />
                        {isSyncing ? "Syncing..." : "Sync"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedMeetingType(undefined)}
                      >
                        <Plus className="mr-1.5 size-4" />
                        Add
                      </Button>
                    </div>
                  </div>
                  <div className="divide-y">
                    {meetingTypes.map((mt) => (
                      <MeetingTypeRow
                        key={mt.id}
                        meetingType={mt}
                        calcomUsername={calcomUsername}
                        isSelected={selectedMeetingType?.id === mt.id}
                        onSelect={() => setSelectedMeetingType(mt)}
                        onDelete={() => setDeleteDialog({ open: true, meetingType: mt })}
                      />
                    ))}
                  </div>
                </SettingsCard>
              ) : (
                <SettingsCard>
                  <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                    <div className="rounded-full bg-muted p-3 mb-3">
                      <Lock className="size-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium mb-1">Connect Cal.com to manage meeting types</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Meeting types sync with your Cal.com booking page for client scheduling.
                    </p>
                    <Button asChild size="sm">
                      <Link href="/settings/integrations">Connect Cal.com</Link>
                    </Button>
                  </div>
                </SettingsCard>
              )}
            </SettingsSection>

            {/* Auto-Recording Section */}
            <SettingsSection
              title="Meeting Recording"
              description="Automatically record and transcribe client meetings"
            >
              <SettingsCard>
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Mic className="size-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-sm">Auto-record client meetings</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            When enabled, meetings with clients are automatically recorded and transcribed.
                            Notes are saved to the client&apos;s file.
                          </p>
                        </div>
                        {recordingStatus === null ? (
                          <Skeleton className="h-5 w-10" />
                        ) : recordingStatus.available ? (
                          <Switch
                            checked={recordingStatus.enabled}
                            onCheckedChange={handleToggleRecording}
                            disabled={isTogglingRecording}
                          />
                        ) : recordingStatus.googleConnected === false ? (
                          <Button asChild size="sm" variant="outline">
                            <Link href="/settings/integrations">Connect Google</Link>
                          </Button>
                        ) : (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Lock className="size-3.5" />
                            <span className="text-xs">Not available</span>
                          </div>
                        )}
                      </div>
                      {recordingStatus?.enabled && recordingStatus?.calendarEmail && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                          <Check className="size-3.5 text-green-500" />
                          <span>Monitoring calendar: {recordingStatus.calendarEmail}</span>
                        </div>
                      )}
                      {isTogglingRecording && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="size-3.5 animate-spin" />
                          <span>{recordingStatus?.enabled ? "Disabling..." : "Enabling..."}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </SettingsCard>
            </SettingsSection>
          </div>
        </div>
      </div>

      {/* Blur overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-background/60 backdrop-blur-sm transition-opacity duration-300",
          isPanelOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setSelectedMeetingType(null)}
      />

      {/* Right panel - slides in from right (fixed to viewport) */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 w-[380px] border-l bg-background shadow-xl z-50",
          "transition-transform duration-300 ease-out",
          isPanelOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {isPanelOpen && (
          <MeetingTypeDetailPanel
            meetingType={selectedMeetingType}
            onClose={() => setSelectedMeetingType(null)}
            onSuccess={() => {
              mutateMeetings()
            }}
            className="h-full"
          />
        )}
      </div>

      {/* Delete Dialog */}
      <DeleteDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog((prev) => ({ ...prev, open }))
        }
        meetingType={deleteDialog.meetingType}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  )
}
