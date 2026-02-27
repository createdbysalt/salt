export type TagType = "feature" | "deliverable"

export interface StudioTag {
  id: string
  studio_id: string
  name: string
  tag_type: TagType
  category: string
  sort_order: number
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface TagGroup {
  category: string
  tags: StudioTag[]
}

export interface GroupedTags {
  features: TagGroup[]
  deliverables: TagGroup[]
}

export interface CreateTagInput {
  name: string
  tag_type: TagType
  category: string
  sort_order?: number
}

export interface UpdateTagInput {
  id: string
  name?: string
  category?: string
  sort_order?: number
}
