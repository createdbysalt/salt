"use client"

import * as React from "react"
import {
  Tag,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import {
  Button,
  Badge,
  Skeleton,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  MultiSelectCombobox,
  type ComboboxItem,
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
import type { TagType, TagGroup } from "@/app/_features/tags/types"
import { SettingsPage } from "../SettingsPage"
import { SettingsSection } from "../SettingsSection"
import { SettingsCard } from "../SettingsCard"

// Group rename dialog
interface GroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tagType: TagType
  currentName: string
  onSuccess: () => void
}

function GroupRenameDialog({ open, onOpenChange, tagType, currentName, onSuccess }: GroupDialogProps) {
  const [name, setName] = React.useState(currentName)
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    setName(currentName)
  }, [currentName, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || name === currentName) return

    setIsSaving(true)
    const result = await renameCategory(tagType, currentName, name.trim())
    if (result.success) {
      toast.success("Group renamed")
      onSuccess()
      onOpenChange(false)
    } else {
      toast.error(result.error)
    }
    setIsSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename Group</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-4">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !name.trim() || name === currentName}>
              {isSaving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Group delete confirmation
interface DeleteGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tagType: TagType
  groupName: string
  tagCount: number
  onSuccess: () => void
}

function DeleteGroupDialog({ open, onOpenChange, tagType, groupName, tagCount, onSuccess }: DeleteGroupDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)
  const itemName = tagType === "feature" ? "feature" : "deliverable"

  async function handleDelete() {
    setIsDeleting(true)
    const result = await deleteCategory(tagType, groupName)
    if (result.success) {
      toast.success(`Deleted "${groupName}"`)
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
          <DialogTitle>Delete Group</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Delete &ldquo;{groupName}&rdquo; and all {tagCount} {tagCount === 1 ? itemName : `${itemName}s`}?
          This cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Single group section with combobox
interface TagGroupSectionProps {
  group: TagGroup
  tagType: TagType
  onAdd: (name: string, category: string) => Promise<void>
  onRemove: (tagId: string) => Promise<void>
  onEdit: (tagId: string, newName: string) => Promise<void>
  onRenameGroup: () => void
  onDeleteGroup: () => void
}

function TagGroupSection({
  group,
  tagType,
  onAdd,
  onRemove,
  onEdit,
  onRenameGroup,
  onDeleteGroup,
}: TagGroupSectionProps) {
  const [isOpen, setIsOpen] = React.useState(true)
  const itemName = tagType === "feature" ? "feature" : "deliverable"

  // Get values for this group's tags
  const groupValues = group.tags.map((t) => t.id)

  // Items for this group (for label lookup in chips)
  const groupItems: ComboboxItem[] = group.tags.map((t) => ({
    value: t.id,
    label: t.name,
    group: group.category,
  }))

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between py-2 group/header">
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-foreground text-muted-foreground">
          {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          <span>{group.category}</span>
          <Badge variant="secondary" className="font-normal">{group.tags.length}</Badge>
        </CollapsibleTrigger>
        <div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
          <button onClick={onRenameGroup} className="p-1 rounded hover:bg-muted">
            <Pencil className="size-3.5 text-muted-foreground" />
          </button>
          <button onClick={onDeleteGroup} className="p-1 rounded hover:bg-muted">
            <Trash2 className="size-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
      <CollapsibleContent>
        <div className="pb-4 pl-6">
          <MultiSelectCombobox
            items={groupItems}
            value={groupValues}
            onRemove={onRemove}
            onCreate={(name) => onAdd(name, group.category)}
            onEdit={onEdit}
            placeholder={`Add ${itemName}...`}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// Tag type section (Features or Deliverables)
interface TagTypeSectionProps {
  title: string
  description: string
  tagType: TagType
  groups: TagGroup[]
  onAdd: (name: string, category: string) => Promise<void>
  onRemove: (tagId: string) => Promise<void>
  onEdit: (tagId: string, newName: string) => Promise<void>
  onAddGroup: () => void
  onMutate: () => void
}

function TagTypeSection({
  title,
  description,
  tagType,
  groups,
  onAdd,
  onRemove,
  onEdit,
  onAddGroup,
  onMutate,
}: TagTypeSectionProps) {
  const [renameDialog, setRenameDialog] = React.useState<{ open: boolean; category: string }>({ open: false, category: "" })
  const [deleteDialog, setDeleteDialog] = React.useState<{ open: boolean; category: string; count: number }>({ open: false, category: "", count: 0 })

  const totalItems = groups.reduce((sum, g) => sum + g.tags.length, 0)
  const itemName = tagType === "feature" ? "feature" : "deliverable"
  const itemNamePlural = tagType === "feature" ? "features" : "deliverables"

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
                No groups yet. Create a group to start adding {itemNamePlural}.
              </p>
              <Button variant="outline" size="sm" onClick={onAddGroup}>
                Add Group
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-muted-foreground">
                  {totalItems} {totalItems === 1 ? itemName : itemNamePlural} in {groups.length} group{groups.length !== 1 ? "s" : ""}
                </span>
                <Button variant="ghost" size="sm" onClick={onAddGroup}>
                  Add Group
                </Button>
              </div>
              <div className="divide-y">
                {groups.map((group) => (
                  <TagGroupSection
                    key={group.category}
                    group={group}
                    tagType={tagType}
                    onAdd={onAdd}
                    onRemove={onRemove}
                    onEdit={onEdit}
                    onRenameGroup={() => setRenameDialog({ open: true, category: group.category })}
                    onDeleteGroup={() => setDeleteDialog({ open: true, category: group.category, count: group.tags.length })}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </SettingsCard>

      <GroupRenameDialog
        open={renameDialog.open}
        onOpenChange={(open) => setRenameDialog((prev) => ({ ...prev, open }))}
        tagType={tagType}
        currentName={renameDialog.category}
        onSuccess={onMutate}
      />

      <DeleteGroupDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
        tagType={tagType}
        groupName={deleteDialog.category}
        tagCount={deleteDialog.count}
        onSuccess={onMutate}
      />
    </SettingsSection>
  )
}

// New group dialog
interface NewGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tagType: TagType
  existingGroups: string[]
  onSuccess: (category: string) => void
}

function NewGroupDialog({ open, onOpenChange, tagType, existingGroups, onSuccess }: NewGroupDialogProps) {
  const [name, setName] = React.useState("")
  const itemName = tagType === "feature" ? "feature" : "deliverable"

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    if (existingGroups.includes(name.trim())) {
      toast.error("A group with this name already exists")
      return
    }
    onSuccess(name.trim())
    setName("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Group</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-4">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`e.g., Animation, ${tagType === "feature" ? "Support" : "Documents"}`}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-2">
              Add {itemName}s to this group after creating it.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!name.trim()}>Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function StudioServicesSection() {
  const { tags, grouped, isLoading, mutate } = useStudioTags()
  const [isSeeding, setIsSeeding] = React.useState(false)
  const [newGroupDialog, setNewGroupDialog] = React.useState<{ open: boolean; tagType: TagType }>({ open: false, tagType: "feature" })

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

  async function handleAdd(tagType: TagType, name: string, category: string) {
    const result = await createTag({ name, tag_type: tagType, category })
    if (result.success) {
      mutate()
    } else {
      toast.error(result.error)
    }
  }

  async function handleRemove(tagId: string) {
    const result = await deleteTag(tagId)
    if (result.success) {
      mutate()
    } else {
      toast.error(result.error)
    }
  }

  async function handleEdit(tagId: string, newName: string) {
    const result = await updateTag({ id: tagId, name: newName })
    if (result.success) {
      mutate()
    } else {
      toast.error(result.error)
    }
  }

  function handleNewGroup(tagType: TagType, category: string) {
    // Create a placeholder tag to establish the group
    handleAdd(tagType, `New ${tagType === "feature" ? "Feature" : "Deliverable"}`, category)
  }

  if (isLoading) {
    return (
      <SettingsPage title="Services">
        <SettingsSection title="Features" description="Capabilities included with your services">
          <SettingsCard>
            <div className="p-4 space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </SettingsCard>
        </SettingsSection>
        <SettingsSection title="Deliverables" description="Outputs your clients receive">
          <SettingsCard>
            <div className="p-4 space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-10 w-full" />
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
            <h3 className="text-lg font-medium mb-2">Set up your service catalog</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              Define the features and deliverables you offer to clients.
            </p>
            <Button onClick={handleSeedDefaults} disabled={isSeeding}>
              {isSeeding && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              <Sparkles className="mr-1.5 size-4" />
              Use defaults
            </Button>
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
        onAdd={(name, category) => handleAdd("feature", name, category)}
        onRemove={handleRemove}
        onEdit={handleEdit}
        onAddGroup={() => setNewGroupDialog({ open: true, tagType: "feature" })}
        onMutate={() => mutate()}
      />

      <TagTypeSection
        title="Deliverables"
        description="Outputs your clients receive (e.g., Homepage, Brand Guidelines)"
        tagType="deliverable"
        groups={grouped.deliverables}
        onAdd={(name, category) => handleAdd("deliverable", name, category)}
        onRemove={handleRemove}
        onEdit={handleEdit}
        onAddGroup={() => setNewGroupDialog({ open: true, tagType: "deliverable" })}
        onMutate={() => mutate()}
      />

      <NewGroupDialog
        open={newGroupDialog.open}
        onOpenChange={(open) => setNewGroupDialog((prev) => ({ ...prev, open }))}
        tagType={newGroupDialog.tagType}
        existingGroups={
          newGroupDialog.tagType === "feature"
            ? grouped.features.map((g) => g.category)
            : grouped.deliverables.map((g) => g.category)
        }
        onSuccess={(category) => handleNewGroup(newGroupDialog.tagType, category)}
      />
    </SettingsPage>
  )
}
