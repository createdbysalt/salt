"use client"

import * as React from "react"
import {
  X,
  Clock,
  MapPin,
  Phone,
  Link2,
  DollarSign,
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
} from "@/app/_features/meetings/actions"
import type {
  MeetingType,
  MeetingLocation,
  MeetingCurrency,
  BookingQuestion,
  BookingQuestionType,
} from "@/app/_features/meetings/types"

// =============================================================================
// Constants
// =============================================================================

const LOCATION_OPTIONS: { value: MeetingLocation; label: string }[] = [
  { value: "cal_video", label: "Cal Video" },
  { value: "google_meet", label: "Google Meet" },
  { value: "zoom", label: "Zoom" },
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

const CURRENCY_OPTIONS: { value: MeetingCurrency; label: string; symbol: string }[] = [
  { value: "usd", label: "USD", symbol: "$" },
  { value: "eur", label: "EUR", symbol: "€" },
  { value: "gbp", label: "GBP", symbol: "£" },
  { value: "cad", label: "CAD", symbol: "CA$" },
  { value: "aud", label: "AUD", symbol: "A$" },
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
  const [priceEnabled, setPriceEnabled] = React.useState(false)
  const [priceAmount, setPriceAmount] = React.useState("")
  const [currency, setCurrency] = React.useState<MeetingCurrency>("usd")
  const [isSaving, setIsSaving] = React.useState(false)

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
      const priceCents = meetingType.price_cents
      const hasPrice = priceCents !== null && priceCents > 0
      setPriceEnabled(hasPrice)
      setPriceAmount(hasPrice ? String(priceCents / 100) : "")
      setCurrency(meetingType.currency ?? "usd")
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
      setPriceEnabled(false)
      setPriceAmount("")
      setCurrency("usd")
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

    const priceCents = priceEnabled && priceAmount
      ? Math.round(parseFloat(priceAmount) * 100)
      : null

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
      price_cents: priceCents,
      currency,
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
    <div className={cn("flex flex-col h-full bg-background border-l", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-sm font-medium">
          {isEditing ? "Edit Meeting Type" : "New Meeting Type"}
        </h3>
        <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
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
                  {LOCATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
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

          {/* Pricing */}
          <div className="space-y-4">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pricing</h4>

            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="paid-meeting" className="text-sm font-normal">
                  Paid meeting
                </Label>
                <p className="text-xs text-muted-foreground">
                  Collect payment at booking
                </p>
              </div>
              <Switch
                id="paid-meeting"
                checked={priceEnabled}
                onCheckedChange={setPriceEnabled}
              />
            </div>

            {priceEnabled && (
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="1"
                      value={priceAmount}
                      onChange={(e) => setPriceAmount(e.target.value)}
                      placeholder="0"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="w-24 space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={currency} onValueChange={(v) => setCurrency(v as MeetingCurrency)}>
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t p-4">
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
