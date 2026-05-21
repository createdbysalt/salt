# 🌐 Marketing Site & Public Pages

**Context:** You are building public-facing marketing pages for Salt SaaS.
**Goal:** High-performance, SEO-optimized, conversion-focused pages.

---

## 1. 🎯 Page Types & Performance Strategy

### Route Structure
```
app/page.tsx                    # Landing page (homepage)
app/(public)/
├── pricing/page.tsx            # Pricing & plans
├── blog/                       # Content marketing
│   ├── [articleId]/page.tsx    # Individual blog posts
│   ├── category/[categoryId]/  # Blog categories
│   └── author/[authorId]/      # Author pages
├── signin/page.tsx            # Authentication
├── privacy-policy/page.tsx    # Legal
└── tos/page.tsx              # Terms of service
```

### Performance Requirements
| Page Type | Strategy | Reason |
|-----------|----------|--------|
| **Landing Page** | `generateStaticParams` + ISR | Critical first impression, needs speed |
| **Pricing** | Static Generation | Rarely changes, needs fast loading |
| **Blog Posts** | Static with `revalidate: 3600` | SEO content, occasional updates |
| **Legal Pages** | Static Generation | Rarely change, compliance focused |
| **Sign-in** | Server-Side Rendering | Dynamic auth states |

---

## 2. 📊 SEO & Performance Patterns

### Meta Tags Template
```typescript
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page Title | Salt - Studio Operating System',
  description: 'Concise, keyword-rich description under 160 characters',
  keywords: 'studio management, client portal, design agency, freelancer tools',

  // Open Graph
  openGraph: {
    title: 'Page Title | Salt',
    description: 'Description for social sharing',
    url: 'https://usesalt.io/page-path',
    siteName: 'Salt',
    images: [
      {
        url: 'https://usesalt.io/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Salt - Studio Operating System'
      }
    ],
    locale: 'en_US',
    type: 'website'
  },

  // Twitter
  twitter: {
    card: 'summary_large_image',
    title: 'Page Title | Salt',
    description: 'Twitter-specific description',
    images: ['https://usesalt.io/twitter-image.png']
  },

  // Technical SEO
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  alternates: {
    canonical: 'https://usesalt.io/page-path'
  }
}
```

### Page Speed Optimization
```typescript
import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// ✅ Lazy load non-critical components
const TestimonialsSection = dynamic(
  () => import('@/app/_features/marketing/components/Testimonials11'),
  {
    loading: () => <TestimonialsSkeleton />,
    ssr: false  // Only if not critical for SEO
  }
)

// ✅ Use Suspense for data loading
export default function PricingPage() {
  return (
    <div>
      {/* Critical above-the-fold content renders immediately */}
      <HeroSection />
      <PricingTiers />

      {/* Non-critical content loads progressively */}
      <Suspense fallback={<FeaturesSkeleton />}>
        <FeaturesSection />
      </Suspense>

      {/* Heavy components load last */}
      <TestimonialsSection />
    </div>
  )
}
```

---

## 3. 🎨 Marketing Component Patterns

### Hero Section Structure
```typescript
interface HeroSectionProps {
  headline: string
  subheadline: string
  primaryCTA: {
    text: string
    href: string
    variant: 'primary' | 'secondary'
  }
  secondaryCTA?: {
    text: string
    href: string
  }
  socialProof?: {
    logos: string[]
    testimonialQuote?: string
  }
}

export function HeroSection({
  headline,
  subheadline,
  primaryCTA,
  secondaryCTA,
  socialProof
}: HeroSectionProps) {
  return (
    <section className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Headlines */}
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            {headline}
          </h1>
          <p className="mt-6 text-lg leading-8 text-neutral-600">
            {subheadline}
          </p>
        </div>

        {/* CTAs */}
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <ButtonGradient href={primaryCTA.href}>
            {primaryCTA.text}
          </ButtonGradient>
          {secondaryCTA && (
            <Button variant="ghost" href={secondaryCTA.href}>
              {secondaryCTA.text}
            </Button>
          )}
        </div>

        {/* Social Proof */}
        {socialProof && (
          <div className="mt-16">
            <SocialProofLogos logos={socialProof.logos} />
            {socialProof.testimonialQuote && (
              <TestimonialQuote quote={socialProof.testimonialQuote} />
            )}
          </div>
        )}
      </div>
    </section>
  )
}
```

### Pricing Section Pattern
```typescript
interface PricingTier {
  name: string
  price: {
    monthly: number
    yearly: number
  }
  description: string
  features: string[]
  cta: {
    text: string
    href: string
  }
  popular?: boolean
}

export function PricingSection({ tiers }: { tiers: PricingTier[] }) {
  const [isYearly, setIsYearly] = useState(false)

  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <BillingToggle
            isYearly={isYearly}
            onToggle={setIsYearly}
          />
        </div>

        {/* Pricing Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {tiers.map((tier, index) => (
            <PricingCard
              key={tier.name}
              tier={tier}
              isYearly={isYearly}
              popular={tier.popular}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
```

---

## 4. 📝 Content Management Patterns

### Blog System Architecture
```typescript
// Blog post metadata
interface BlogPost {
  slug: string
  title: string
  description: string
  publishedAt: string
  updatedAt?: string
  author: {
    name: string
    avatar: string
    bio: string
  }
  category: {
    name: string
    slug: string
    color: string
  }
  tags: string[]
  readingTime: number
  featured: boolean
  seoImage: string
}

// Static generation for blog posts
export async function generateStaticParams() {
  const posts = await getBlogPosts()

  return posts.map((post) => ({
    articleId: post.slug
  }))
}

// Blog post page with SEO
export async function generateMetadata({
  params
}: {
  params: { articleId: string }
}): Promise<Metadata> {
  const post = await getBlogPost(params.articleId)

  return {
    title: `${post.title} | Salt Blog`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author.name],
      images: [post.seoImage]
    }
  }
}
```

### Content Revalidation Strategy
```typescript
// app/(public)/blog/[articleId]/page.tsx
export const revalidate = 3600 // 1 hour

export default async function BlogPostPage({
  params
}: {
  params: { articleId: string }
}) {
  const post = await getBlogPost(params.articleId)

  if (!post) {
    notFound()
  }

  return (
    <article>
      <BlogPostHeader post={post} />
      <BlogPostContent content={post.content} />
      <BlogPostFooter post={post} />
    </article>
  )
}
```

---

## 5. 🔗 Navigation & Layout Patterns

### Public Layout Structure
```typescript
export default function PublicLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <PublicHeader />
      <main className="min-h-screen">
        {children}
      </main>
      <PublicFooter />
    </>
  )
}

function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md">
      <nav className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Logo />
          <DesktopNavigation />
          <MobileNavigationToggle />
          <AuthButtons />
        </div>
      </nav>
    </header>
  )
}
```

### Navigation Menu Data
```typescript
const publicNavigation = [
  {
    name: 'Features',
    href: '/#features',
    description: 'Discover what Salt can do'
  },
  {
    name: 'Pricing',
    href: '/pricing',
    description: 'Simple, transparent pricing'
  },
  {
    name: 'Blog',
    href: '/blog',
    description: 'Tips and insights for studios'
  },
  {
    name: 'Docs',
    href: '/docs',
    description: 'Learn how to use Salt'
  }
] as const
```

---

## 6. 🚀 Conversion Optimization

### CTA Button Patterns
```typescript
interface CTAButtonProps {
  variant: 'primary' | 'secondary' | 'ghost'
  size: 'sm' | 'md' | 'lg'
  href: string
  children: React.ReactNode
  trackingEvent?: string
}

export function CTAButton({
  variant,
  size,
  href,
  children,
  trackingEvent
}: CTAButtonProps) {
  const handleClick = () => {
    if (trackingEvent) {
      // Track conversion events
      analytics.track(trackingEvent, {
        buttonText: children,
        location: 'hero-section'
      })
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      href={href}
      onClick={handleClick}
    >
      {children}
    </Button>
  )
}
```

### A/B Testing Setup
```typescript
// Use feature flags for A/B testing
interface HeroVariantProps {
  variant: 'control' | 'test-a' | 'test-b'
}

export function HeroSection({ variant }: HeroVariantProps) {
  const content = getHeroContent(variant)

  // Track variant exposure
  useEffect(() => {
    analytics.track('hero_variant_viewed', { variant })
  }, [variant])

  return (
    <section>
      <h1>{content.headline}</h1>
      <p>{content.subheadline}</p>
      <CTAButton trackingEvent="hero_cta_clicked">
        {content.ctaText}
      </CTAButton>
    </section>
  )
}
```

---

## 7. 🎭 Content Sections Library

### Common Marketing Sections
```typescript
// Re-export all marketing components for easy access
export { HeroSection } from '@/app/_features/marketing/components/Hero'
export { FeaturesSection } from '@/app/_features/marketing/components/Features'
export { TestimonialsSection } from '@/app/_features/marketing/components/Testimonials'
export { PricingSection } from '@/app/_features/marketing/components/Pricing'
export { FAQSection } from '@/app/_features/marketing/components/FAQ'
export { CTASection } from '@/app/_features/marketing/components/CTA'
export { SocialProofSection } from '@/app/_features/marketing/components/SocialProof'
```

### Landing Page Assembly Pattern
```typescript
import {
  HeroSection,
  SocialProofSection,
  FeaturesSection,
  TestimonialsSection,
  PricingSection,
  FAQSection,
  CTASection
} from '@/app/_features/marketing/components'

export default function HomePage() {
  return (
    <>
      <HeroSection
        headline="Turn capable individuals into high-leverage studios"
        subheadline="Salt is the operating system for designers and developers who want to build studios, not stay freelancers."
        primaryCTA={{ text: "Start Free Trial", href: "/signup" }}
        secondaryCTA={{ text: "Watch Demo", href: "/demo" }}
      />

      <SocialProofSection />

      <FeaturesSection />

      <TestimonialsSection />

      <PricingSection />

      <FAQSection />

      <CTASection />
    </>
  )
}
```

---

## 8. 📈 Analytics & Tracking

### Event Tracking Pattern
```typescript
interface AnalyticsEvent {
  event: string
  properties?: Record<string, any>
  userId?: string
  timestamp?: Date
}

export function trackEvent(event: AnalyticsEvent) {
  // Implementation depends on your analytics provider
  if (typeof window !== 'undefined') {
    // Client-side tracking
    window.analytics?.track(event.event, event.properties)
  }
}

// Usage in components
function PricingCard({ tier }: { tier: PricingTier }) {
  const handleCTAClick = () => {
    trackEvent({
      event: 'pricing_cta_clicked',
      properties: {
        planName: tier.name,
        planPrice: tier.price.monthly,
        location: 'pricing_page'
      }
    })
  }

  return (
    <div>
      <h3>{tier.name}</h3>
      <p>${tier.price.monthly}/month</p>
      <Button onClick={handleCTAClick}>
        Get Started
      </Button>
    </div>
  )
}
```

---

## 9. 🔍 SEO Technical Requirements

### Structured Data
```typescript
export function generateStructuredData(page: 'homepage' | 'pricing' | 'blog') {
  const baseData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Salt",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "29",
      "priceCurrency": "USD"
    }
  }

  if (page === 'blog') {
    return {
      "@context": "https://schema.org",
      "@type": "Blog",
      "name": "Salt Blog",
      "description": "Tips and insights for studio owners and freelancers"
    }
  }

  return baseData
}

// SAFE: Use JSON.stringify for structured data injection
export default function HomePage() {
  const structuredData = generateStructuredData('homepage')

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        // Safe because JSON.stringify escapes all HTML/JS
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData)
        }}
      />
      <HeroSection />
      {/* ... rest of page */}
    </>
  )
}
```

### Sitemap Generation
```typescript
// app/sitemap.ts
export default async function sitemap() {
  const baseUrl = 'https://usesalt.io'

  const routes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1.0
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8
    }
  ]

  // Dynamic blog posts
  const posts = await getBlogPosts()
  const blogRoutes = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt || post.publishedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6
  }))

  return [...routes, ...blogRoutes]
}
```

---

## 10. ⚡ Performance Checklist

Before deploying marketing pages:

- [ ] **Core Web Vitals**: LCP < 2.5s, FID < 100ms, CLS < 0.1
- [ ] **Image Optimization**: All images use `next/image` with proper sizing
- [ ] **Font Loading**: Use `next/font` with `display: swap`
- [ ] **Critical CSS**: Above-the-fold styles are inlined
- [ ] **JavaScript**: Non-critical components are lazy loaded
- [ ] **Caching**: Appropriate `revalidate` values set
- [ ] **Meta Tags**: All pages have proper SEO metadata
- [ ] **Structured Data**: JSON-LD markup for rich snippets
- [ ] **Analytics**: Conversion tracking is implemented
- [ ] **Mobile**: Responsive design tested on all breakpoints

**Remember:** Marketing pages are your first impression. They must be fast, accessible, and conversion-optimized.