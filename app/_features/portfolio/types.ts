export interface PortfolioStat {
  value: string
  label: string
}

export interface PortfolioTag {
  id: string
  workspace_id: string | null
  name: string
  is_default: boolean
  created_at: string
}

export interface PortfolioItem {
  id: string
  workspace_id: string
  title: string
  subtitle: string | null
  description: string | null
  link_url: string | null
  link_text: string | null
  hero_image_url: string | null
  stats: PortfolioStat[]
  is_featured: boolean
  sort_order: number
  created_at: string
  updated_at: string
  tags?: PortfolioTag[]
}

export interface CreatePortfolioItemInput {
  title: string
  subtitle?: string
  description?: string
  link_url?: string
  link_text?: string
  hero_image_url?: string
  stats?: PortfolioStat[]
  is_featured?: boolean
  tag_ids?: string[]
}

export interface UpdatePortfolioItemInput extends Partial<CreatePortfolioItemInput> {
  id: string
}

export interface CreatePortfolioTagInput {
  name: string
}
