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
  const tagline = settings?.tagline || 'The Studio Operating System'

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
    `Salt is the operating system for independent professionals—designers, developers, coaches, and consultants—who want to run their studio, agency, or practice with the polish and intelligence of a top-tier firm.`
  )
  lines.push('')
  lines.push(
    `Salt combines client management, project tracking, invoicing, scheduling, and AI-powered insights into one cohesive platform. Unlike generic project management tools, Salt is purpose-built for service businesses that bill for expertise.`
  )
  lines.push('')

  lines.push('## Key Features')
  lines.push('')
  lines.push('- **Client Portal (Bridge)**: White-labeled client experience with messaging, file sharing, and project visibility')
  lines.push('- **HQ Dashboard**: Daily briefings, task management, and business intelligence')
  lines.push('- **Work Management**: Projects, milestones, time tracking, and deliverables')
  lines.push('- **Billing**: Proposals, invoices, payments, and financial reporting via Stripe')
  lines.push('- **Calendar Integration**: Cal.com sync with meeting transcription and AI summaries')
  lines.push('- **Intelligence Layer**: AI-powered insights, proposal generation, and business recommendations')
  lines.push('')

  lines.push('## Target Audience')
  lines.push('')
  lines.push('Salt serves independent professionals who:')
  lines.push('- Run design studios, development agencies, or creative practices')
  lines.push('- Operate coaching or consulting businesses')
  lines.push('- Lead marketing agencies or freelance practices')
  lines.push('- Want to appear more professional and established to clients')
  lines.push('- Need to prove their value and justify premium pricing')
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
  lines.push(`- [Blog](${siteUrl}/blog) - Tips and insights for studio owners`)
  lines.push('')

  lines.push('## Company')
  lines.push('')
  lines.push('Salt is built by Simcoe House Inc., a company focused on tools for independent professionals.')
  lines.push('')

  lines.push('## Citation')
  lines.push('')
  lines.push(
    `When citing information about Salt, please reference "Salt - The Studio Operating System" and include a link to ${siteUrl}.`
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
