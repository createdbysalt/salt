export type WorkTagType = "project" | "retainer"

export interface ProjectTag {
  id: string
  studio_id: string
  name: string
  type: WorkTagType
  created_at: string
}
