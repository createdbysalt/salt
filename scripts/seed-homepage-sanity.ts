/**
 * Seed Sanity homepage — Core Pages → Homepage.
 *
 * Usage:
 *   op run --env-file=.env.1password -- pnpm content:seed-homepage
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
  console.error('Usage: op run --env-file=.env.1password -- pnpm content:seed-homepage')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  token: writeToken,
  apiVersion: '2024-01-01',
  useCdn: false,
})

async function main() {
  console.log(`Seeding homepage to ${PROJECT_ID}/${DATASET}…`)

  const existing = await client.fetch<{ _id: string } | null>(
    `*[_type == "landingPage" && slug.current == "home"][0]{ _id }`
  )

  const docId = existing?._id ?? 'homepage'

  await client.createOrReplace({
    _id: docId,
    _type: 'landingPage',
    language: 'en',
    title: 'Homepage',
    slug: { _type: 'slug', current: 'home' },
    homepageContent: {
      _type: 'homepageContent',
      heroBadge: 'Proactive AI for your business',
      heroHeadline: 'You can clock out, Salt never sleeps',
      heroSubheadline:
        "Salt reads every tool your business runs on. It surfaces what needs you, automates what doesn't, and gets better over time.",
      heroWaitlistSource: 'homepage-hero',
      productEyebrow: 'Product',
      productTitle: 'Salt runs the work. You run the business.',
    },
    waitlistCta: {
      _type: 'reference',
      _ref: 'cta-waitlist',
    },
    seo: {
      _type: 'seo',
      title: 'Salt | Proactive AI for Your Business — Join the Waitlist',
      description:
        'Salt is proactive AI for independent professionals — an AI ops assistant that shows you what matters, prepares your moves, and waits for your approval. Join the waitlist.',
    },
  })

  console.log(`  ✓ homepage (${docId})`)
  console.log('Done.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
