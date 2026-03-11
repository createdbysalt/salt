"use client"

import * as React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Loader2, Check, X, Trash2, Archive, ArchiveRestore, RotateCcw, Pencil, Star, Clock, Timer, Zap, Plus } from "lucide-react"
import { cn } from "@repo/utils"
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
  Badge,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/ui"
import { toast } from "sonner"
import type { StudioService, PricingType, Currency } from "../types"
import {
  createService,
  updateService,
  archiveService,
  unarchiveService,
  trashService,
  restoreService,
  permanentlyDeleteService,
} from "../actions"
import { formatPrice } from "../hooks/useStudioServices"
import type { ViewFilter } from "./ServicesDataTable"

// =============================================================================
// Inline Editable Field Component
// =============================================================================

interface InlineEditFieldProps {
  value: string
  onSave: (value: string) => Promise<void>
  placeholder?: string
  className?: string
  inputClassName?: string
  multiline?: boolean
}

function InlineEditField({
  value,
  onSave,
  placeholder = "Click to edit",
  className,
  inputClassName,
  multiline = false,
}: InlineEditFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [localValue, setLocalValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = async () => {
    if (localValue === value) {
      setIsEditing(false)
      return
    }
    setIsSaving(true)
    try {
      await onSave(localValue)
      setIsEditing(false)
    } catch {
      setLocalValue(value)
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === "Escape") {
      setLocalValue(value)
      setIsEditing(false)
    }
  }

  if (isEditing) {
    const InputComponent = multiline ? "textarea" : "input"
    return (
      <div className={cn("relative", multiline ? "w-full" : "inline-block", className)}>
        <InputComponent
          ref={inputRef as React.RefObject<HTMLInputElement & HTMLTextAreaElement>}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isSaving}
          className={cn(
            "bg-muted/50 rounded px-2 py-1.5 text-sm border-none focus:outline-none focus:ring-1 focus:ring-ring",
            multiline ? "resize-none min-h-[80px] w-full text-left" : "text-right",
            inputClassName
          )}
          rows={multiline ? 3 : undefined}
        />
        {isSaving && (
          <Loader2 className="absolute right-2 top-2 size-3 animate-spin text-muted-foreground" />
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className={cn(
        "text-sm hover:bg-muted/50 rounded transition-colors px-1.5 py-0.5 group",
        multiline ? "w-full text-left" : "text-right",
        !value && "text-muted-foreground italic",
        className
      )}
    >
      {value || placeholder}
      <Pencil className="inline-block ml-1.5 size-3 opacity-0 group-hover:opacity-50 transition-opacity" />
    </button>
  )
}

// =============================================================================
// Constants
// =============================================================================

const PRICING_TYPES: { value: PricingType; label: string; description: string }[] = [
  { value: "fixed", label: "Fixed", description: "One-time project fee" },
  { value: "hourly", label: "Hourly", description: "Per hour rate" },
  { value: "retainer", label: "Retainer", description: "Monthly recurring" },
  { value: "custom", label: "Custom", description: "Quote-based pricing" },
]

const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
  { value: "USD", label: "USD", symbol: "$" },
  { value: "EUR", label: "EUR", symbol: "€" },
  { value: "GBP", label: "GBP", symbol: "£" },
  { value: "CAD", label: "CAD", symbol: "C$" },
  { value: "AUD", label: "AUD", symbol: "A$" },
]

const CATEGORIES = [
  "Web Design",
  "Development",
  "Branding",
  "Consulting",
  "Retainer",
  "Marketing",
  "Strategy",
  "Other",
]

// =============================================================================
// Types
// =============================================================================

interface ServiceDetailPanelProps {
  service: StudioService | null
  isNew?: boolean
  viewFilter?: ViewFilter
  onClose: () => void
  onSuccess?: () => void
  className?: string
}

// =============================================================================
// Main Component
// =============================================================================

export function ServiceDetailPanel({
  service,
  isNew = false,
  viewFilter = "active",
  onClose,
  onSuccess,
  className,
}: ServiceDetailPanelProps) {
  // Edit state
  const [isEditing, setIsEditing] = useState(isNew)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [pricingType, setPricingType] = useState<PricingType>("fixed")
  const [priceMin, setPriceMin] = useState("")
  const [priceMax, setPriceMax] = useState("")
  const [currency, setCurrency] = useState<Currency>("USD")
  const [typicalTimeline, setTypicalTimeline] = useState("")
  // Retainer-specific form state
  const [hoursIncluded, setHoursIncluded] = useState("")
  const [responseTime, setResponseTime] = useState("")
  const [rolloverHours, setRolloverHours] = useState("")
  const [billingInterval, setBillingInterval] = useState<"monthly" | "quarterly" | "annually">("monthly")
  const [isRecommended, setIsRecommended] = useState(false)
  const [servicesIncluded, setServicesIncluded] = useState<string[]>([])

  // Action states
  const [isArchiving, setIsArchiving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Sync form state with service prop
  useEffect(() => {
    if (service) {
      setName(service.name)
      setDescription(service.description || "")
      setCategory(service.category || "")
      setPricingType(service.pricing_type || "fixed")
      setPriceMin(service.price_min?.toString() || "")
      setPriceMax(service.price_max?.toString() || "")
      setCurrency(service.currency)
      setTypicalTimeline(service.typical_timeline || "")
      // Retainer-specific fields
      setHoursIncluded(service.hours_included?.toString() || "")
      setResponseTime(service.response_time || "")
      setRolloverHours(service.rollover_hours?.toString() || "")
      setBillingInterval(service.billing_interval || "monthly")
      setIsRecommended(service.is_recommended || false)
      setServicesIncluded(service.services_included || [])
      setIsEditing(false)
    } else if (isNew) {
      // Reset to defaults for new service
      setName("")
      setDescription("")
      setCategory("")
      setPricingType("fixed")
      setPriceMin("")
      setPriceMax("")
      setCurrency("USD")
      setTypicalTimeline("")
      // Retainer defaults
      setHoursIncluded("")
      setResponseTime("")
      setRolloverHours("")
      setBillingInterval("monthly")
      setIsRecommended(false)
      setServicesIncluded([])
      setIsEditing(true)
    }
  }, [service, isNew])

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Service name is required")
      return
    }

    setIsSaving(true)

    try {
      if (service) {
        // Update existing service
        const result = await updateService({
          id: service.id,
          name: name.trim(),
          description: description.trim() || undefined,
          category: category.trim() || undefined,
          pricing_type: pricingType,
          price_min: priceMin ? parseFloat(priceMin) : undefined,
          price_max: priceMax ? parseFloat(priceMax) : undefined,
          currency,
          typical_timeline: typicalTimeline.trim() || undefined,
          // Retainer fields (only include if retainer type)
          ...(pricingType === "retainer" && {
            hours_included: hoursIncluded ? parseFloat(hoursIncluded) : null,
            response_time: responseTime.trim() || null,
            rollover_hours: rolloverHours ? parseFloat(rolloverHours) : null,
            billing_interval: billingInterval,
            is_recommended: isRecommended,
            services_included: servicesIncluded,
          }),
        })

        if (result.success) {
          toast.success("Service updated")
          setIsEditing(false)
          onSuccess?.()
        } else {
          toast.error(result.error || "Failed to update service")
        }
      } else {
        // Create new service
        const result = await createService({
          name: name.trim(),
          description: description.trim() || undefined,
          category: category.trim() || undefined,
          pricing_type: pricingType,
          price_min: priceMin ? parseFloat(priceMin) : undefined,
          price_max: priceMax ? parseFloat(priceMax) : undefined,
          currency,
          typical_timeline: typicalTimeline.trim() || undefined,
          // Retainer fields (only include if retainer type)
          ...(pricingType === "retainer" && {
            hours_included: hoursIncluded ? parseFloat(hoursIncluded) : undefined,
            response_time: responseTime.trim() || undefined,
            rollover_hours: rolloverHours ? parseFloat(rolloverHours) : undefined,
            billing_interval: billingInterval,
            is_recommended: isRecommended,
            services_included: servicesIncluded,
          }),
        })

        if (result.success) {
          toast.success("Service created")
          onClose()
          onSuccess?.()
        } else {
          toast.error(result.error || "Failed to create service")
        }
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleArchive = async () => {
    if (!service) return
    setIsArchiving(true)
    const result = await archiveService(service.id)
    setIsArchiving(false)
    if (result.success) {
      toast.success("Service archived")
      onClose()
      onSuccess?.()
    } else {
      toast.error(result.error || "Failed to archive service")
    }
  }

  const handleUnarchive = async () => {
    if (!service) return
    setIsArchiving(true)
    const result = await unarchiveService(service.id)
    setIsArchiving(false)
    if (result.success) {
      toast.success("Service unarchived")
      onClose()
      onSuccess?.()
    } else {
      toast.error(result.error || "Failed to unarchive service")
    }
  }

  const handleTrash = async () => {
    if (!service) return
    setIsDeleting(true)
    const result = await trashService(service.id)
    setIsDeleting(false)
    if (result.success) {
      toast.success("Service moved to trash")
      onClose()
      onSuccess?.()
    } else {
      toast.error(result.error || "Failed to move service to trash")
    }
  }

  const handleRestore = async () => {
    if (!service) return
    setIsDeleting(true)
    const result = await restoreService(service.id)
    setIsDeleting(false)
    if (result.success) {
      toast.success("Service restored")
      onClose()
      onSuccess?.()
    } else {
      toast.error(result.error || "Failed to restore service")
    }
  }

  const handlePermanentDelete = async () => {
    if (!service) return
    setIsDeleting(true)
    const result = await permanentlyDeleteService(service.id)
    setIsDeleting(false)
    if (result.success) {
      toast.success("Service permanently deleted")
      onClose()
      onSuccess?.()
    } else {
      toast.error(result.error || "Failed to delete service")
    }
  }

  const handleCancelEdit = () => {
    if (isNew) {
      onClose()
    } else if (service) {
      setName(service.name)
      setDescription(service.description || "")
      setCategory(service.category || "")
      setPricingType(service.pricing_type || "fixed")
      setPriceMin(service.price_min?.toString() || "")
      setPriceMax(service.price_max?.toString() || "")
      setCurrency(service.currency)
      setTypicalTimeline(service.typical_timeline || "")
      // Reset retainer fields
      setHoursIncluded(service.hours_included?.toString() || "")
      setResponseTime(service.response_time || "")
      setRolloverHours(service.rollover_hours?.toString() || "")
      setBillingInterval(service.billing_interval || "monthly")
      setIsRecommended(service.is_recommended || false)
      setServicesIncluded(service.services_included || [])
      setIsEditing(false)
    }
  }

  const currencySymbol = CURRENCIES.find((c) => c.value === currency)?.symbol || "$"
  const priceDisplay = service
    ? formatPrice(service.price_min, service.price_max, service.pricing_type, service.currency)
    : null

  return (
    <div className={cn("flex flex-col h-full bg-card/50", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <h3 className="text-sm font-medium">
          {isNew ? "New Service" : "Properties"}
        </h3>
        <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-6 pt-4">
          {isEditing ? (
            // Edit Form
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">
                  Name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Landing Page Design"
                  className="h-9"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-medium text-muted-foreground">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what's included..."
                  className="min-h-[80px] resize-none"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Pricing Type */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Pricing Type</Label>
                <Select value={pricingType} onValueChange={(v) => setPricingType(v as PricingType)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICING_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Currency */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Currency</Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((curr) => (
                      <SelectItem key={curr.value} value={curr.value}>
                        {curr.symbol} {curr.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="priceMin" className="text-xs font-medium text-muted-foreground">
                    Price Min
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      {currencySymbol}
                    </span>
                    <Input
                      id="priceMin"
                      type="number"
                      min="0"
                      step="0.01"
                      value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                      placeholder="0"
                      className="pl-7 h-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priceMax" className="text-xs font-medium text-muted-foreground">
                    Price Max
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      {currencySymbol}
                    </span>
                    <Input
                      id="priceMax"
                      type="number"
                      min="0"
                      step="0.01"
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                      placeholder="0"
                      className="pl-7 h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-2">
                <Label htmlFor="timeline" className="text-xs font-medium text-muted-foreground">
                  Typical Timeline
                </Label>
                <Input
                  id="timeline"
                  value={typicalTimeline}
                  onChange={(e) => setTypicalTimeline(e.target.value)}
                  placeholder="e.g., 2-4 weeks"
                  className="h-9"
                />
              </div>

              {/* Retainer-Specific Fields */}
              {pricingType === "retainer" && (
                <>
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs font-medium text-muted-foreground mb-3">Retainer Details</p>
                  </div>

                  {/* Hours Included */}
                  <div className="space-y-2">
                    <Label htmlFor="hoursIncluded" className="text-xs font-medium text-muted-foreground">
                      Hours Included
                    </Label>
                    <Input
                      id="hoursIncluded"
                      type="number"
                      min="0"
                      step="1"
                      value={hoursIncluded}
                      onChange={(e) => setHoursIncluded(e.target.value)}
                      placeholder="0"
                      className="h-9"
                    />
                  </div>

                  {/* Response Time */}
                  <div className="space-y-2">
                    <Label htmlFor="responseTime" className="text-xs font-medium text-muted-foreground">
                      Response Time
                    </Label>
                    <Input
                      id="responseTime"
                      value={responseTime}
                      onChange={(e) => setResponseTime(e.target.value)}
                      placeholder="e.g., 48 business hours"
                      className="h-9"
                    />
                  </div>

                  {/* Rollover Hours */}
                  <div className="space-y-2">
                    <Label htmlFor="rolloverHours" className="text-xs font-medium text-muted-foreground">
                      Rollover Hours
                    </Label>
                    <Input
                      id="rolloverHours"
                      type="number"
                      min="0"
                      step="1"
                      value={rolloverHours}
                      onChange={(e) => setRolloverHours(e.target.value)}
                      placeholder="0"
                      className="h-9"
                    />
                  </div>

                  {/* Billing Interval */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Billing Interval</Label>
                    <Select value={billingInterval} onValueChange={(v) => setBillingInterval(v as "monthly" | "quarterly" | "annually")}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Recommended Badge */}
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Show "Recommended" Badge</Label>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">Highlight this package to clients</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isRecommended}
                      onClick={() => setIsRecommended(!isRecommended)}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
                        isRecommended ? "bg-primary" : "bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none block size-4 rounded-full bg-background shadow-lg transition-transform",
                          isRecommended ? "translate-x-4" : "translate-x-0.5"
                        )}
                      />
                    </button>
                  </div>
                </>
              )}

              {/* Edit Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleSave}
                  disabled={isSaving || !name.trim()}
                >
                  {isSaving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  {isNew ? "Create" : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            // Inline-Editable View Mode
            <>
              {/* Service Header - Editable Name */}
              <div className="flex items-start gap-2">
                <InlineEditField
                  value={service?.name || ""}
                  onSave={async (value) => {
                    if (!service || !value.trim()) return
                    const result = await updateService({ id: service.id, name: value.trim() })
                    if (result.success) {
                      toast.success("Name updated")
                      onSuccess?.()
                    } else {
                      toast.error(result.error || "Failed to update name")
                      throw new Error(result.error)
                    }
                  }}
                  placeholder="Service name"
                  className="font-semibold text-lg w-full text-left block flex-1"
                  inputClassName="w-full text-left text-lg font-semibold"
                />
                {service?.is_recommended && (
                  <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 shrink-0">
                    <Star className="size-3 mr-1" />
                    Recommended
                  </Badge>
                )}
              </div>

              {/* Description - Editable */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground mb-2">Description</p>
                <InlineEditField
                  value={service?.description || ""}
                  onSave={async (value) => {
                    if (!service) return
                    const result = await updateService({ id: service.id, description: value.trim() || undefined })
                    if (result.success) {
                      toast.success("Description updated")
                      onSuccess?.()
                    } else {
                      toast.error(result.error || "Failed to update description")
                      throw new Error(result.error)
                    }
                  }}
                  placeholder="Add a description..."
                  multiline
                />
              </div>

              {/* Details Section - Inline Editable */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground mb-2">Details</p>
                <div className="rounded-lg border bg-muted/30 divide-y divide-border/50">
                  {/* Category - Dropdown */}
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-sm text-muted-foreground">Category</span>
                    <Select
                      value={service?.category || ""}
                      onValueChange={async (value) => {
                        if (!service) return
                        const result = await updateService({ id: service.id, category: value || undefined })
                        if (result.success) {
                          toast.success("Category updated")
                          onSuccess?.()
                        } else {
                          toast.error(result.error || "Failed to update category")
                        }
                      }}
                    >
                      <SelectTrigger className="h-7 w-auto border-none shadow-none bg-transparent hover:bg-muted/50 text-sm px-2 -mr-2">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat} className="text-sm">
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Pricing Type - Dropdown */}
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-sm text-muted-foreground">Type</span>
                    <Select
                      value={service?.pricing_type || "fixed"}
                      onValueChange={async (value) => {
                        if (!service) return
                        const result = await updateService({ id: service.id, pricing_type: value as PricingType })
                        if (result.success) {
                          toast.success("Type updated")
                          onSuccess?.()
                        } else {
                          toast.error(result.error || "Failed to update type")
                        }
                      }}
                    >
                      <SelectTrigger className="h-7 w-auto border-none shadow-none bg-transparent hover:bg-muted/50 text-sm px-2 -mr-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRICING_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value} className="text-sm">
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Price - Editable */}
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-sm text-muted-foreground">Price</span>
                    <InlineEditField
                      value={service?.price_min ? `${currencySymbol}${service.price_min}` : ""}
                      onSave={async (value) => {
                        if (!service) return
                        // Strip currency symbol and parse
                        const numericValue = value.replace(/[^0-9.]/g, "")
                        const priceValue = numericValue ? parseFloat(numericValue) : undefined
                        const result = await updateService({
                          id: service.id,
                          price_min: priceValue,
                          price_max: priceValue
                        })
                        if (result.success) {
                          toast.success("Price updated")
                          onSuccess?.()
                        } else {
                          toast.error(result.error || "Failed to update price")
                          throw new Error(result.error)
                        }
                      }}
                      placeholder={`${currencySymbol}0`}
                    />
                  </div>

                  {/* Timeline - Editable */}
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-sm text-muted-foreground">Timeline</span>
                    <InlineEditField
                      value={service?.typical_timeline || ""}
                      onSave={async (value) => {
                        if (!service) return
                        const result = await updateService({ id: service.id, typical_timeline: value.trim() || undefined })
                        if (result.success) {
                          toast.success("Timeline updated")
                          onSuccess?.()
                        } else {
                          toast.error(result.error || "Failed to update timeline")
                          throw new Error(result.error)
                        }
                      }}
                      placeholder="e.g. 2-4 weeks"
                    />
                  </div>

                  {/* Sync Status */}
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-sm text-muted-foreground">Sync</span>
                    {service?.stripe_sync_status === "synced" ? (
                      <span className="text-sm text-muted-foreground">Synced</span>
                    ) : (
                      <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-xs">
                        Not synced
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Retainer-Specific Fields (View Mode) */}
              {service?.pricing_type === "retainer" && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Retainer Details</p>
                  <div className="rounded-lg border bg-muted/30 divide-y divide-border/50">
                    {/* Hours Included */}
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Clock className="size-3.5" />
                        Hours/Month
                      </span>
                      <InlineEditField
                        value={service.hours_included?.toString() || "0"}
                        onSave={async (value) => {
                          if (!service) return
                          const hours = value ? parseFloat(value.replace(/[^0-9.]/g, "")) : null
                          const result = await updateService({ id: service.id, hours_included: hours })
                          if (result.success) {
                            toast.success("Hours updated")
                            onSuccess?.()
                          } else {
                            toast.error(result.error || "Failed to update hours")
                            throw new Error(result.error)
                          }
                        }}
                        placeholder="0"
                      />
                    </div>

                    {/* Response Time */}
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Zap className="size-3.5" />
                        Response Time
                      </span>
                      <InlineEditField
                        value={service.response_time || ""}
                        onSave={async (value) => {
                          if (!service) return
                          const result = await updateService({ id: service.id, response_time: value.trim() || null })
                          if (result.success) {
                            toast.success("Response time updated")
                            onSuccess?.()
                          } else {
                            toast.error(result.error || "Failed to update response time")
                            throw new Error(result.error)
                          }
                        }}
                        placeholder="e.g., 48 business hours"
                      />
                    </div>

                    {/* Rollover Hours */}
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Timer className="size-3.5" />
                        Rollover
                      </span>
                      <InlineEditField
                        value={service.rollover_hours ? `${service.rollover_hours} hrs` : "None"}
                        onSave={async (value) => {
                          if (!service) return
                          const rollover = value ? parseFloat(value.replace(/[^0-9.]/g, "")) : null
                          const result = await updateService({ id: service.id, rollover_hours: rollover })
                          if (result.success) {
                            toast.success("Rollover updated")
                            onSuccess?.()
                          } else {
                            toast.error(result.error || "Failed to update rollover")
                            throw new Error(result.error)
                          }
                        }}
                        placeholder="0"
                      />
                    </div>

                    {/* Billing Interval */}
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-sm text-muted-foreground">Billing</span>
                      <Select
                        value={service.billing_interval || "monthly"}
                        onValueChange={async (value) => {
                          if (!service) return
                          const result = await updateService({ id: service.id, billing_interval: value as "monthly" | "quarterly" | "annually" })
                          if (result.success) {
                            toast.success("Billing interval updated")
                            onSuccess?.()
                          } else {
                            toast.error(result.error || "Failed to update billing interval")
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 w-auto border-none shadow-none bg-transparent hover:bg-muted/50 text-sm px-2 -mr-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly" className="text-sm">Monthly</SelectItem>
                          <SelectItem value="quarterly" className="text-sm">Quarterly</SelectItem>
                          <SelectItem value="annually" className="text-sm">Annually</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Recommended Toggle */}
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Star className="size-3.5" />
                        Recommended
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={service.is_recommended}
                        onClick={async () => {
                          if (!service) return
                          const result = await updateService({ id: service.id, is_recommended: !service.is_recommended })
                          if (result.success) {
                            toast.success(service.is_recommended ? "Removed recommended badge" : "Added recommended badge")
                            onSuccess?.()
                          } else {
                            toast.error(result.error || "Failed to update")
                          }
                        }}
                        className={cn(
                          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
                          service.is_recommended ? "bg-primary" : "bg-muted"
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none block size-4 rounded-full bg-background shadow-lg transition-transform",
                            service.is_recommended ? "translate-x-4" : "translate-x-0.5"
                          )}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Services Included (Retainer only) */}
              {service?.pricing_type === "retainer" && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2">What's Included</p>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    {service.services_included && service.services_included.length > 0 ? (
                      <ul className="space-y-1.5">
                        {service.services_included.map((item, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <Check className="size-4 text-primary shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No services specified</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer - Fixed at Bottom */}
      {!isEditing && service && (
        <div className="shrink-0 p-3 border-t border-border/60 space-y-2">
          {/* Context-aware actions */}
          {viewFilter === "active" && (
            <>
              <Button
                variant="outline"
                className="w-full h-9"
                onClick={handleArchive}
                disabled={isArchiving}
              >
                {isArchiving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Archive className="size-4" />
                )}
                Archive
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Move to trash?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {service.name} will be moved to trash and permanently deleted after 30 days.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleTrash}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={isDeleting}
                    >
                      {isDeleting ? <Loader2 className="size-4 animate-spin" /> : "Move to Trash"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}

          {viewFilter === "archived" && (
            <>
              <Button
                variant="outline"
                className="w-full h-9"
                onClick={handleUnarchive}
                disabled={isArchiving}
              >
                {isArchiving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArchiveRestore className="size-4" />
                )}
                Unarchive
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Move to trash?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {service.name} will be moved to trash and permanently deleted after 30 days.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleTrash}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={isDeleting}
                    >
                      {isDeleting ? <Loader2 className="size-4 animate-spin" /> : "Move to Trash"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}

          {viewFilter === "deleted" && (
            <>
              <Button
                variant="outline"
                className="w-full h-9"
                onClick={handleRestore}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RotateCcw className="size-4" />
                )}
                Restore
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-4" />
                    Delete Forever
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Permanently delete?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. {service.name} will be permanently removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handlePermanentDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={isDeleting}
                    >
                      {isDeleting ? <Loader2 className="size-4 animate-spin" /> : "Delete Forever"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      )}
    </div>
  )
}
