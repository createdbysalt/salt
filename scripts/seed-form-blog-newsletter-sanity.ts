/**
 * Seed Sanity with the blog sidebar newsletter form definition.
 *
 * Usage:
 *   op run --env-file=.env.1password -- pnpm content:seed-form-blog-newsletter
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
  console.error(
    'Usage: op run --env-file=.env.1password -- pnpm content:seed-form-blog-newsletter'
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

async function main() {
  console.log(`Seeding blog newsletter form to ${PROJECT_ID}/${DATASET}…`)

  await client.createOrReplace({
    _id: 'form-blog-newsletter',
    _type: 'formDefinition',
    language: 'en',
    key: 'blog-newsletter',
    title: 'Blog newsletter',
    route: '/blog',
    formKind: 'blog-newsletter',
    waitlistSource: 'blog-sidebar',
    analyticsEvent: 'blog_newsletter_success',
    heading: 'Unlock exclusive Salt content',
    subheading:
      'Subscribe for best practices, research, and product updates for solo service entrepreneurs.',
    submitLabel: 'Subscribe',
    emailPlaceholder: 'Enter your email',
    gateDisclaimer:
      "I'd like to receive marketing communications regarding Salt's products, services, and events. I understand I can unsubscribe at any time.",
    fields: [],
  })

  console.log('Done — form-blog-newsletter')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
