/**
 * Seed Sanity with Matt's /compare hub pages only (5 articles + 4 competitor brands).
 *
 * Competitors: Salt + the three vs-page brands (Lindy, Viktor, ChatGPT).
 * Pages: salt-vs-lindy, salt-vs-viktor, salt-vs-chatgpt, salt-vs-hiring-a-va, salt-alternatives.
 *
 * All five compare pages include the full Quo-style template (sections ①–⑥ or guide variant).
 *
 * Usage:
 *   op run --env-file=.env.1password -- pnpm content:seed-compare
 */
import { createClient } from '@sanity/client'
import { readFileSync } from 'node:fs'
import { SALT_VS_LINDY_COMPARE_TEMPLATE } from '../app/_features/marketing/compare/data/salt-vs-lindy-template'
import {
  SALT_ALTERNATIVES_COMPARE_TEMPLATE,
  SALT_VS_CHATGPT_COMPARE_TEMPLATE,
  SALT_VS_HIRING_A_VA_COMPARE_TEMPLATE,
  SALT_VS_VIKTOR_COMPARE_TEMPLATE,
} from '../app/_features/marketing/compare/data/compare-templates'

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
  console.error('Usage: op run --env-file=.env.1password -- pnpm content:seed-compare')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  token: writeToken,
  apiVersion: '2024-01-01',
  useCdn: false,
})

type CompetitorSeed = {
  slug: string
  name: string
  website?: string
  isSalt?: boolean
  category?: string
}

/** Brands used on Matt's compare hub (logo pairs on vs pages + Salt). */
const COMPETITORS: CompetitorSeed[] = [
  { slug: 'salt', name: 'Salt', website: 'https://usesalt.io', isSalt: true },
  { slug: 'lindy', name: 'Lindy', website: 'https://lindy.ai', category: 'agent-builder' },
  { slug: 'viktor', name: 'Viktor', website: 'https://viktor.com', category: 'chat-coworker' },
  { slug: 'chatgpt', name: 'ChatGPT', website: 'https://openai.com', category: 'chat-ai' },
]

/** Removed from an earlier seed — delete if present so Studio matches Matt's scope. */
const RETIRED_COMPETITOR_IDS = [
  'competitor-zapier',
  'competitor-make',
  'competitor-honeybook',
  'competitor-dubsado',
  'competitor-17hats',
]

type ComparePageSeed = {
  slug: string
  title: string
  excerpt: string
  articleKind: 'comparison' | 'guide'
  hubLabel: string
  hubDescription: string
  hubKind: 'versus' | 'guide'
  hubAnchor: 'default' | 'hiring-va' | 'alternatives'
  sortOrder: number
  primaryCompetitorSlug?: string
}

const COMPARE_TEMPLATE_BY_SLUG: Record<
  string,
  typeof SALT_VS_LINDY_COMPARE_TEMPLATE | undefined
> = {
  'salt-vs-lindy': SALT_VS_LINDY_COMPARE_TEMPLATE,
  'salt-vs-viktor': SALT_VS_VIKTOR_COMPARE_TEMPLATE,
  'salt-vs-chatgpt': SALT_VS_CHATGPT_COMPARE_TEMPLATE,
  'salt-vs-hiring-a-va': SALT_VS_HIRING_A_VA_COMPARE_TEMPLATE,
  'salt-alternatives': SALT_ALTERNATIVES_COMPARE_TEMPLATE,
}

const COMPARE_PAGES: ComparePageSeed[] = [
  {
    slug: 'salt-vs-lindy',
    title: 'Salt vs Lindy: Building Agents vs Getting the Work Done',
    excerpt:
      'Lindy lets you build AI agents. Salt arrives already knowing what to build. An honest comparison for independent professionals.',
    articleKind: 'comparison',
    hubLabel: 'Lindy',
    hubDescription: 'Building agents vs getting the work done.',
    hubKind: 'versus',
    hubAnchor: 'default',
    sortOrder: 0,
    primaryCompetitorSlug: 'lindy',
  },
  {
    slug: 'salt-vs-viktor',
    title: 'Salt vs Viktor: The AI Coworker vs the AI That Runs the Business',
    excerpt:
      'Viktor is an AI coworker that lives in your team chat. Salt is a proactive system that runs your whole business while you are out. An honest comparison.',
    articleKind: 'comparison',
    hubLabel: 'Viktor',
    hubDescription: 'AI coworker in chat vs AI that runs the business.',
    hubKind: 'versus',
    hubAnchor: 'default',
    sortOrder: 1,
    primaryCompetitorSlug: 'viktor',
  },
  {
    slug: 'salt-vs-chatgpt',
    title: 'Salt vs ChatGPT: The Difference Between Answering and Doing',
    excerpt:
      'ChatGPT answers what you ask. Salt does the work you never knew to ask for, across your whole business, while you are out. Here is the real difference.',
    articleKind: 'comparison',
    hubLabel: 'ChatGPT',
    hubDescription: 'Reactive answers vs proactive operations.',
    hubKind: 'versus',
    hubAnchor: 'default',
    sortOrder: 2,
    primaryCompetitorSlug: 'chatgpt',
  },
  {
    slug: 'salt-vs-hiring-a-va',
    title: 'Salt vs Hiring a Virtual Assistant',
    excerpt:
      'A part-time VA runs $800 to $1,500 a month plus hiring, training, and managing. Here is an honest comparison of what a VA and Salt each actually cover.',
    articleKind: 'comparison',
    hubLabel: 'Hiring a VA',
    hubDescription: 'Human help vs always-on proactive AI.',
    hubKind: 'versus',
    hubAnchor: 'hiring-va',
    sortOrder: 0,
  },
  {
    slug: 'salt-alternatives',
    title: 'Salt Alternatives: An Honest Guide',
    excerpt:
      'Looking at alternatives to Salt? Here is an honest breakdown of agent builders, chat coworkers, client CRMs, ChatGPT, and hiring help, and where each one fits.',
    articleKind: 'guide',
    hubLabel: 'All alternatives',
    hubDescription: 'Honest map of agent builders, CRMs, chat AI, and more.',
    hubKind: 'guide',
    hubAnchor: 'alternatives',
    sortOrder: 0,
  },
]

function competitorRef(slug: string) {
  return {
    _type: 'reference' as const,
    _ref: `competitor-${slug}`,
    _weak: true,
  }
}

async function ensureCompareCategory(): Promise<string> {
  const existing = await client.fetch<string | null>(
    '*[_type == "category" && slug.current == "compare"][0]._id'
  )
  if (existing) {
    console.log(`  ✓ Compare category (${existing})`)
    return existing
  }

  const created = await client.create({
    _type: 'category',
    title: 'Compare',
    slug: { _type: 'slug', current: 'compare' },
    description: 'Salt vs competitor comparisons and guides',
  })
  console.log(`  ✓ Created Compare category (${created._id})`)
  return created._id
}

async function seedCompetitors() {
  console.log('\n🏷️  Competitors')
  for (const row of COMPETITORS) {
    await client.createOrReplace({
      _id: `competitor-${row.slug}`,
      _type: 'competitor',
      name: row.name,
      slug: { _type: 'slug', current: row.slug },
      website: row.website,
      isSalt: row.isSalt ?? false,
      category: row.category,
      logoSource: 'brandfetch',
    })
    console.log(`  ✓ ${row.name}`)
  }
}

async function seedComparePages(categoryId: string) {
  console.log('\n📄 Compare pages')
  const publishedAt = new Date().toISOString()

  for (const page of COMPARE_PAGES) {
    const template = COMPARE_TEMPLATE_BY_SLUG[page.slug]

    await client.createOrReplace({
      _id: `compare-${page.slug}`,
      _type: 'blogPost',
      title: page.title,
      slug: { _type: 'slug', current: page.slug },
      excerpt: page.excerpt,
      articleKind: page.articleKind,
      publishedAt,
      language: 'en',
      category: { _type: 'reference', _ref: categoryId, _weak: true },
      ...(page.primaryCompetitorSlug
        ? { primaryCompetitor: competitorRef(page.primaryCompetitorSlug) }
        : {}),
      compareHub: {
        showOnHub: true,
        hubLabel: page.hubLabel,
        hubDescription: page.hubDescription,
        hubKind: page.hubKind,
        hubAnchor: page.hubAnchor,
        sortOrder: page.sortOrder,
      },
      ...(template
        ? {
            compareHero: template.compareHero,
            ...(template.compareFeatureTable
              ? { compareFeatureTable: template.compareFeatureTable }
              : {}),
            ...(template.compareHiddenCosts
              ? { compareHiddenCosts: template.compareHiddenCosts }
              : {}),
            ...(template.compareNarrative
              ? { compareNarrative: template.compareNarrative }
              : {}),
            ...(template.compareUserReviews
              ? { compareUserReviews: template.compareUserReviews }
              : {}),
            faq: template.faq,
          }
        : {}),
      body: [],
    })
    console.log(`  ✓ ${page.slug}${template ? ' (full template)' : ''}`)
  }
}

async function removeRetiredCompetitors() {
  console.log('\n🧹 Retired competitors (not on Matt compare hub)')
  for (const id of RETIRED_COMPETITOR_IDS) {
    try {
      await client.delete(id)
      console.log(`  ✓ removed ${id}`)
    } catch {
      console.log(`  · ${id} (not present)`)
    }
  }
}

async function main() {
  console.log(`\nSanity compare seed → ${PROJECT_ID}/${DATASET}`)

  console.log('\n📋 Prerequisites')
  const categoryId = await ensureCompareCategory()

  await removeRetiredCompetitors()
  await seedCompetitors()
  await seedComparePages(categoryId)

  console.log(
    '\nDone. Studio → Dynamic Content → Compare → Pages.\n' +
      'All compare pages are seeded with hero, table/grid, hidden costs (vs pages), narrative, reviews (vs pages), and FAQ.\n'
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
