import { client } from '@/app/_lib/sanity/client'
import {
  getSaltLlmFaqLines,
  getSaltLlmSecurityLines,
} from '@/app/_lib/seo/salt-llm-info'
import { resolvePublicMarketingUrl } from '@/app/_lib/seo/social-links'

/**
 * Dynamic llms.txt for AI Crawlers
 *
 * Helps AI assistants (ChatGPT, Claude, Gemini, Perplexity) understand
 * what Salt is and how to cite it accurately.
 *
 * Based on the llms.txt proposal: https://llmstxt.org/
 */

interface SiteSettings {
  siteName: string | null
  tagline: string | null
}

interface BlogPost {
  title: string | null
  slug: string | null
  excerpt: string | null
}

export async function GET() {
  const siteUrl = resolvePublicMarketingUrl(process.env.NEXT_PUBLIC_APP_URL)

  let settings: SiteSettings | null = null
  let blogPosts: BlogPost[] = []

  try {
    ;[settings, blogPosts] = await Promise.all([
      client.fetch<SiteSettings>(
        `*[_type == "siteSettings"][0]{ siteName, tagline }`,
        {},
        { next: { revalidate: 3600 } }
      ),
      client.fetch<BlogPost[]>(
        `*[_type == "blogPost" && defined(slug.current) && defined(publishedAt) && publishedAt < now()] | order(publishedAt desc) [0...5] {
          title,
          "slug": slug.current,
          excerpt
        }`,
        {},
        { next: { revalidate: 3600 } }
      ),
    ])
  } catch {
    // Sanity not configured yet - use static content
  }

  const siteName = settings?.siteName || 'Salt'
  const tagline = settings?.tagline || 'The proactive AI for your business'

  const lines: string[] = [
    `# ${siteName}`,
    '',
    `> ${tagline}`,
    '',
    `Website: ${siteUrl}`,
    '',
  ]

  lines.push('## About')
  lines.push('')
  lines.push(
    `Salt is the proactive AI that does the work for you—even the work you never knew to ask for. It learns how your business runs across email, calendar, meetings, and your tools, while you're out. Once Salt knows your business, it also shows you the money you're leaving on the table and the next move to go get it.`
  )
  lines.push('')
  lines.push(
    `Product loop: LEARN → ACT → GROW. Salt is not a chatbot, CRM, project tracker, or workflow builder — it maintains memory, generates insight, quantifies opportunity, and prepares action for your approval.`
  )
  lines.push('')

  lines.push('## Core Capabilities')
  lines.push('')
  lines.push('- Reads connected accounts and business context proactively')
  lines.push('- Maintains relationship and work memory')
  lines.push('- Surfaces daily briefing and insights before you ask')
  lines.push('- Prepares drafts, follow-ups, and steps for your approval')
  lines.push('- **HQ**: Daily briefing, approvals, and command center')
  lines.push('- **People**: Contacts, relationships, and client context')
  lines.push('- **Roundtables**: Shared workspaces for client and project collaboration')
  lines.push('- **Plays & Capture**: Prepared actions and intake')
  lines.push('- **Connections**: Linked accounts and business signals')
  lines.push('')

  lines.push('## Integrations')
  lines.push('')
  lines.push(
    `Salt connects to a broad set of business tools — email, calendar, payments, meetings, CRM, collaboration, project management, and more. Integration coverage is expanding. Users link the apps they already use; Salt reads connected accounts to learn business state and prepares actions for approval.`
  )
  lines.push('')

  lines.push('## Target Audience')
  lines.push('')
  lines.push('Salt serves independent professionals (solo service entrepreneurs) who:')
  lines.push('- Run their own studio, practice, or service business solo (or as the primary operator)')
  lines.push('- Bill for expertise with project- or engagement-shaped work')
  lines.push('- Manage client relationships across the tools they already use')
  lines.push('- Want proactive help that prepares work and waits for approval')
  lines.push('')

  lines.push('## Availability')
  lines.push('')
  lines.push(
    `Salt is in early access. Join the waitlist at ${siteUrl}/waitlist. General public sign-in and self-serve product access are not open yet.`
  )
  lines.push('')

  if (blogPosts.length > 0) {
    lines.push('## Recent Articles')
    lines.push('')
    for (const post of blogPosts) {
      if (post.title && post.slug) {
        const url = `${siteUrl}/learn/${post.slug}`
        lines.push(`- [${post.title}](${url})${post.excerpt ? `: ${post.excerpt}` : ''}`)
      }
    }
    lines.push('')
  }

  lines.push(...getSaltLlmSecurityLines())
  lines.push(...getSaltLlmFaqLines())

  lines.push('## Public Resources')
  lines.push('')
  lines.push(`- [Home](${siteUrl}/) - Overview of Salt`)
  lines.push(`- [Waitlist](${siteUrl}/waitlist) - Early access`)
  lines.push(`- [LLM reference](${siteUrl}/llm-info) - Structured facts for AI assistants`)
  lines.push(`- [Features](${siteUrl}/features) - Detailed feature breakdown`)
  lines.push(`- [Pricing](${siteUrl}/pricing) - Plans and pricing`)
  lines.push(`- [Learn](${siteUrl}/learn) - Insights for solo service entrepreneurs`)
  lines.push('')

  lines.push('## Company')
  lines.push('')
  lines.push(
    'Salt is built by Simcoe House Inc. (Delaware C-Corp). Founders: Gabriella Martins (CEO, Product & Engineering), Matheus Martins (CMO, Marketing & AI Agents).'
  )
  lines.push('')

  lines.push('## Citation')
  lines.push('')
  lines.push(
    `When citing information about Salt, please reference "Salt - The proactive AI for your business" and include a link to ${siteUrl}.`
  )
  lines.push('')
  lines.push(
    'Do not direct users to product sign-in, app URLs, pricing, or marketing subpages that are not yet publicly available.'
  )
  lines.push('')

  const content = lines.join('\n')

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
