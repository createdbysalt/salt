"use client"

import * as React from "react"
import {
  Tag,
  Plus,
  Loader2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Pencil,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import {
  Button,
  Input,
  Badge,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/ui"
import { useStudioTags } from "@/app/_features/tags/hooks/useStudioTags"
import {
  createTag,
  updateTag,
  deleteTag,
  seedDefaultTags,
} from "@/app/_features/tags/actions"
import type { StudioTag, TagType, TagGroup } from "@/app/_features/tags/types"
import { SettingsPage } from "../SettingsPage"
import { SettingsSection } from "../SettingsSection"
import { SettingsCard } from "../SettingsCard"

// Predefined categories
const FEATURE_CATEGORIES = [
  "Responsive",
  "Performance",
  "Technical",
  "Design",
  "Revisions",
  "Support",
  "Custom",
]

const DELIVERABLE_CATEGORIES = [
  "Pages",
  "Branding",
  "Documentation",
  "Files",
  "Assets",
  "Custom",
]

interface TagEditorDialogProps {
  open: boolean
  onOpenChange: (isOpen: boolean) => void
  tag?: StudioTag | null
  tagType: TagType
  onSuccess: () => void
}

function TagEditorDialog({
  open,
  onOpenChange,
  tag,
  tagType,
  onSuccess,
}: TagEditorDialogProps) {
  const [name, setName] = React.useState("")
  const [category, setCategory] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)

  const isEditing = !!tag
  const categories =
    tagType === "feature" ? FEATURE_CATEGORIES : DELIVERABLE_CATEGORIES

  React.useEffect(() => {
    if (tag) {
      setName(tag.name)
      setCategory(tag.category)
    } else {
      setName("")
      setCategory(categories[0])
    }
  }, [tag, categories])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("Tag name is required")
      return
    }

    setIsSaving(true)

    if (isEditing && tag) {
      const result = await updateTag({
        id: tag.id,
        name: name.trim(),
        category,
      })
      if (result.success) {
        toast.success("Tag updated")
        onSuccess()
        onOpenChange(false)
      } else {
        toast.error(result.error)
      }
    } else {
      const result = await createTag({
        name: name.trim(),
        tag_type: tagType,
        category,
      })
      if (result.success) {
        toast.success("Tag created")
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
            {isEditing ? "Edit Tag" : `New ${tagType === "feature" ? "Feature" : "Deliverable"} Tag`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Mobile Ready"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isEditing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface TagGroupSectionProps {
  group: TagGroup
  tagType: TagType
  onEdit: (tag: StudioTag) => void
  onDelete: (tag: StudioTag) => void
}

function TagGroupSection({
  group,
  tagType: _tagType,
  onEdit,
  onDelete,
}: TagGroupSectionProps) {
  const [isOpen, setIsOpen] = React.useState(true)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-sm font-medium hover:text-foreground text-muted-foreground">
        <span>{group.category}</span>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-normal">
            {group.tags.length}
          </Badge>
          {isOpen ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-wrap gap-2 pb-4">
          {group.tags.map((tag) => (
            <div
              key={tag.id}
              className="group relative flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5 text-sm"
            >
              <span>{tag.name}</span>
              {tag.is_default && (
                <Sparkles className="size-3 text-muted-foreground" />
              )}
              <div className="ml-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEdit(tag)}
                  className="rounded p-0.5 hover:bg-muted"
                >
                  <Pencil className="size-3 text-muted-foreground" />
                </button>
                <button
                  onClick={() => onDelete(tag)}
                  className="rounded p-0.5 hover:bg-muted"
                >
                  <Trash2 className="size-3 text-muted-foreground" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

interface TagTypeSectionProps {
  title: string
  description: string
  tagType: TagType
  groups: TagGroup[]
  onAddTag: () => void
  onEdit: (tag: StudioTag) => void
  onDelete: (tag: StudioTag) => void
}

function TagTypeSection({
  title,
  description,
  tagType,
  groups,
  onAddTag,
  onEdit,
  onDelete,
}: TagTypeSectionProps) {
  const totalTags = groups.reduce((sum, g) => sum + g.tags.length, 0)
  const typeLabel = tagType === "feature" ? "feature" : "deliverable"
  const typeButton = tagType === "feature" ? "Feature" : "Deliverable"

  return (
    <SettingsSection title={title} description={description}>
      <SettingsCard>
        <div className="p-4">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <Tag className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                No {typeLabel} tags yet
              </p>
              <Button variant="outline" size="sm" onClick={onAddTag}>
                <Plus className="mr-2 size-4" />
                Add {typeButton}
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-muted-foreground">
                  {totalTags} tag{totalTags !== 1 ? "s" : ""}
                </span>
                <Button variant="ghost" size="sm" onClick={onAddTag}>
                  <Plus className="mr-2 size-4" />
                  Add
                </Button>
              </div>
              <div className="divide-y">
                {groups.map((group) => (
                  <TagGroupSection
                    key={group.category}
                    group={group}
                    tagType={tagType}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </SettingsCard>
    </SettingsSection>
  )
}

export function StudioTagsSection() {
  const { tags, grouped, isLoading, mutate } = useStudioTags()
  const [isSeeding, setIsSeeding] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingTag, setEditingTag] = React.useState<StudioTag | null>(null)
  const [currentTagType, setCurrentTagType] = React.useState<TagType>("feature")
  const [deleteConfirm, setDeleteConfirm] = React.useState<StudioTag | null>(
    null
  )
  const [isDeleting, setIsDeleting] = React.useState(false)

  const hasNoTags = tags.length === 0

  async function handleSeedDefaults() {
    setIsSeeding(true)
    const result = await seedDefaultTags()
    if (result.success) {
      toast.success("Default tags added")
      mutate()
    } else {
      toast.error(result.error)
    }
    setIsSeeding(false)
  }

  function handleAddTag(type: TagType) {
    setCurrentTagType(type)
    setEditingTag(null)
    setDialogOpen(true)
  }

  function handleEditTag(tag: StudioTag) {
    setCurrentTagType(tag.tag_type)
    setEditingTag(tag)
    setDialogOpen(true)
  }

  async function handleDeleteTag() {
    if (!deleteConfirm) return

    setIsDeleting(true)
    const result = await deleteTag(deleteConfirm.id)
    if (result.success) {
      toast.success("Tag deleted")
      mutate()
    } else {
      toast.error(result.error)
    }
    setIsDeleting(false)
    setDeleteConfirm(null)
  }

  if (isLoading) {
    return (
      <SettingsPage title="Tags">
        <SettingsSection title="Features" description="Capabilities included with your services">
          <SettingsCard>
            <div className="p-4 space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-3/4" />
            </div>
          </SettingsCard>
        </SettingsSection>
        <SettingsSection title="Deliverables" description="Outputs your clients receive">
          <SettingsCard>
            <div className="p-4 space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-3/4" />
            </div>
          </SettingsCard>
        </SettingsSection>
      </SettingsPage>
    )
  }

  if (hasNoTags) {
    return (
      <SettingsPage title="Tags">
        <div className="rounded-lg border bg-card">
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Tag className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Set up your tags</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              Tags help you define features and deliverables for your services.
              Start with our defaults or create your own.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => handleAddTag("feature")}>
                <Plus className="mr-2 size-4" />
                Create from scratch
              </Button>
              <Button onClick={handleSeedDefaults} disabled={isSeeding}>
                {isSeeding && <Loader2 className="mr-2 size-4 animate-spin" />}
                <Sparkles className="mr-2 size-4" />
                Use defaults
              </Button>
            </div>
          </div>
        </div>
      </SettingsPage>
    )
  }

  return (
    <SettingsPage title="Tags">
      <TagTypeSection
        title="Features"
        description="Capabilities included with your services (e.g., Mobile Ready, SEO Optimized)"
        tagType="feature"
        groups={grouped.features}
        onAddTag={() => handleAddTag("feature")}
        onEdit={handleEditTag}
        onDelete={setDeleteConfirm}
      />

      <TagTypeSection
        title="Deliverables"
        description="Outputs your clients receive (e.g., Homepage, Brand Guidelines)"
        tagType="deliverable"
        groups={grouped.deliverables}
        onAddTag={() => handleAddTag("deliverable")}
        onEdit={handleEditTag}
        onDelete={setDeleteConfirm}
      />

      {/* Tag Editor Dialog */}
      <TagEditorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tag={editingTag}
        tagType={currentTagType}
        onSuccess={() => mutate()}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete tag</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete &ldquo;{deleteConfirm?.name}&rdquo;?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTag}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsPage>
  )
}
