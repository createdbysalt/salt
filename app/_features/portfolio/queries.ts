import { createClient } from "@/app/_lib/supabase/server"
import type { PortfolioItem, PortfolioTag } from "./types"

// Helper to get current studio ID
async function getWorkspaceId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single()

  return member?.workspace_id || null
}

export async function getPortfolioItems(): Promise<PortfolioItem[]> {
  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()

  if (!workspaceId) return []

  const { data: items, error } = await supabase
    .from("workspace_portfolio_items")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching portfolio items:", error)
    return []
  }

  // Fetch tags for each item
  const itemIds = items.map((item: { id: string }) => item.id)

  if (itemIds.length === 0) {
    return items.map((item) => ({
      ...(item as PortfolioItem),
      stats: (item.stats || []) as PortfolioItem["stats"],
      tags: [] as PortfolioTag[],
    }))
  }

  const { data: itemTags } = await supabase
    .from("workspace_portfolio_item_tags")
    .select("portfolio_item_id, tag_id, workspace_portfolio_tags(*)")
    .in("portfolio_item_id", itemIds)

  // Map tags to items
  const itemsWithTags = items.map((item: Record<string, unknown>) => ({
    ...item,
    stats: (item.stats as unknown[]) || [],
    tags: itemTags
      ?.filter((it: { portfolio_item_id: string }) => it.portfolio_item_id === item.id)
      .map((it: { workspace_portfolio_tags: unknown }) => it.workspace_portfolio_tags as PortfolioTag) || [],
  }))

  return itemsWithTags as PortfolioItem[]
}

export async function getPortfolioItem(id: string): Promise<PortfolioItem | null> {
  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()

  if (!workspaceId) return null

  const { data: item, error } = await supabase
    .from("workspace_portfolio_items")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .single()

  if (error || !item) return null

  // Fetch tags
  const { data: itemTags } = await supabase
    .from("workspace_portfolio_item_tags")
    .select("tag_id, workspace_portfolio_tags(*)")
    .eq("portfolio_item_id", id)

  return {
    ...item,
    stats: item.stats || [],
    tags: itemTags?.map((it: { workspace_portfolio_tags: unknown }) => it.workspace_portfolio_tags as PortfolioTag) || [],
  } as PortfolioItem
}

export async function getPortfolioTags(): Promise<PortfolioTag[]> {
  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()

  // Get system defaults (workspace_id IS NULL) and studio-specific tags
  const { data: tags, error } = await supabase
    .from("workspace_portfolio_tags")
    .select("*")
    .or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching portfolio tags:", error)
    return []
  }

  return (tags || []) as PortfolioTag[]
}
