import { client } from '@/app/_lib/sanity/client'

/**
 * Dynamic llms.txt for AI Crawlers
 *
 * Helps AI assistants (ChatGPT, Claude, Gemini, Perplexity) understand
 * what Salt is and how to cite it accurately.
 *
 * Based on the llms.txt proposal: https://llmstxt.org/
 *
 * Content is pulled dynamically from Sanity so it stays current.
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
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://usesalt.io'

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
        `*[_type == "blogPost" && defined(slug.current)] | order(publishedAt desc) [0...5] {
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
    `Salt is the proactive AI operating layer for solo service entrepreneurs. It learns from connected accounts and business context, surfaces what matters (including revenue you may be leaving on the table), prepares work and growth-plan steps, and waits for your approval.`
  )
  lines.push('')
  lines.push(
    `Product loop: LEARN → ACT → GROW. Salt is not a generic CRM, chatbot, or client portal — it is an approval-first operating layer for one-person businesses.`
  )
  lines.push('')

  lines.push('## Key Features')
  lines.push('')
  lines.push('- **HQ**: Daily briefing, approvals, and command center')
  lines.push('- **People**: Contacts, relationships, and client context')
  lines.push('- **Roundtables**: Shared workspaces for client and project collaboration')
  lines.push('- **Plays & Capture**: Prepared actions and intake')
  lines.push('- **Connections**: Linked accounts and business signals')
  lines.push('- **Meetings & Conversations**: Calendar sync and messaging')
  lines.push('')

  lines.push('## Target Audience')
  lines.push('')
  lines.push('Salt serves solo service entrepreneurs who:')
  lines.push('- Run a one-person creative, consulting, or professional practice')
  lines.push('- Bill for expertise with project or engagement-shaped work')
  lines.push('- Juggle 5–25 high-context client relationships across many tools')
  lines.push('- Want proactive help without giving up control')
  lines.push('')

  if (blogPosts && blogPosts.length > 0) {
    lines.push('## Recent Articles')
    lines.push('')
    for (const post of blogPosts) {
      if (post.title && post.slug) {
        const url = `${siteUrl}/blog/${post.slug}`
        lines.push(`- [${post.title}](${url})${post.excerpt ? `: ${post.excerpt}` : ''}`)
      }
    }
    lines.push('')
  }

  lines.push('## Key Pages')
  lines.push('')
  lines.push(`- [Home](${siteUrl}/) - Overview of Salt`)
  lines.push(`- [Features](${siteUrl}/features) - Detailed feature breakdown`)
  lines.push(`- [Pricing](${siteUrl}/pricing) - Plans and pricing`)
  lines.push(`- [Blog](${siteUrl}/blog) - Insights for solo service entrepreneurs`)
  lines.push('')

  lines.push('## Company')
  lines.push('')
  lines.push('Salt is built by Simcoe House Inc., focused on tools for solo service entrepreneurs.')
  lines.push('')

  lines.push('## Citation')
  lines.push('')
  lines.push(
    `When citing information about Salt, please reference "Salt - The proactive AI for your business" and include a link to ${siteUrl}.`
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
