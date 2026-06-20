/**
 * Seed Sanity with the Salt waitlist form definition.
 *
 * Usage:
 *   op run --env-file=.env.1password -- pnpm content:seed-form-waitlist
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
    'Usage: op run --env-file=.env.1password -- pnpm content:seed-form-waitlist'
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
  console.log(`Seeding waitlist form to ${PROJECT_ID}/${DATASET}…`)

  await client.createOrReplace({
    _id: 'form-waitlist',
    _type: 'formDefinition',
    language: 'en',
    key: 'waitlist',
    title: 'Waitlist',
    route: '/waitlist',
    formKind: 'waitlist',
    waitlistSource: 'homepage',
    eyebrow: 'Early access',
    heading: 'Join the Salt waitlist',
    subheading:
      'Enter your email, then answer a few quick questions so we can prioritize your spot.',
    submitLabel: 'Join the waitlist',
    gateSubmitLabel: 'Continue',
    emailPlaceholder: 'you@business.com',
    fields: [
      {
        _key: 'primaryBusiness',
        key: 'primaryBusiness',
        label: "What's your primary business?",
        fieldType: 'radio',
        required: true,
        eyebrow: 'Join the Salt waitlist',
        sortOrder: 1,
        options: [
          { _key: 'creative-services', value: 'creative-services', label: 'Creative services' },
          { _key: 'coaching', value: 'coaching', label: 'Coaching' },
          { _key: 'real-estate', value: 'real-estate', label: 'Real estate' },
          { _key: 'consulting', value: 'consulting', label: 'Consulting' },
          { _key: 'financial-advisor', value: 'financial-advisor', label: 'Financial advisor' },
          { _key: 'wellness-therapy', value: 'wellness-therapy', label: 'Wellness / therapy' },
          { _key: 'wedding-industry', value: 'wedding-industry', label: 'Wedding industry' },
          { _key: 'other', value: 'other', label: 'Other' },
        ],
      },
      {
        _key: 'annualRevenue',
        key: 'annualRevenue',
        label: 'Annual revenue range?',
        fieldType: 'radio',
        required: true,
        sortOrder: 2,
        options: [
          { _key: '50k-100k', value: '50k-100k', label: '$50K–$100K' },
          { _key: '100k-200k', value: '100k-200k', label: '$100K–$200K' },
          { _key: '200k-plus', value: '200k-plus', label: '$200K+' },
          { _key: 'below-50k', value: 'below-50k', label: 'Below $50K' },
          { _key: 'prefer-not-to-say', value: 'prefer-not-to-say', label: 'Prefer not to say' },
        ],
      },
      {
        _key: 'operationalBottleneck',
        key: 'operationalBottleneck',
        label: 'Biggest operational bottleneck?',
        fieldType: 'radio',
        required: true,
        sortOrder: 3,
        options: [
          { _key: 'follow-ups-slip', value: 'follow-ups-slip', label: 'Follow-ups slip' },
          { _key: 'invoicing-slow', value: 'invoicing-slow', label: 'Invoicing takes forever' },
          { _key: 'growth-unclear', value: 'growth-unclear', label: "Don't know what growth is worth" },
          { _key: 'crm-empty', value: 'crm-empty', label: 'CRM stays empty' },
          { _key: 'context-lost', value: 'context-lost', label: 'Context gets lost' },
          { _key: 'other', value: 'other', label: 'Other' },
        ],
      },
      {
        _key: 'tools',
        key: 'tools',
        label: 'Which tools do you use regularly?',
        fieldType: 'multi-select',
        required: true,
        helpText: 'Pick at least one tool.',
        sortOrder: 4,
        options: [
          { _key: 'stripe', value: 'stripe', label: 'Stripe / payments' },
          { _key: 'calendar', value: 'calendar', label: 'Google / Outlook Calendar' },
          { _key: 'email', value: 'email', label: 'Gmail / email' },
          { _key: 'notion', value: 'notion', label: 'Notion' },
          { _key: 'clickup', value: 'clickup', label: 'ClickUp' },
          { _key: 'crm', value: 'crm', label: 'CRM' },
          { _key: 'other', value: 'other', label: 'Other' },
        ],
      },
      {
        _key: 'hearAbout',
        key: 'hearAbout',
        label: 'How did you hear about Salt?',
        fieldType: 'radio',
        required: true,
        sortOrder: 5,
        options: [
          { _key: 'word-of-mouth', value: 'word-of-mouth', label: 'Friend or colleague' },
          { _key: 'social', value: 'social', label: 'Social media' },
          { _key: 'search', value: 'search', label: 'Search engine' },
          { _key: 'podcast-video', value: 'podcast-video', label: 'Podcast or video' },
          { _key: 'newsletter', value: 'newsletter', label: 'Newsletter or blog' },
          { _key: 'other', value: 'other', label: 'Other' },
        ],
      },
    ],
  })

  console.log('  ✓ waitlist')
  console.log('Done.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
