import { describe, it, expect } from 'vitest'
import { sortCompareHubEntries } from './compare-hub-sort'

describe('sortCompareHubEntries', () => {
  it('orders by hub anchor then sortOrder', () => {
    const input = [
      { slug: 'alt', hubAnchor: 'alternatives' as const, sortOrder: 0 },
      { slug: 'chatgpt', hubAnchor: 'default' as const, sortOrder: 2 },
      { slug: 'va', hubAnchor: 'hiring-va' as const, sortOrder: 0 },
      { slug: 'lindy', hubAnchor: 'default' as const, sortOrder: 0 },
      { slug: 'viktor', hubAnchor: 'default' as const, sortOrder: 1 },
    ]

    expect(sortCompareHubEntries(input).map((e) => e.slug)).toEqual([
      'lindy',
      'viktor',
      'chatgpt',
      'va',
      'alt',
    ])
  })
})
