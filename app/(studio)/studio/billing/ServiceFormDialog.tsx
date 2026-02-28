"use client"

import { useState, useEffect } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { cn } from "@repo/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui"
import { createService, updateService, deleteService } from "@/app/_features/services/actions"
import type { StudioService, PricingType, Currency } from "@/app/_features/services/types"
import { toast } from "sonner"

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

interface ServiceFormDialogProps {
  service?: StudioService
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

export function ServiceFormDialog({
  service,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
}: ServiceFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const onOpenChange = controlledOnOpenChange ?? setInternalOpen

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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

  // Reset form when service changes
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
    } else {
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
    }
  }, [service, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("Service name is required")
      return
    }

    setIsSubmitting(true)

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
          onOpenChange(false)
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
          onOpenChange(false)
          onSuccess?.()
        } else {
          toast.error(result.error || "Failed to create service")
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!service) return

    setIsDeleting(true)
    const result = await deleteService(service.id)
    setIsDeleting(false)

    if (result.success) {
      toast.success("Service deleted")
      setShowDeleteDialog(false)
      onOpenChange(false)
      onSuccess?.()
    } else {
      toast.error(result.error || "Failed to delete service")
    }
  }

  const currencySymbol = CURRENCIES.find((c) => c.value === currency)?.symbol || "$"

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{service ? "Edit Service" : "Create Service"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Landing Page Design"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what's included in this service..."
                className="min-h-[80px] resize-none"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
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

            {/* Pricing Type & Currency */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Pricing Type</Label>
                <Select value={pricingType} onValueChange={(v) => setPricingType(v as PricingType)}>
                  <SelectTrigger>
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

              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                  <SelectTrigger>
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
            </div>

            {/* Price Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="priceMin">
                  {pricingType === "fixed" ? "Price Min" : pricingType === "hourly" ? "Rate Min" : "Monthly Min"}
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
                    placeholder="0.00"
                    className="pl-7"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="priceMax">
                  {pricingType === "fixed" ? "Price Max" : pricingType === "hourly" ? "Rate Max" : "Monthly Max"}
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
                    placeholder="0.00"
                    className="pl-7"
                  />
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-1.5">
              <Label htmlFor="timeline">Typical Timeline</Label>
              <Input
                id="timeline"
                value={typicalTimeline}
                onChange={(e) => setTypicalTimeline(e.target.value)}
                placeholder="e.g., 2-4 weeks"
              />
            </div>

            {/* Active Toggle (only for edit) */}
            {service && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label htmlFor="active" className="font-medium">
                    Active
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Inactive services won&apos;t appear in proposals
                  </p>
                </div>
                <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
              </div>
            )}

            <DialogFooter className="flex items-center justify-between gap-2 pt-2">
              {service && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 mr-auto"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="size-3.5 mr-1.5" />
                  Delete
                </Button>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                  {service ? "Save Changes" : "Create Service"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{service?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the service
              and remove it from your catalog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
