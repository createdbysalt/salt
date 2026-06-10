"use client"

import * as React from "react"
import {
  Plus,
  Loader2,
  ImageIcon,
  Star,
  Trash2,
  Pencil,
  X,
  Upload,
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
  DialogDescription,
  DialogFooter,
  Input,
  Textarea,
  Switch,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@repo/ui"
import { useWorkspacePortfolio } from "@/app/_features/portfolio/hooks/useWorkspacePortfolio"
import {
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  uploadPortfolioImage,
} from "@/app/_features/portfolio/actions"
import type { PortfolioItem, PortfolioStat } from "@/app/_features/portfolio/types"
import { useClientTags } from "@/app/_features/client-tags/hooks/useClientTags"
import { useProjectTags } from "@/app/_features/project-tags/hooks/useProjectTags"
import { SettingsPage } from "../SettingsPage"
import { SettingsSection } from "../SettingsSection"

// ============================================================================
// PORTFOLIO ITEM CARD
// ============================================================================

interface PortfolioItemCardProps {
  item: PortfolioItem
  onEdit: (item: PortfolioItem) => void
  onDelete: (item: PortfolioItem) => void
}

function PortfolioItemCard({ item, onEdit, onDelete }: PortfolioItemCardProps) {
  return (
    <div className="group relative rounded-lg border bg-card overflow-hidden">
      {/* Hero Image */}
      <div className="aspect-video bg-muted relative">
        {item.hero_image_url ? (
          <img
            src={item.hero_image_url}
            alt={item.title}
            className="size-full object-cover"
          />
        ) : (
          <div className="size-full flex items-center justify-center">
            <ImageIcon className="size-8 text-muted-foreground/30" />
          </div>
        )}
        {item.is_featured && (
          <Badge className="absolute top-2 left-2 gap-1">
            <Star className="size-3" />
            Featured
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-medium truncate">{item.title}</h3>
            {item.subtitle && (
              <p className="text-sm text-muted-foreground truncate">{item.subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => onEdit(item)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(item)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 3).map((tag) => (
              <Badge key={tag.id} variant="secondary" className="text-xs">
                {tag.name}
              </Badge>
            ))}
            {item.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{item.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Stats preview */}
        {item.stats && item.stats.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {item.stats.length} stat{item.stats.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// TAG SELECTOR (Selection only - no creation)
// ============================================================================

interface TagSelectorProps {
  selectedIds: string[]
  tags: { id: string; name: string }[]
  onChange: (ids: string[]) => void
}

function TagSelector({ selectedIds, tags, onChange }: TagSelectorProps) {
  const toggleTag = (tagId: string) => {
    if (selectedIds.includes(tagId)) {
      onChange(selectedIds.filter((id) => id !== tagId))
    } else {
      onChange([...selectedIds, tagId])
    }
  }

  if (tags.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No tags available. Create tags in the Tags section below.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const isSelected = selectedIds.includes(tag.id)
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggleTag(tag.id)}
            className={`px-2.5 py-1 text-sm rounded-md border transition-colors ${
              isSelected
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted border-border hover:bg-muted/80"
            }`}
          >
            {tag.name}
          </button>
        )
      })}
    </div>
  )
}

// ============================================================================
// STATS EDITOR
// ============================================================================

interface StatsEditorProps {
  stats: PortfolioStat[]
  onChange: (stats: PortfolioStat[]) => void
}

function StatsEditor({ stats, onChange }: StatsEditorProps) {
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null)
  const [editValue, setEditValue] = React.useState("")
  const [editLabel, setEditLabel] = React.useState("")
  const [newValue, setNewValue] = React.useState("")
  const [newLabel, setNewLabel] = React.useState("")

  const newValueRef = React.useRef<HTMLInputElement>(null)
  const editValueRef = React.useRef<HTMLInputElement>(null)

  // Focus edit input when editing starts
  React.useEffect(() => {
    if (editingIndex !== null && editValueRef.current) {
      editValueRef.current.focus()
      editValueRef.current.select()
    }
  }, [editingIndex])

  const startEdit = (index: number) => {
    setEditingIndex(index)
    setEditValue(stats[index].value)
    setEditLabel(stats[index].label)
  }

  const saveEdit = () => {
    if (editingIndex === null) return
    if (!editValue.trim() || !editLabel.trim()) {
      // Remove if empty
      onChange(stats.filter((_, i) => i !== editingIndex))
    } else {
      const newStats = [...stats]
      newStats[editingIndex] = { value: editValue.trim(), label: editLabel.trim() }
      onChange(newStats)
    }
    setEditingIndex(null)
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      saveEdit()
    }
    if (e.key === "Escape") {
      setEditingIndex(null)
    }
  }

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newValue.trim() && newLabel.trim()) {
      e.preventDefault()
      onChange([...stats, { value: newValue.trim(), label: newLabel.trim() }])
      setNewValue("")
      setNewLabel("")
      newValueRef.current?.focus()
    }
  }

  const handleDelete = (index: number) => {
    onChange(stats.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      {/* Existing stats as chips */}
      {stats.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {stats.map((stat, index) => (
            editingIndex === index ? (
              <div
                key={index}
                className="flex items-center gap-1 rounded-md border border-primary bg-muted px-2 py-1"
              >
                <input
                  ref={editValueRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  className="w-12 bg-transparent text-sm font-medium outline-none"
                  placeholder="415%"
                />
                <span className="text-muted-foreground">·</span>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  onBlur={saveEdit}
                  className="flex-1 min-w-[100px] bg-transparent text-sm outline-none"
                  placeholder="Description"
                />
              </div>
            ) : (
              <div
                key={index}
                className="group flex items-center gap-1.5 rounded-md border bg-muted px-2.5 py-1 text-sm"
              >
                <span className="font-medium">{stat.value}</span>
                <span className="text-muted-foreground">·</span>
                <span>{stat.label}</span>
                <span className="flex items-center gap-0.5 ml-1">
                  <button
                    type="button"
                    onClick={() => startEdit(index)}
                    className="rounded-sm opacity-50 hover:opacity-100 transition-opacity"
                  >
                    <Pencil className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(index)}
                    className="rounded-sm opacity-50 hover:opacity-100 transition-opacity"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              </div>
            )
          ))}
        </div>
      )}

      {/* Add new stat input */}
      {stats.length < 6 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            ref={newValueRef}
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={handleAddKeyDown}
            placeholder="415%"
            className="w-16 rounded-md border bg-transparent px-2 py-1 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={handleAddKeyDown}
            placeholder="Increase in engagement"
            className="flex-1 rounded-md border bg-transparent px-2 py-1 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="button"
            onClick={() => {
              if (newValue.trim() && newLabel.trim()) {
                onChange([...stats, { value: newValue.trim(), label: newLabel.trim() }])
                setNewValue("")
                setNewLabel("")
                newValueRef.current?.focus()
              }
            }}
            disabled={!newValue.trim() || !newLabel.trim()}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <Plus className="size-4" />
          </button>
        </div>
      )}

      {stats.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Add metrics like &quot;415% · Increase in engagement&quot;
        </p>
      )}
    </div>
  )
}

// ============================================================================
// SETTINGS ROW (Matching AddClientSheet pattern)
// ============================================================================

interface SettingsRowProps {
  label: string
  description?: string
  children: React.ReactNode
  fullWidth?: boolean
}

function SettingsRow({ label, description, children, fullWidth = false }: SettingsRowProps) {
  if (fullWidth) {
    return (
      <div className="px-4 py-4 space-y-2">
        <div className="space-y-0.5">
          <div className="text-sm font-medium">{label}</div>
          {description && (
            <div className="text-sm text-muted-foreground">{description}</div>
          )}
        </div>
        {children}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between px-4 py-4">
      <div className="space-y-0.5">
        <div className="text-sm font-medium">{label}</div>
        {description && (
          <div className="text-sm text-muted-foreground">{description}</div>
        )}
      </div>
      <div className="flex items-center">{children}</div>
    </div>
  )
}

// ============================================================================
// ADD/EDIT SHEET
// ============================================================================

interface PortfolioItemSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: PortfolioItem | null
  tags: { id: string; name: string }[]
  onSuccess: () => void
}

function PortfolioItemSheet({
  open,
  onOpenChange,
  item,
  tags,
  onSuccess,
}: PortfolioItemSheetProps) {
  const isEditing = !!item
  const [isSaving, setIsSaving] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Form state
  const [title, setTitle] = React.useState("")
  const [subtitle, setSubtitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [linkUrl, setLinkUrl] = React.useState("")
  const [heroImageUrl, setHeroImageUrl] = React.useState("")
  const [heroImageFile, setHeroImageFile] = React.useState<File | null>(null)
  const [stats, setStats] = React.useState<PortfolioStat[]>([])
  const [isFeatured, setIsFeatured] = React.useState(false)
  const [selectedTagIds, setSelectedTagIds] = React.useState<string[]>([])

  // Reset form when opening/closing or item changes
  React.useEffect(() => {
    if (open) {
      if (item) {
        setTitle(item.title)
        setSubtitle(item.subtitle || "")
        setDescription(item.description || "")
        setLinkUrl(item.link_url || "")
        setHeroImageUrl(item.hero_image_url || "")
        setStats(item.stats || [])
        setIsFeatured(item.is_featured)
        setSelectedTagIds(item.tags?.map((t) => t.id) || [])
      } else {
        setTitle("")
        setSubtitle("")
        setDescription("")
        setLinkUrl("")
        setHeroImageUrl("")
        setHeroImageFile(null)
        setStats([])
        setIsFeatured(false)
        setSelectedTagIds([])
      }
    }
  }, [open, item])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Store the file for upload later
    setHeroImageFile(file)

    // Show preview
    const reader = new FileReader()
    reader.onload = () => {
      setHeroImageUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Title is required")
      return
    }

    setIsSaving(true)

    try {
      if (isEditing && item) {
        const result = await updatePortfolioItem({
          id: item.id,
          title: title.trim(),
          subtitle: subtitle.trim() || undefined,
          description: description.trim() || undefined,
          link_url: linkUrl.trim() || undefined,
          hero_image_url: heroImageUrl || undefined,
          stats,
          is_featured: isFeatured,
          tag_ids: selectedTagIds,
        })

        if (result.success) {
          toast.success("Portfolio item updated")
          onSuccess()
          onOpenChange(false)
        } else {
          toast.error(result.error || "Failed to update")
        }
      } else {
        const result = await createPortfolioItem({
          title: title.trim(),
          subtitle: subtitle.trim() || undefined,
          description: description.trim() || undefined,
          link_url: linkUrl.trim() || undefined,
          hero_image_url: heroImageUrl.startsWith("data:") ? undefined : heroImageUrl || undefined,
          stats,
          is_featured: isFeatured,
          tag_ids: selectedTagIds,
        })

        if (result.success) {
          // Upload image if we have a new file
          if (heroImageFile && result.id) {
            const formData = new FormData()
            formData.append("file", heroImageFile)
            const uploadResult = await uploadPortfolioImage(result.id, formData)
            if (uploadResult.success && uploadResult.url) {
              await updatePortfolioItem({
                id: result.id,
                hero_image_url: uploadResult.url,
              })
            }
          }
          toast.success("Portfolio item created")
          onSuccess()
          onOpenChange(false)
        } else {
          toast.error(result.error || "Failed to create")
        }
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-[540px] p-0 gap-0 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-5 border-b border-border shrink-0">
          <SheetTitle className="text-lg font-semibold">
            {isEditing ? "Edit Portfolio Item" : "Add Portfolio Item"}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Showcase your work with project details and results.
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Hero Image Section */}
          <div className="p-6 space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Hero Image</h3>
            <div
              className="aspect-video rounded-lg border-2 border-dashed bg-muted/50 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {heroImageUrl ? (
                <img
                  src={heroImageUrl}
                  alt="Preview"
                  className="size-full object-cover"
                />
              ) : (
                <div className="text-center p-4">
                  <Upload className="size-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Click to upload</p>
                  <p className="text-xs text-muted-foreground">PNG, JPEG, WebP up to 5MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleImageUpload}
            />
            {heroImageUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  setHeroImageUrl("")
                  setHeroImageFile(null)
                }}
              >
                Remove image
              </Button>
            )}
          </div>

          {/* Details Section */}
          <div className="px-6 pb-6 space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Details</h3>
            <div className="rounded-lg border bg-card divide-y">
              <SettingsRow label="Title *">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Project Name"
                  className="w-48 text-right"
                />
              </SettingsRow>

              <SettingsRow label="Subtitle">
                <Input
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Location or context"
                  className="w-48 text-right"
                />
              </SettingsRow>

              <SettingsRow label="Description" fullWidth>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the project and your work..."
                  rows={3}
                  className="resize-none"
                />
              </SettingsRow>

              <SettingsRow label="Link">
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-56 text-right"
                />
              </SettingsRow>
            </div>
          </div>

          {/* Stats Section */}
          <div className="px-6 pb-6 space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Stats</h3>
            <StatsEditor stats={stats} onChange={setStats} />
          </div>

          {/* Tags Section */}
          <div className="px-6 pb-6 space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Tags</h3>
            <TagSelector
              selectedIds={selectedTagIds}
              tags={tags}
              onChange={setSelectedTagIds}
            />
          </div>

          {/* Options Section */}
          <div className="px-6 pb-6 space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Options</h3>
            <div className="rounded-lg border bg-card divide-y">
              <SettingsRow
                label="Featured Project"
                description="Highlight this project at the top"
              >
                <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
              </SettingsRow>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/30">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="size-4 animate-spin" />}
            {isEditing ? "Save Changes" : "Add Item"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ============================================================================
// DELETE DIALOG
// ============================================================================

interface DeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: PortfolioItem | null
  onSuccess: () => void
}

function DeleteDialog({ open, onOpenChange, item, onSuccess }: DeleteDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleDelete = async () => {
    if (!item) return
    setIsDeleting(true)
    const result = await deletePortfolioItem(item.id)
    if (result.success) {
      toast.success("Portfolio item deleted")
      onSuccess()
      onOpenChange(false)
    } else {
      toast.error(result.error || "Failed to delete")
    }
    setIsDeleting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Portfolio Item</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{item?.title}&quot;? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting && <Loader2 className="size-4 animate-spin mr-2" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WorkspacePortfolioSection() {
  const { items, isLoading, mutate } = useWorkspacePortfolio()
  const { tags: clientTags, isLoading: clientTagsLoading } = useClientTags()
  const { tags: projectTags, isLoading: projectTagsLoading } = useProjectTags("project")

  // Combine client and project tags for portfolio
  const allTags = React.useMemo(() => {
    const combined = [
      ...clientTags.map(t => ({ id: t.id, name: t.name, type: "client" as const })),
      ...projectTags.map(t => ({ id: t.id, name: t.name, type: "project" as const })),
    ]
    return combined.sort((a, b) => a.name.localeCompare(b.name))
  }, [clientTags, projectTags])

  // Sheet state
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editingItem, setEditingItem] = React.useState<PortfolioItem | null>(null)

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [deletingItem, setDeletingItem] = React.useState<PortfolioItem | null>(null)

  const handleAdd = () => {
    setEditingItem(null)
    setSheetOpen(true)
  }

  const handleEdit = (item: PortfolioItem) => {
    setEditingItem(item)
    setSheetOpen(true)
  }

  const handleDelete = (item: PortfolioItem) => {
    setDeletingItem(item)
    setDeleteDialogOpen(true)
  }

  if (isLoading || clientTagsLoading || projectTagsLoading) {
    return (
      <SettingsPage title="Portfolio">
        <SettingsSection
          title="Portfolio Items"
          description="Showcase your best work"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-lg border bg-card overflow-hidden">
                <Skeleton className="aspect-video" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </SettingsSection>
      </SettingsPage>
    )
  }

  return (
    <SettingsPage title="Portfolio">
      <SettingsSection
        title="Portfolio Items"
        description="Showcase your best work with case studies and results"
        action={
          <Button onClick={handleAdd} size="sm">
            <Plus className="size-4" />
            Add Item
          </Button>
        }
      >
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/50 p-8 text-center">
            <ImageIcon className="size-10 mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="font-medium mb-1">No portfolio items yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your first project to showcase your work
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((item) => (
              <PortfolioItemCard
                key={item.id}
                item={item}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </SettingsSection>

      {/* Tags Section */}
      <SettingsSection
        title="Tags"
        description="Portfolio tags are combined from your Client and Project tags. Manage them in their respective settings pages."
      >
        <div className="rounded-lg border bg-card p-4">
          {allTags.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tags available. Add tags in the Clients or Projects settings.
            </p>
          ) : (
            <div className="space-y-3">
              {/* Client Tags */}
              {clientTags.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Client Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {clientTags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-2.5 py-1 text-sm rounded-md border bg-muted"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Project Tags */}
              {projectTags.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Project Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {projectTags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-2.5 py-1 text-sm rounded-md border bg-muted"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </SettingsSection>

      {/* Add/Edit Sheet */}
      <PortfolioItemSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        item={editingItem}
        tags={allTags}
        onSuccess={mutate}
      />

      {/* Delete Dialog */}
      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        item={deletingItem}
        onSuccess={mutate}
      />
    </SettingsPage>
  )
}
