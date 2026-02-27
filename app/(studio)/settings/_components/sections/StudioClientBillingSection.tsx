"use client"

import * as React from "react"
import {
  Calendar,
  Clock,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Receipt,
} from "lucide-react"
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
  Input,
  Label,
  Textarea,
} from "@repo/ui"
import { useMeetingTypes } from "@/app/_features/meetings/hooks/useMeetingTypes"
import {
  createMeetingType,
  updateMeetingType,
  deleteMeetingType,
} from "@/app/_features/meetings/actions"
import type { MeetingType } from "@/app/_features/meetings/types"
import { SettingsPage } from "../SettingsPage"
import { SettingsSection } from "../SettingsSection"
import { SettingsCard } from "../SettingsCard"

// =============================================================================
// MEETING TYPE ROW
// =============================================================================

interface MeetingTypeRowProps {
  meetingType: MeetingType
  onEdit: () => void
  onDelete: () => void
}

function MeetingTypeRow({ meetingType, onEdit, onDelete }: MeetingTypeRowProps) {
  return (
    <div className="flex items-center justify-between py-3 px-4 group">
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
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="size-3.5" />
          <span className="text-sm">{meetingType.duration_minutes} min</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-md hover:bg-muted"
          >
            <Pencil className="size-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={onDelete}
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
// MEETING TYPE DIALOG (Create/Edit)
// =============================================================================

interface MeetingTypeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  meetingType?: MeetingType | null
  onSuccess: () => void
}

function MeetingTypeDialog({
  open,
  onOpenChange,
  meetingType,
  onSuccess,
}: MeetingTypeDialogProps) {
  const [name, setName] = React.useState("")
  const [duration, setDuration] = React.useState("30")
  const [description, setDescription] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)

  const isEditing = !!meetingType

  React.useEffect(() => {
    if (open) {
      if (meetingType) {
        setName(meetingType.name)
        setDuration(String(meetingType.duration_minutes))
        setDescription(meetingType.description ?? "")
      } else {
        setName("")
        setDuration("30")
        setDescription("")
      }
    }
  }, [open, meetingType])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    const durationMinutes = parseInt(duration, 10)
    if (isNaN(durationMinutes) || durationMinutes <= 0 || durationMinutes > 480) {
      toast.error("Duration must be between 1 and 480 minutes")
      return
    }

    setIsSaving(true)

    if (isEditing && meetingType) {
      const result = await updateMeetingType({
        id: meetingType.id,
        name: name.trim(),
        duration_minutes: durationMinutes,
        description: description.trim() || undefined,
      })

      if (result.success) {
        toast.success("Meeting type updated")
        onSuccess()
        onOpenChange(false)
      } else {
        toast.error(result.error)
      }
    } else {
      const result = await createMeetingType({
        name: name.trim(),
        duration_minutes: durationMinutes,
        description: description.trim() || undefined,
      })

      if (result.success) {
        toast.success("Meeting type created")
        onSuccess()
        onOpenChange(false)
      } else {
        toast.error(result.error)
      }
    }

    setIsSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Meeting Type" : "New Meeting Type"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the meeting type details."
              : "Create a new meeting type for your studio."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Discovery Call"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="480"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this meeting type"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !name.trim()}>
              {isSaving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              {isEditing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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

export function StudioClientBillingSection() {
  const { meetingTypes, isLoading, mutate } = useMeetingTypes()
  const [editDialog, setEditDialog] = React.useState<{
    open: boolean
    meetingType: MeetingType | null
  }>({ open: false, meetingType: null })
  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean
    meetingType: MeetingType | null
  }>({ open: false, meetingType: null })

  if (isLoading) {
    return (
      <SettingsPage title="Client Settings">
        <SettingsSection
          title="Meeting Types"
          description="Configure the types of meetings you offer to clients"
        >
          <SettingsCard>
            <div className="p-4 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </SettingsCard>
        </SettingsSection>
      </SettingsPage>
    )
  }

  return (
    <SettingsPage title="Client Settings">
      {/* Meeting Types Section */}
      <SettingsSection
        title="Meeting Types"
        description="Configure the types of meetings you offer to clients"
      >
        <SettingsCard>
          <div>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="text-xs text-muted-foreground">
                {meetingTypes.length} meeting type
                {meetingTypes.length !== 1 ? "s" : ""}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setEditDialog({ open: true, meetingType: null })
                }
              >
                <Plus className="mr-1.5 size-4" />
                Add
              </Button>
            </div>
            <div className="divide-y">
              {meetingTypes.map((mt) => (
                <MeetingTypeRow
                  key={mt.id}
                  meetingType={mt}
                  onEdit={() => setEditDialog({ open: true, meetingType: mt })}
                  onDelete={() =>
                    setDeleteDialog({ open: true, meetingType: mt })
                  }
                />
              ))}
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>

      {/* Billing Section - Coming Soon */}
      <SettingsSection
        title="Billing"
        description="Configure how you bill clients"
      >
        <SettingsCard>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Receipt className="size-5 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium mb-1">Coming Soon</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Client billing settings including payment terms, currencies, and
              invoice customization.
            </p>
          </div>
        </SettingsCard>
      </SettingsSection>

      {/* Dialogs */}
      <MeetingTypeDialog
        open={editDialog.open}
        onOpenChange={(open) => setEditDialog((prev) => ({ ...prev, open }))}
        meetingType={editDialog.meetingType}
        onSuccess={() => mutate()}
      />

      <DeleteDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog((prev) => ({ ...prev, open }))
        }
        meetingType={deleteDialog.meetingType}
        onSuccess={() => mutate()}
      />
    </SettingsPage>
  )
}
