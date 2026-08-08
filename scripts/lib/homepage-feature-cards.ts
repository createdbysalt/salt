export type HomepageFeatureCardSeed = {
  _id: string
  key: string
  title: string
  label: string
  visualKey: string
  sortOrder: number
}

export const HOMEPAGE_FEATURE_CARDS: HomepageFeatureCardSeed[] = [
  {
    _id: 'feature-integrations',
    key: 'integrations',
    title: 'Connect the tools your business already runs on.',
    label: 'Integrations',
    visualKey: 'integrations',
    sortOrder: 0,
  },
  {
    _id: 'feature-capture-memory',
    key: 'capture-memory',
    title: 'Catch context as it happens. Salt files it for you.',
    label: 'Sources & Memory',
    visualKey: 'capture-memory',
    sortOrder: 1,
  },
  {
    _id: 'feature-morning-brief',
    key: 'morning-brief',
    title: 'Start every morning oriented. Not catching up.',
    label: 'Morning Brief',
    visualKey: 'morning-brief',
    sortOrder: 2,
  },
  {
    _id: 'feature-plays',
    key: 'plays',
    title: 'Skip the blank draft. Salt prepares, you approve.',
    label: 'Plays',
    visualKey: 'plays',
    sortOrder: 3,
  },
  {
    _id: 'feature-intelligence',
    key: 'intelligence',
    title: "Know what's going quiet before it costs you.",
    label: 'Intelligence',
    visualKey: 'intelligence',
    sortOrder: 4,
  },
  {
    _id: 'feature-playbooks',
    key: 'playbooks',
    title: 'Build Playbooks once. Salt runs them from there.',
    label: 'Playbooks',
    visualKey: 'playbooks',
    sortOrder: 5,
  },
]

export function featureCardReferences(ids: string[]) {
  return ids.map((id) => ({
    _type: 'reference' as const,
    _ref: id,
    _key: id.replace(/^feature-/, ''),
  }))
}

export function duplicateFeatureCardsForLanding(
  landingSlug: string,
  idSuffix: string
): HomepageFeatureCardSeed[] {
  return HOMEPAGE_FEATURE_CARDS.map((card) => ({
    ...card,
    _id: `${card._id}-${idSuffix}`,
    key: `${card.key}-${idSuffix}`,
  }))
}
