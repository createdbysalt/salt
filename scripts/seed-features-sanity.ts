/**
 * Seed Sanity with homepage Product feature cards (no public detail pages).
 *
 * Usage:
 *   op run --env-file=.env.1password -- pnpm content:seed-features
 */
import { createClient } from '@sanity/client'
import { readFileSync } from 'node:fs'

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'olt8be01'
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

const writeToken =
  process.env.SANITY_API_WRITE_TOKEN ||
  (() => {
    try {
      return readFileSync('/tmp/sanity_wt', 'utf8').trim()
    } catch {
      return ''
    }
  })()

if (!writeToken) {
  console.error('Missing SANITY_API_WRITE_TOKEN (or /tmp/sanity_wt)')
  console.error('Usage: op run --env-file=.env.1password -- pnpm content:seed-features')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  token: writeToken,
  apiVersion: '2024-01-01',
  useCdn: false,
})

type FeatureCardSeed = {
  _id: string
  key: string
  title: string
  label: string
  visualKey: string
  sortOrder: number
}

const FEATURE_CARDS: FeatureCardSeed[] = [
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
    label: 'Capture & Memory',
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

async function main() {
  console.log(`Seeding ${FEATURE_CARDS.length} feature cards to ${PROJECT_ID}/${DATASET}…`)

  for (const card of FEATURE_CARDS) {
    await client.createOrReplace({
      _id: card._id,
      _type: 'featurePage',
      language: 'en',
      key: card.key,
      title: card.title,
      label: card.label,
      visualKey: card.visualKey,
      sortOrder: card.sortOrder,
      showOnLanding: true,
    })
    console.log(`  ✓ ${card.label}`)
  }

  console.log('Done.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
