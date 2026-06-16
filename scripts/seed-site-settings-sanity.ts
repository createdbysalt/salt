/**
 * Seed Sanity global elements — Settings → Global Elements.
 *
 * Usage:
 *   op run --env-file=.env.1password -- pnpm content:seed-site-settings
 */
import { createClient } from '@sanity/client'
import { readFileSync } from 'node:fs'
import { SALT_SOCIAL } from '../app/_lib/seo/social-links'
import { SITE_SETTINGS_DOC_ID } from '../app/_features/marketing/site-settings-fallback'

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
  console.error('Usage: op run --env-file=.env.1password -- pnpm content:seed-site-settings')
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
  console.log(`Seeding global elements to ${PROJECT_ID}/${DATASET}…`)

  await client.createOrReplace({
    _id: SITE_SETTINGS_DOC_ID,
    _type: 'siteSettings',
    language: 'en',
    title: 'Salt',
    description:
      'Proactive AI for your business — connects your tools, surfaces what matters, waits for your approval.',
    ctaButton: {
      _type: 'link',
      text: 'Join the waitlist',
      linkType: 'internal',
      href: '/waitlist?source=homepage-nav',
    },
    footerNavigation: [
      {
        _type: 'link',
        _key: 'product',
        text: 'Product',
        linkType: 'internal',
        href: '#product',
      },
      {
        _type: 'link',
        _key: 'compare',
        text: 'Compare',
        linkType: 'internal',
        href: '/compare',
      },
      {
        _type: 'link',
        _key: 'money-on-the-table',
        text: 'Money-on-the-table test',
        linkType: 'internal',
        href: '/money-on-the-table',
      },
      {
        _type: 'link',
        _key: 'learn',
        text: 'Learn',
        linkType: 'internal',
        href: '/learn',
      },
      {
        _type: 'link',
        _key: 'early-access',
        text: 'Early access',
        linkType: 'internal',
        href: '/waitlist?source=homepage-footer',
      },
    ],
    legalNavigation: [
      {
        _type: 'link',
        _key: 'privacy',
        text: 'Privacy',
        linkType: 'internal',
        href: '/privacy-policy',
      },
      {
        _type: 'link',
        _key: 'terms',
        text: 'Terms',
        linkType: 'internal',
        href: '/terms-of-use',
      },
      {
        _type: 'link',
        _key: 'early-access-terms',
        text: 'Early Access Terms',
        linkType: 'internal',
        href: '/early-access',
      },
      {
        _type: 'link',
        _key: 'cookies',
        text: 'Cookies',
        linkType: 'internal',
        href: '/cookie-policy',
      },
    ],
    supportEmail: 'support@usesalt.io',
    llmInfoLink: {
      _type: 'link',
      text: 'Learn about us',
      linkType: 'internal',
      href: '/llm-info',
    },
    copyrightHolder: 'Simcoe House Inc.',
    social: {
      twitter: SALT_SOCIAL.x,
      linkedin: SALT_SOCIAL.linkedin,
      instagram: SALT_SOCIAL.instagram,
      reddit: SALT_SOCIAL.reddit,
      youtube: SALT_SOCIAL.youtube,
      github: SALT_SOCIAL.github,
    },
  })

  console.log(`  ✓ ${SITE_SETTINGS_DOC_ID}`)
  console.log('Done.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
