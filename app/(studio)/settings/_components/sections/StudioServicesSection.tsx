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
  MoreHorizontal,
  FolderPlus,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui"
import { useStudioTags } from "@/app/_features/tags/hooks/useStudioTags"
import {
  createTag,
  updateTag,
  deleteTag,
  seedDefaultTags,
  renameCategory,
  deleteCategory,
} from "@/app/_features/tags/actions"
import type { StudioTag, TagType, TagGroup } from "@/app/_features/tags/types"
import { SettingsPage } from "../SettingsPage"
import { SettingsSection } from "../SettingsSection"
import { SettingsCard } from "../SettingsCard"

interface TagEditorDialogProps {
  open: boolean
  onOpenChange: (isOpen: boolean) => void
  tag?: StudioTag | null
  tagType: TagType
  category?: string
  categories: string[]
  onSuccess: () => void
}

function TagEditorDialog({
  open,
  onOpenChange,
  tag,
  tagType,
  category: defaultCategory,
  categories,
  onSuccess,
}: TagEditorDialogProps) {
  const [name, setName] = React.useState("")
  const [category, setCategory] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)

  const isEditing = !!tag

  React.useEffect(() => {
    if (tag) {
      setName(tag.name)
      setCategory(tag.category)
    } else {
      setName("")
      setCategory(defaultCategory || categories[0] || "")
    }
  }, [tag, defaultCategory, categories])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("Tag name is required")
      return
    }

    if (!category) {
      toast.error("Category is required")
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
            {isEditing ? "Edit Tag" : `New ${tagType === "feature" ? "Feature" : "Deliverable"}`}
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
              <label className="text-sm font-medium">Group</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select group" />
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

interface GroupEditorDialogProps {
  open: boolean
  onOpenChange: (isOpen: boolean) => void
  mode: "create" | "rename"
  tagType: TagType
  currentName?: string
  existingGroups: string[]
  onSuccess: () => void
}

function GroupEditorDialog({
  open,
  onOpenChange,
  mode,
  tagType,
  currentName,
  existingGroups,
  onSuccess,
}: GroupEditorDialogProps) {
  const [name, setName] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    setName(currentName || "")
  }, [currentName, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("Group name is required")
      return
    }

    if (name.trim() !== currentName && existingGroups.includes(name.trim())) {
      toast.error("A group with this name already exists")
      return
    }

    setIsSaving(true)

    if (mode === "rename" && currentName) {
      const result = await renameCategory(tagType, currentName, name.trim())
      if (result.success) {
        toast.success("Group renamed")
        onSuccess()
        onOpenChange(false)
      } else {
        toast.error(result.error)
      }
    } else {
      // For create, we just close - the group will appear when a tag is added
      toast.success("Group created - add tags to see it")
      onSuccess()
      onOpenChange(false)
    }

    setIsSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New Group" : "Rename Group"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Group Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Animation"
                autoFocus
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
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {mode === "create" ? "Create" : "Rename"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface DeleteGroupDialogProps {
  open: boolean
  onOpenChange: (isOpen: boolean) => void
  tagType: TagType
  groupName: string
  tagCount: number
  onSuccess: () => void
}

function DeleteGroupDialog({
  open,
  onOpenChange,
  tagType,
  groupName,
  tagCount,
  onSuccess,
}: DeleteGroupDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    const result = await deleteCategory(tagType, groupName)
    if (result.success) {
      toast.success(`Deleted "${groupName}" and ${tagCount} tag${tagCount !== 1 ? "s" : ""}`)
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
          <DialogTitle>Delete group</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete &ldquo;{groupName}&rdquo; and all {tagCount} tag{tagCount !== 1 ? "s" : ""} in it?
          This action cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Delete Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface TagGroupSectionProps {
  group: TagGroup
  tagType: TagType
  onAddTag: (category: string) => void
  onEditTag: (tag: StudioTag) => void
  onDeleteTag: (tag: StudioTag) => void
  onRenameGroup: (category: string) => void
  onDeleteGroup: (category: string, tagCount: number) => void
}

function TagGroupSection({
  group,
  tagType: _tagType,
  onAddTag,
  onEditTag,
  onDeleteTag,
  onRenameGroup,
  onDeleteGroup,
}: TagGroupSectionProps) {
  const [isOpen, setIsOpen] = React.useState(true)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between py-2 group/header">
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-foreground text-muted-foreground">
          {isOpen ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
          <span>{group.category}</span>
          <Badge variant="secondary" className="font-normal">
            {group.tags.length}
          </Badge>
        </CollapsibleTrigger>
        <div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onAddTag(group.category)}
          >
            <Plus className="size-3.5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onRenameGroup(group.category)}>
                <Pencil className="mr-2 size-4" />
                Rename group
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDeleteGroup(group.category, group.tags.length)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 size-4" />
                Delete group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <CollapsibleContent>
        <div className="flex flex-wrap gap-2 pb-4 pl-6">
          {group.tags.map((tag) => (
            <div
              key={tag.id}
              className="group relative flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5 text-sm hover:border-foreground/20 transition-colors"
            >
              <span>{tag.name}</span>
              {tag.is_default && (
                <Sparkles className="size-3 text-muted-foreground" />
              )}
              <div className="ml-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEditTag(tag)}
                  className="rounded p-0.5 hover:bg-muted"
                >
                  <Pencil className="size-3 text-muted-foreground" />
                </button>
                <button
                  onClick={() => onDeleteTag(tag)}
                  className="rounded p-0.5 hover:bg-muted"
                >
                  <Trash2 className="size-3 text-muted-foreground" />
                </button>
              </div>
            </div>
          ))}
          {group.tags.length === 0 && (
            <p className="text-sm text-muted-foreground italic">No tags in this group</p>
          )}
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
  allCategories: string[]
  onAddTag: (category?: string) => void
  onEditTag: (tag: StudioTag) => void
  onDeleteTag: (tag: StudioTag) => void
  onAddGroup: () => void
  onRenameGroup: (category: string) => void
  onDeleteGroup: (category: string, tagCount: number) => void
}

function TagTypeSection({
  title,
  description,
  tagType: _tagType,
  groups,
  allCategories,
  onAddTag,
  onEditTag,
  onDeleteTag,
  onAddGroup,
  onRenameGroup,
  onDeleteGroup,
}: TagTypeSectionProps) {
  const totalTags = groups.reduce((sum, g) => sum + g.tags.length, 0)

  return (
    <SettingsSection title={title} description={description}>
      <SettingsCard>
        <div className="p-4">
          {groups.length === 0 && allCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <Tag className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                No groups yet. Create a group to start adding tags.
              </p>
              <Button variant="outline" size="sm" onClick={onAddGroup}>
                <FolderPlus className="mr-2 size-4" />
                Add Group
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-muted-foreground">
                  {totalTags} tag{totalTags !== 1 ? "s" : ""} in {groups.length} group{groups.length !== 1 ? "s" : ""}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={onAddGroup}>
                    <FolderPlus className="mr-2 size-4" />
                    Group
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onAddTag()}>
                    <Plus className="mr-2 size-4" />
                    Tag
                  </Button>
                </div>
              </div>
              <div className="divide-y">
                {groups.map((group) => (
                  <TagGroupSection
                    key={group.category}
                    group={group}
                    tagType={_tagType}
                    onAddTag={onAddTag}
                    onEditTag={onEditTag}
                    onDeleteTag={onDeleteTag}
                    onRenameGroup={onRenameGroup}
                    onDeleteGroup={onDeleteGroup}
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

export function StudioServicesSection() {
  const { tags, grouped, isLoading, mutate } = useStudioTags()
  const [isSeeding, setIsSeeding] = React.useState(false)

  // Tag dialog state
  const [tagDialogOpen, setTagDialogOpen] = React.useState(false)
  const [editingTag, setEditingTag] = React.useState<StudioTag | null>(null)
  const [currentTagType, setCurrentTagType] = React.useState<TagType>("feature")
  const [currentCategory, setCurrentCategory] = React.useState<string | undefined>()

  // Group dialog state
  const [groupDialogOpen, setGroupDialogOpen] = React.useState(false)
  const [groupDialogMode, setGroupDialogMode] = React.useState<"create" | "rename">("create")
  const [renamingCategory, setRenamingCategory] = React.useState<string>()

  // Delete dialogs
  const [deleteTagConfirm, setDeleteTagConfirm] = React.useState<StudioTag | null>(null)
  const [deleteGroupConfirm, setDeleteGroupConfirm] = React.useState<{ category: string; tagCount: number } | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const hasNoTags = tags.length === 0

  // Get all categories for each type
  const featureCategories = grouped.features.map(g => g.category)
  const deliverableCategories = grouped.deliverables.map(g => g.category)

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

  function handleAddTag(type: TagType, category?: string) {
    setCurrentTagType(type)
    setCurrentCategory(category)
    setEditingTag(null)
    setTagDialogOpen(true)
  }

  function handleEditTag(tag: StudioTag) {
    setCurrentTagType(tag.tag_type)
    setCurrentCategory(tag.category)
    setEditingTag(tag)
    setTagDialogOpen(true)
  }

  function handleAddGroup(type: TagType) {
    setCurrentTagType(type)
    setGroupDialogMode("create")
    setRenamingCategory(undefined)
    setGroupDialogOpen(true)
  }

  function handleRenameGroup(type: TagType, category: string) {
    setCurrentTagType(type)
    setGroupDialogMode("rename")
    setRenamingCategory(category)
    setGroupDialogOpen(true)
  }

  function handleDeleteGroup(type: TagType, category: string, tagCount: number) {
    setCurrentTagType(type)
    setDeleteGroupConfirm({ category, tagCount })
  }

  async function handleDeleteTag() {
    if (!deleteTagConfirm) return

    setIsDeleting(true)
    const result = await deleteTag(deleteTagConfirm.id)
    if (result.success) {
      toast.success("Tag deleted")
      mutate()
    } else {
      toast.error(result.error)
    }
    setIsDeleting(false)
    setDeleteTagConfirm(null)
  }

  if (isLoading) {
    return (
      <SettingsPage title="Services">
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
      <SettingsPage title="Services">
        <div className="rounded-lg border bg-card">
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Tag className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Set up your service tags</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              Define the features and deliverables you offer to clients.
              These tags help you build your services catalog.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => handleAddGroup("feature")}>
                <FolderPlus className="mr-2 size-4" />
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
    <SettingsPage title="Services">
      <TagTypeSection
        title="Features"
        description="Capabilities included with your services (e.g., Mobile Ready, SEO Optimized)"
        tagType="feature"
        groups={grouped.features}
        allCategories={featureCategories}
        onAddTag={(category) => handleAddTag("feature", category)}
        onEditTag={handleEditTag}
        onDeleteTag={setDeleteTagConfirm}
        onAddGroup={() => handleAddGroup("feature")}
        onRenameGroup={(category) => handleRenameGroup("feature", category)}
        onDeleteGroup={(category, tagCount) => handleDeleteGroup("feature", category, tagCount)}
      />

      <TagTypeSection
        title="Deliverables"
        description="Outputs your clients receive (e.g., Homepage, Brand Guidelines)"
        tagType="deliverable"
        groups={grouped.deliverables}
        allCategories={deliverableCategories}
        onAddTag={(category) => handleAddTag("deliverable", category)}
        onEditTag={handleEditTag}
        onDeleteTag={setDeleteTagConfirm}
        onAddGroup={() => handleAddGroup("deliverable")}
        onRenameGroup={(category) => handleRenameGroup("deliverable", category)}
        onDeleteGroup={(category, tagCount) => handleDeleteGroup("deliverable", category, tagCount)}
      />

      {/* Tag Editor Dialog */}
      <TagEditorDialog
        open={tagDialogOpen}
        onOpenChange={setTagDialogOpen}
        tag={editingTag}
        tagType={currentTagType}
        category={currentCategory}
        categories={currentTagType === "feature" ? featureCategories : deliverableCategories}
        onSuccess={() => mutate()}
      />

      {/* Group Editor Dialog */}
      <GroupEditorDialog
        open={groupDialogOpen}
        onOpenChange={setGroupDialogOpen}
        mode={groupDialogMode}
        tagType={currentTagType}
        currentName={renamingCategory}
        existingGroups={currentTagType === "feature" ? featureCategories : deliverableCategories}
        onSuccess={() => mutate()}
      />

      {/* Delete Tag Confirmation Dialog */}
      <Dialog
        open={!!deleteTagConfirm}
        onOpenChange={() => setDeleteTagConfirm(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete tag</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete &ldquo;{deleteTagConfirm?.name}&rdquo;?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTagConfirm(null)}>
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

      {/* Delete Group Confirmation Dialog */}
      {deleteGroupConfirm && (
        <DeleteGroupDialog
          open={!!deleteGroupConfirm}
          onOpenChange={() => setDeleteGroupConfirm(null)}
          tagType={currentTagType}
          groupName={deleteGroupConfirm.category}
          tagCount={deleteGroupConfirm.tagCount}
          onSuccess={() => mutate()}
        />
      )}
    </SettingsPage>
  )
}
