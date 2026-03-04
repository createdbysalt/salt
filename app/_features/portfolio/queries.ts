import { createServerClient } from "@/app/_lib/supabase/server"
import { getCurrentStudioId } from "@/app/_lib/tenancy/context"
import type { PortfolioItem, PortfolioTag } from "./types"

export async function getPortfolioItems(): Promise<PortfolioItem[]> {
  const supabase = await createServerClient()
  const studioId = await getCurrentStudioId()

  if (!studioId) return []

  const { data: items, error } = await supabase
    .from("studio_portfolio_items")
    .select("*")
    .eq("studio_id", studioId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching portfolio items:", error)
    return []
  }

  // Fetch tags for each item
  const itemIds = items.map((item) => item.id)
  const { data: itemTags } = await supabase
    .from("studio_portfolio_item_tags")
    .select("portfolio_item_id, tag_id, studio_portfolio_tags(*)")
    .in("portfolio_item_id", itemIds)

  // Map tags to items
  const itemsWithTags = items.map((item) => ({
    ...item,
    stats: item.stats || [],
    tags: itemTags
      ?.filter((it) => it.portfolio_item_id === item.id)
      .map((it) => it.studio_portfolio_tags as unknown as PortfolioTag) || [],
  }))

  return itemsWithTags
}

export async function getPortfolioItem(id: string): Promise<PortfolioItem | null> {
  const supabase = await createServerClient()
  const studioId = await getCurrentStudioId()

  if (!studioId) return null

  const { data: item, error } = await supabase
    .from("studio_portfolio_items")
    .select("*")
    .eq("id", id)
    .eq("studio_id", studioId)
    .single()

  if (error || !item) return null

  // Fetch tags
  const { data: itemTags } = await supabase
    .from("studio_portfolio_item_tags")
    .select("tag_id, studio_portfolio_tags(*)")
    .eq("portfolio_item_id", id)

  return {
    ...item,
    stats: item.stats || [],
    tags: itemTags?.map((it) => it.studio_portfolio_tags as unknown as PortfolioTag) || [],
  }
}

export async function getPortfolioTags(): Promise<PortfolioTag[]> {
  const supabase = await createServerClient()
  const studioId = await getCurrentStudioId()

  // Get system defaults (studio_id IS NULL) and studio-specific tags
  const { data: tags, error } = await supabase
    .from("studio_portfolio_tags")
    .select("*")
    .or(`studio_id.is.null,studio_id.eq.${studioId}`)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching portfolio tags:", error)
    return []
  }

  return tags || []
}
