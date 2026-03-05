"use client"

import { toast } from "sonner"
import { Skeleton } from "@repo/ui"
import { useProjectTags } from "@/app/_features/project-tags/hooks/useProjectTags"
import {
  createProjectTag,
  updateProjectTag,
  deleteProjectTag,
} from "@/app/_features/project-tags/actions"
import { SettingsPage } from "../SettingsPage"
import { SettingsSection } from "../SettingsSection"
import { TagManager } from "../TagManager"

export function StudioProjectsSection() {
  const { tags, isLoading, mutate } = useProjectTags()

  const handleAddTag = async (name: string) => {
    const result = await createProjectTag(name)
    if (result.success) {
      toast.success("Tag created")
      mutate()
    } else {
      toast.error(result.error || "Failed to create tag")
    }
    return result
  }

  const handleUpdateTag = async (id: string, name: string) => {
    const result = await updateProjectTag(id, name)
    if (result.success) {
      toast.success("Tag updated")
      mutate()
    } else {
      toast.error(result.error || "Failed to update tag")
    }
    return result
  }

  const handleDeleteTag = async (id: string) => {
    const result = await deleteProjectTag(id)
    if (result.success) {
      toast.success("Tag deleted")
      mutate()
    } else {
      toast.error(result.error || "Failed to delete tag")
    }
    return result
  }

  if (isLoading) {
    return (
      <SettingsPage title="Projects">
        <SettingsSection
          title="Tags"
          description="Categorize your projects by type of work"
        >
          <Skeleton className="h-12 w-full" />
        </SettingsSection>
      </SettingsPage>
    )
  }

  return (
    <SettingsPage title="Projects">
      <SettingsSection
        title="Tags"
        description="Categorize your projects by type of work. These tags are also available when tagging portfolio items."
      >
        <TagManager
          tags={tags.map(t => ({ id: t.id, name: t.name }))}
          onAdd={handleAddTag}
          onUpdate={handleUpdateTag}
          onDelete={handleDeleteTag}
          placeholder="Type and press Enter to add..."
        />
      </SettingsSection>
    </SettingsPage>
  )
}
