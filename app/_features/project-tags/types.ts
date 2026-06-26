export type WorkTagType = "project" | "retainer"

export interface ProjectTag {
  id: string
  workspace_id: string
  name: string
  type: WorkTagType
  created_at: string
}
