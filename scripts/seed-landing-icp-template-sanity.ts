/**
 * Seed a full duplicate of the marketing homepage for ICP copy experiments.
 *
 * Creates under Dynamic Content → Landing Pages:
 * - Landing page `icp-template` (marketing-home variant)
 * - 6 feature cards (copy + visualKey)
 * - Dedicated waitlist CTA
 *
 * Duplicate this document in Studio for each ICP (coaches, creatives, etc.)
 * and edit copy only. Visuals stay tied to visualKey in code.
 *
 * Usage:
 *   op run --env-file=.env.1password -- pnpm content:seed-landing-icp-template
 */
import { createClient } from '@sanity/client'
import { readFileSync } from 'node:fs'
import { HOMEPAGE_STRUCTURED_DATA_FAQS_FALLBACK } from '../app/_features/marketing/landing2/homepage-structured-data-fallback'
import { HERO_PREVIEW_VISUAL_FALLBACK } from '../app/_features/marketing/landing2/hero-preview-visuals'
import {
  duplicateFeatureCardsForLanding,
  featureCardReferences,
} from './lib/homepage-feature-cards'

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'olt8be01'
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

const LANDING_ID = 'landing-icp-template'
const LANDING_SLUG = 'icp-template'
const ID_SUFFIX = 'icp-template'
const CTA_ID = 'cta-waitlist-icp-template'

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
  console.error(
    'Usage: op run --env-file=.env.1password -- pnpm content:seed-landing-icp-template'
  )
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  token: writeToken,
  apiVersion: '2024-01-01',
  useCdn: false,
})

const homepageContent = {
  _type: 'homepageContent' as const,
  heroBadge: 'Proactive AI for your business',
  heroHeadline: 'You can clock out, Salt never sleeps',
  heroSubheadline:
    "Salt reads every tool your business runs on. It surfaces what needs you, automates what doesn't, and gets better over time.",
  heroWaitlistSource: 'homepage-hero-icp-template',
  heroPreviewVisualKey: HERO_PREVIEW_VISUAL_FALLBACK,
  productEyebrow: 'Features',
  productTitle: 'Salt runs the work. You run the business.',
  structuredDataFaqs: HOMEPAGE_STRUCTURED_DATA_FAQS_FALLBACK.map((faq, index) => ({
    _key: `faq-${index}`,
    question: faq.question,
    answer: faq.answer,
  })),
}

async function main() {
  console.log(`Seeding ICP homepage template to ${PROJECT_ID}/${DATASET}…`)

  const featureCards = duplicateFeatureCardsForLanding(LANDING_SLUG, ID_SUFFIX)

  for (const card of featureCards) {
    await client.createOrReplace({
      _id: card._id,
      _type: 'featurePage',
      language: 'en',
      key: card.key,
      title: card.title,
      label: card.label,
      visualKey: card.visualKey,
      sortOrder: card.sortOrder,
      showOnLanding: false,
      landingPageKey: LANDING_SLUG,
    })
    console.log(`  ✓ feature ${card.label}`)
  }

  await client.createOrReplace({
    _id: CTA_ID,
    _type: 'marketingCta',
    language: 'en',
    key: CTA_ID,
    eyebrow: 'Early access',
    heading: 'Join the waitlist. Get in early.',
    subheading: 'First 200 customers lock in launch pricing — 2 months free on annual.',
    benefits: [
      'Founder access — direct input into product direction',
      "Launch pricing locked for as long as you're a customer",
    ],
    disclaimer: 'No countdown timers. No fake scarcity.',
    secondaryLinkLead: "Want to see what you're leaving on the table?",
    secondaryLink: {
      _type: 'link',
      text: 'Take the 2-minute quiz',
      linkType: 'internal',
      href: '/money-on-the-table?source=homepage-waitlist-cta-icp-template',
    },
    footerText:
      "Salt doesn't replace you. It amplifies you. The week you get back is yours.",
    waitlistSource: 'homepage-cta-icp-template',
  })
  console.log(`  ✓ ${CTA_ID}`)

  await client.createOrReplace({
    _id: LANDING_ID,
    _type: 'landingPage',
    language: 'en',
    title: 'Homepage — ICP template',
    slug: { _type: 'slug', current: LANDING_SLUG },
    pageVariant: 'marketing-home',
    icpSegment: 'Template (duplicate per segment)',
    homepageContent,
    featureCards: featureCardReferences(featureCards.map((card) => card._id)),
    waitlistCta: {
      _type: 'reference',
      _ref: CTA_ID,
    },
    seo: {
      _type: 'seo',
      title: 'Salt | Proactive AI for Your Business — Join the Waitlist',
      description:
        'Salt is proactive AI for independent professionals — an AI ops assistant that shows you what matters, prepares your moves, and waits for your approval. Join the waitlist.',
    },
  })
  console.log(`  ✓ landing ${LANDING_SLUG} (${LANDING_ID})`)
  console.log('')
  console.log('Done. In Studio: Dynamic Content → Landing Pages → Homepage — ICP template')
  console.log('Duplicate that document for each ICP and edit copy.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
