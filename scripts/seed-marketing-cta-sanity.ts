/**
 * Seed Sanity with the homepage waitlist CTA (aurora block).
 *
 * Usage:
 *   op run --env-file=.env.1password -- pnpm content:seed-cta
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
  console.error('Usage: op run --env-file=.env.1password -- pnpm content:seed-cta')
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
  console.log(`Seeding homepage waitlist CTA to ${PROJECT_ID}/${DATASET}…`)

  try {
    await client.delete('cta-homepage-waitlist')
  } catch {
    // legacy doc may not exist
  }

  await client.createOrReplace({
    _id: 'cta-waitlist',
    _type: 'marketingCta',
    language: 'en',
    key: 'cta-waitlist',
    eyebrow: 'Early access',
    heading: 'Join the waitlist. Get in early.',
    subheading: 'First 200 customers lock in launch pricing — 2 months free on annual.',
    benefits: [
      'Founder access — direct input into product direction',
      "Launch pricing locked for as long as you're a customer",
    ],
    disclaimer: 'No countdown timers. No fake scarcity.',
    footerText:
      "Salt doesn't replace you. It amplifies you. The week you get back is yours.",
    waitlistSource: 'homepage-cta',
  })

  console.log('  ✓ cta-waitlist')
  console.log('Done.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
