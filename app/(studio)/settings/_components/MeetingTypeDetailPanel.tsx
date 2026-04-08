"use client"

import * as React from "react"
import {
  X,
  Clock,
  MapPin,
  Phone,
  Link2,
  MessageSquare,
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react"
import {
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Badge,
} from "@repo/ui"
import { cn } from "@repo/utils"
import { toast } from "sonner"
import {
  createMeetingType,
  updateMeetingType,
  getAvailableConferencingApps,
} from "@/app/_features/meetings/actions"
import type {
  MeetingType,
  MeetingLocation,
  BookingQuestion,
  BookingQuestionType,
} from "@/app/_features/meetings/types"

// =============================================================================
// Constants
// =============================================================================

const LOCATION_OPTIONS: { value: MeetingLocation; label: string; calcomSlug?: string }[] = [
  { value: "cal_video", label: "Cal Video", calcomSlug: "cal-video" },
  { value: "google_meet", label: "Google Meet", calcomSlug: "google-meet" },
  { value: "zoom", label: "Zoom", calcomSlug: "zoom" },
  { value: "phone", label: "Phone Call" },
  { value: "in_person", label: "In Person" },
  { value: "link", label: "Link Meeting" },
]

const DURATION_OPTIONS = [
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
  { value: "120", label: "2 hours" },
]

const BUFFER_OPTIONS = [
  { value: "0", label: "No buffer" },
  { value: "5", label: "5 min" },
  { value: "10", label: "10 min" },
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
]

const NOTICE_OPTIONS = [
  { value: "1", label: "1 hour" },
  { value: "2", label: "2 hours" },
  { value: "4", label: "4 hours" },
  { value: "24", label: "1 day" },
  { value: "48", label: "2 days" },
  { value: "168", label: "1 week" },
]

const QUESTION_TYPE_OPTIONS: { value: BookingQuestionType; label: string }[] = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "url", label: "URL / Website" },
  { value: "select", label: "Dropdown (single)" },
  { value: "multiselect", label: "Dropdown (multiple)" },
]

function generateQuestionId() {
  return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// =============================================================================
// Types
// =============================================================================

interface MeetingTypeDetailPanelProps {
  meetingType?: MeetingType | null
  onClose: () => void
  onSuccess: () => void
  className?: string
}

// =============================================================================
// Component
// =============================================================================

export function MeetingTypeDetailPanel({
  meetingType,
  onClose,
  onSuccess,
  className,
}: MeetingTypeDetailPanelProps) {
  const isEditing = !!meetingType

  // Form state
  const [name, setName] = React.useState("")
  const [duration, setDuration] = React.useState("30")
  const [description, setDescription] = React.useState("")
  const [location, setLocation] = React.useState<MeetingLocation>("cal_video")
  const [locationPhone, setLocationPhone] = React.useState("")
  const [locationAddress, setLocationAddress] = React.useState("")
  const [locationLink, setLocationLink] = React.useState("")
  const [bufferMinutes, setBufferMinutes] = React.useState("10")
  const [minNoticeHours, setMinNoticeHours] = React.useState("24")
  const [requiresConfirmation, setRequiresConfirmation] = React.useState(false)
  const [bookingQuestions, setBookingQuestions] = React.useState<BookingQuestion[]>([])
  const [editingQuestionId, setEditingQuestionId] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)

  // Connected conferencing apps from Cal.com
  const [connectedApps, setConnectedApps] = React.useState<string[]>([])

  // Fetch connected conferencing apps on mount
  React.useEffect(() => {
    getAvailableConferencingApps().then(({ apps }) => {
      const appIds = apps.map(app => (app as Record<string, unknown>).appId as string || app.slug || "").filter(Boolean)
      setConnectedApps(appIds)
    }).catch(() => setConnectedApps([]))
  }, [])

  // Reset form when meetingType changes
  React.useEffect(() => {
    if (meetingType) {
      setName(meetingType.name)
      setDuration(String(meetingType.duration_minutes))
      setDescription(meetingType.description ?? "")
      setLocation(meetingType.location ?? "cal_video")
      setLocationPhone(meetingType.location_phone ?? "")
      setLocationAddress(meetingType.location_address ?? "")
      setLocationLink(meetingType.location_link ?? "")
      setBufferMinutes(String(meetingType.buffer_minutes ?? 10))
      setMinNoticeHours(String(meetingType.min_notice_hours ?? 24))
      setRequiresConfirmation(meetingType.requires_confirmation ?? false)
      setBookingQuestions(meetingType.booking_questions ?? [])
    } else {
      // Reset to defaults for new meeting type
      setName("")
      setDuration("30")
      setDescription("")
      setLocation("cal_video")
      setLocationPhone("")
      setLocationAddress("")
      setLocationLink("")
      setBufferMinutes("10")
      setMinNoticeHours("24")
      setRequiresConfirmation(false)
      setBookingQuestions([])
    }
  }, [meetingType])

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Name is required")
      return
    }

    const durationMinutes = parseInt(duration, 10)
    if (isNaN(durationMinutes) || durationMinutes <= 0 || durationMinutes > 480) {
      toast.error("Duration must be between 1 and 480 minutes")
      return
    }

    setIsSaving(true)

    const payload = {
      name: name.trim(),
      duration_minutes: durationMinutes,
      description: description.trim() || undefined,
      location,
      location_phone: location === "phone" ? locationPhone.trim() || null : null,
      location_address: location === "in_person" ? locationAddress.trim() || null : null,
      location_link: location === "link" ? locationLink.trim() || null : null,
      buffer_minutes: parseInt(bufferMinutes, 10),
      min_notice_hours: parseInt(minNoticeHours, 10),
      requires_confirmation: requiresConfirmation,
      booking_questions: bookingQuestions,
    }

    try {
      if (isEditing && meetingType) {
        const result = await updateMeetingType({ id: meetingType.id, ...payload })
        if (result.success) {
          toast.success("Meeting type updated")
          onSuccess()
        } else {
          toast.error(result.error)
        }
      } else {
        const result = await createMeetingType(payload)
        if (result.success) {
          toast.success("Meeting type created")
          onSuccess()
          onClose()
        } else {
          toast.error(result.error)
        }
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={cn("relative h-full bg-background", className)}>
      {/* Header - pinned to top */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 border-b bg-background">
        <h3 className="text-sm font-medium">
          {isEditing ? "Edit Meeting Type" : "New Meeting Type"}
        </h3>
        <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      {/* Content - Scrollable with padding for header and footer */}
      <div className="absolute inset-0 top-12 bottom-16 overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Basic Info</h4>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Discovery Call"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger id="duration">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description shown on booking page"
                rows={2}
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Location</h4>

            <div className="space-y-2">
              <Select value={location} onValueChange={(v) => setLocation(v as MeetingLocation)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_OPTIONS.map((opt) => {
                    const isIntegration = !!opt.calcomSlug && opt.calcomSlug !== "cal-video"
                    const isConnected = !isIntegration || connectedApps.includes(opt.calcomSlug!)
                    return (
                      <SelectItem key={opt.value} value={opt.value} disabled={!isConnected}>
                        <span className={!isConnected ? "text-muted-foreground" : undefined}>
                          {opt.label}{!isConnected && " (not connected)"}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {location === "phone" && (
              <div className="space-y-2">
                <Label htmlFor="location-phone">Phone Number</Label>
                <Input
                  id="location-phone"
                  type="tel"
                  value={locationPhone}
                  onChange={(e) => setLocationPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            )}

            {location === "in_person" && (
              <div className="space-y-2">
                <Label htmlFor="location-address">Address</Label>
                <Input
                  id="location-address"
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  placeholder="123 Main St, City, State"
                />
              </div>
            )}

            {location === "link" && (
              <div className="space-y-2">
                <Label htmlFor="location-link">Meeting Link</Label>
                <Input
                  id="location-link"
                  type="url"
                  value={locationLink}
                  onChange={(e) => setLocationLink(e.target.value)}
                  placeholder="https://meet.example.com/your-room"
                />
              </div>
            )}
          </div>

          {/* Scheduling */}
          <div className="space-y-4">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Scheduling</h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="buffer">Buffer time</Label>
                <Select value={bufferMinutes} onValueChange={setBufferMinutes}>
                  <SelectTrigger id="buffer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUFFER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notice">Min notice</Label>
                <Select value={minNoticeHours} onValueChange={setMinNoticeHours}>
                  <SelectTrigger id="notice">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTICE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="confirmation" className="text-sm font-normal">
                  Require confirmation
                </Label>
                <p className="text-xs text-muted-foreground">
                  Manually approve each booking
                </p>
              </div>
              <Switch
                id="confirmation"
                checked={requiresConfirmation}
                onCheckedChange={setRequiresConfirmation}
              />
            </div>
          </div>

          {/* Booking Questions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Booking Questions</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  const newId = generateQuestionId()
                  const newQuestion: BookingQuestion = {
                    id: newId,
                    label: "",
                    type: "text",
                    required: false,
                  }
                  setBookingQuestions([...bookingQuestions, newQuestion])
                  setEditingQuestionId(newId)
                }}
              >
                <Plus className="mr-1 size-3" />
                Add
              </Button>
            </div>

            {bookingQuestions.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center">
                <MessageSquare className="mx-auto size-5 text-muted-foreground/50 mb-2" />
                <p className="text-xs text-muted-foreground">
                  No custom questions. Clients will only provide name & email.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {bookingQuestions.map((question, index) => {
                  const isExpanded = editingQuestionId === question.id
                  const typeLabel = QUESTION_TYPE_OPTIONS.find(t => t.value === question.type)?.label || question.type

                  return (
                    <div key={question.id} className="rounded-lg border overflow-hidden">
                      {/* Collapsed view - click to expand */}
                      {!isExpanded ? (
                        <div
                          className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setEditingQuestionId(question.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">
                              {question.label || <span className="text-muted-foreground italic">Untitled question</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">{typeLabel}</p>
                          </div>
                          {question.required && (
                            <Badge variant="secondary" className="text-[10px] shrink-0">Required</Badge>
                          )}
                        </div>
                      ) : (
                        /* Expanded edit view */
                        <div className="p-3 space-y-3 bg-muted/30">
                          {/* Question input */}
                          <div className="flex items-start gap-2">
                            <Input
                              value={question.label}
                              onChange={(e) => {
                                const updated = [...bookingQuestions]
                                updated[index] = { ...question, label: e.target.value }
                                setBookingQuestions(updated)
                              }}
                              placeholder="Enter your question..."
                              className="flex-1 text-sm"
                              autoFocus
                            />
                            <button
                              type="button"
                              className="p-2 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                              onClick={() => {
                                setBookingQuestions(bookingQuestions.filter((_, i) => i !== index))
                                setEditingQuestionId(null)
                              }}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>

                          {/* Controls row */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Select
                              value={question.type}
                              onValueChange={(v) => {
                                const updated = [...bookingQuestions]
                                updated[index] = { ...question, type: v as BookingQuestionType }
                                setBookingQuestions(updated)
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {QUESTION_TYPE_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <div className="flex items-center gap-1.5">
                              <Switch
                                id={`required-${question.id}`}
                                checked={question.required}
                                onCheckedChange={(checked) => {
                                  const updated = [...bookingQuestions]
                                  updated[index] = { ...question, required: checked }
                                  setBookingQuestions(updated)
                                }}
                              />
                              <Label htmlFor={`required-${question.id}`} className="text-xs">
                                Required
                              </Label>
                            </div>

                            <div className="flex items-center gap-1 ml-auto">
                              <button
                                type="button"
                                className="p-1 rounded hover:bg-muted disabled:opacity-30"
                                disabled={index === 0}
                                onClick={() => {
                                  const updated = [...bookingQuestions]
                                  ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
                                  setBookingQuestions(updated)
                                }}
                              >
                                <ChevronUp className="size-4 text-muted-foreground" />
                              </button>
                              <button
                                type="button"
                                className="p-1 rounded hover:bg-muted disabled:opacity-30"
                                disabled={index === bookingQuestions.length - 1}
                                onClick={() => {
                                  const updated = [...bookingQuestions]
                                  ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
                                  setBookingQuestions(updated)
                                }}
                              >
                                <ChevronDown className="size-4 text-muted-foreground" />
                              </button>
                            </div>
                          </div>

                          {/* Options for dropdown types */}
                          {(question.type === "select" || question.type === "multiselect") && (
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Options (one per line)</Label>
                              <Textarea
                                value={question.options?.join("\n") ?? ""}
                                onChange={(e) => {
                                  const updated = [...bookingQuestions]
                                  const options = e.target.value.split("\n").filter(o => o.trim())
                                  updated[index] = { ...question, options }
                                  setBookingQuestions(updated)
                                }}
                                placeholder={"Option 1\nOption 2\nOption 3"}
                                rows={4}
                                className="text-sm resize-none"
                              />
                            </div>
                          )}

                          {/* Done button */}
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="w-full"
                            onClick={() => setEditingQuestionId(null)}
                          >
                            Done
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Footer - pinned to bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-10 border-t p-4 bg-background">
        <Button
          onClick={handleSave}
          disabled={isSaving || !name.trim()}
          className="w-full"
        >
          {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
          {isEditing ? "Save Changes" : "Create Meeting Type"}
        </Button>
      </div>
    </div>
  )
}
