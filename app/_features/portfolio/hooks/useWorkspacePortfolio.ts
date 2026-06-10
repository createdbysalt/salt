"use client"

import useSWR from "swr"
import type { PortfolioItem, PortfolioTag } from "../types"

async function fetchPortfolioItems(): Promise<PortfolioItem[]> {
  const response = await fetch("/api/portfolio/items")
  if (!response.ok) throw new Error("Failed to fetch portfolio items")
  return response.json()
}

async function fetchPortfolioTags(): Promise<PortfolioTag[]> {
  const response = await fetch("/api/portfolio/tags")
  if (!response.ok) throw new Error("Failed to fetch portfolio tags")
  return response.json()
}

export function useWorkspacePortfolio() {
  const {
    data: items,
    error: itemsError,
    isLoading: itemsLoading,
    mutate: mutateItems,
  } = useSWR<PortfolioItem[]>("portfolio-items", fetchPortfolioItems)

  const {
    data: tags,
    error: tagsError,
    isLoading: tagsLoading,
    mutate: mutateTags,
  } = useSWR<PortfolioTag[]>("portfolio-tags", fetchPortfolioTags)

  return {
    items: items || [],
    tags: tags || [],
    isLoading: itemsLoading || tagsLoading,
    error: itemsError || tagsError,
    mutateItems,
    mutateTags,
    mutate: () => {
      mutateItems()
      mutateTags()
    },
  }
}
