import type { CompareHubAnchor } from '@/app/_lib/sanity/types'

export type CompareHubSortable = {
  hubAnchor?: CompareHubAnchor
  sortOrder?: number
}

const HUB_ANCHOR_ORDER: Record<CompareHubAnchor, number> = {
  default: 0,
  'hiring-va': 1,
  alternatives: 2,
}

export function sortCompareHubEntries<T extends CompareHubSortable>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    const anchorA = HUB_ANCHOR_ORDER[a.hubAnchor ?? 'default']
    const anchorB = HUB_ANCHOR_ORDER[b.hubAnchor ?? 'default']
    if (anchorA !== anchorB) {
      return anchorA - anchorB
    }
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  })
}
