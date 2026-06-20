import { getCompareHubEntriesFromSanity } from '@/app/_lib/sanity/queries'
import type { CompareHubAnchor, CompareHubKind } from '@/app/_lib/sanity/types'
import { COMPARE_HUB_ENTRIES, type CompareHubEntry } from './compare-pages'
import { sortCompareHubEntries } from './compare-hub-sort'

const LEGACY_HUB_META: Record<
  string,
  { hubAnchor: CompareHubAnchor; sortOrder: number }
> = {
  'salt-vs-lindy': { hubAnchor: 'default', sortOrder: 0 },
  'salt-vs-viktor': { hubAnchor: 'default', sortOrder: 1 },
  'salt-vs-chatgpt': { hubAnchor: 'default', sortOrder: 2 },
  'salt-vs-hiring-a-va': { hubAnchor: 'hiring-va', sortOrder: 0 },
  'salt-alternatives': { hubAnchor: 'alternatives', sortOrder: 0 },
}

type HubEntryResolved = {
  slug: string
  label: string
  description?: string
  kind: CompareHubKind
  competitorSlug?: string
  hubAnchor: CompareHubAnchor
  sortOrder: number
  image?: CompareHubEntry['image']
  imageAlt?: string
}

function legacyToResolved(entry: CompareHubEntry): HubEntryResolved {
  const meta = LEGACY_HUB_META[entry.slug] ?? {
    hubAnchor: 'default' as const,
    sortOrder: 0,
  }

  return {
    slug: entry.slug,
    label: entry.label,
    description: entry.description,
    kind: entry.kind,
    competitorSlug: entry.competitorSlug,
    hubAnchor: meta.hubAnchor,
    sortOrder: meta.sortOrder,
    image: entry.image,
    imageAlt: entry.imageAlt,
  }
}

function toCompareHubEntry(resolved: HubEntryResolved): CompareHubEntry {
  return {
    slug: resolved.slug,
    label: resolved.label,
    description: resolved.description ?? '',
    kind: resolved.kind,
    competitorSlug: resolved.competitorSlug,
    image: resolved.image,
    imageAlt: resolved.imageAlt,
  }
}

/**
 * Hub cards for /compare — Sanity first, legacy registry fills gaps.
 * Sort: vs pages (by sortOrder) → Hiring a VA → All alternatives.
 */
export async function getCompareHubEntries(): Promise<CompareHubEntry[]> {
  let sanityEntries: HubEntryResolved[] = []

  try {
    const rows = await getCompareHubEntriesFromSanity()
    sanityEntries = rows.map((row) => ({
      slug: row.slug,
      label: row.label,
      description: row.description,
      kind: row.kind,
      competitorSlug: row.competitorSlug,
      hubAnchor: row.hubAnchor ?? 'default',
      sortOrder: row.sortOrder ?? 0,
    }))
  } catch (error) {
    console.error('[compare] Sanity hub fetch failed, using legacy registry', error)
  }

  const bySlug = new Map<string, HubEntryResolved>()

  for (const legacy of COMPARE_HUB_ENTRIES.map(legacyToResolved)) {
    bySlug.set(legacy.slug, legacy)
  }

  for (const entry of sanityEntries) {
    const existing = bySlug.get(entry.slug)
    bySlug.set(entry.slug, {
      ...entry,
      image: existing?.image,
      imageAlt: existing?.imageAlt,
    })
  }

  const merged = sortCompareHubEntries([...bySlug.values()])
  return merged.map(toCompareHubEntry)
}
