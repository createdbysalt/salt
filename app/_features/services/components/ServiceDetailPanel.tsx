"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Loader2, Check, X, Trash2, Archive, ArchiveRestore, RotateCcw } from "lucide-react"
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
  Switch,
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
  const [isActive, setIsActive] = useState(true)

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
      setIsActive(service.is_active)
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
      setIsActive(true)
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
          is_active: isActive,
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
      setIsActive(service.is_active)
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

              {/* Active Toggle (only for edit) */}
              {service && (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label htmlFor="active" className="font-medium text-sm">
                      Active
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Inactive services won&apos;t appear in proposals
                    </p>
                  </div>
                  <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
                </div>
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
            // View Mode
            <>
              {/* Service Header */}
              <div className="flex items-start gap-3">
                <div className="size-12 shrink-0 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-base font-medium">
                    {service?.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{service?.name}</h4>
                  <p className="text-sm text-muted-foreground truncate">
                    {service?.category || "Uncategorized"}
                  </p>
                </div>
              </div>

              {/* Description */}
              {service?.description && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Description</p>
                  <p className="text-sm text-foreground">{service.description}</p>
                </div>
              )}

              {/* Details Section */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground mb-2">Details</p>
                <div className="rounded-lg border bg-muted/30 divide-y divide-border/50">
                  {/* Status */}
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <span className="text-sm">
                      {service?.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Pricing Type */}
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-sm text-muted-foreground">Type</span>
                    <span className="text-sm">
                      {PRICING_TYPES.find((t) => t.value === service?.pricing_type)?.label || "—"}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-sm text-muted-foreground">Price</span>
                    <span className="text-sm font-medium">
                      {priceDisplay || "—"}
                    </span>
                  </div>

                  {/* Timeline */}
                  {service?.typical_timeline && (
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-sm text-muted-foreground">Timeline</span>
                      <span className="text-sm">{service.typical_timeline}</span>
                    </div>
                  )}

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
                onClick={() => setIsEditing(true)}
              >
                Edit Service
              </Button>

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
