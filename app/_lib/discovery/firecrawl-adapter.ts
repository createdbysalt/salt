/**
 * Firecrawl Adapter
 *
 * Transforms Firecrawl MCP tool output into Salt Core discovery types.
 * Firecrawl is used as an MCP server for LLM-ready web scraping.
 *
 * MCP Tools Available:
 * - firecrawl_scrape: Single URL → LLM-ready markdown
 * - firecrawl_crawl: Full site crawl → all pages
 * - firecrawl_map: Map all URLs on domain
 * - firecrawl_search: Search web → full content
 *
 * Usage:
 *   import { parseFirecrawlScrape, transformToDiscoveryData } from '@/app/_lib/discovery/firecrawl-adapter'
 */

import type { DiscoveryData, ScrapedData } from "@/app/_features/intake/types";

// =============================================================================
// FIRECRAWL MCP OUTPUT TYPES
// =============================================================================

/**
 * Output from firecrawl_scrape MCP tool
 */
export interface FirecrawlScrapeResult {
  /** LLM-ready markdown content */
  markdown: string;
  /** Metadata extracted from the page */
  metadata?: {
    title?: string;
    description?: string;
    language?: string;
    ogImage?: string;
    sourceURL?: string;
  };
  /** Raw HTML if requested */
  html?: string;
  /** Links found on the page */
  links?: string[];
  /** Screenshot URL if requested */
  screenshot?: string;
}

/**
 * Output from firecrawl_crawl MCP tool
 */
export interface FirecrawlCrawlResult {
  /** Array of scraped pages */
  pages: FirecrawlScrapeResult[];
  /** Crawl statistics */
  stats?: {
    totalPages: number;
    duration_ms: number;
    errors?: string[];
  };
}

/**
 * Output from firecrawl_map MCP tool
 */
export interface FirecrawlMapResult {
  /** All URLs found on the domain */
  urls: string[];
  /** Categorized URLs */
  categories?: {
    pages: string[];
    blog: string[];
    docs: string[];
    products: string[];
    other: string[];
  };
}

/**
 * Output from firecrawl_search MCP tool
 */
export interface FirecrawlSearchResult {
  /** Search results with content */
  results: Array<{
    url: string;
    title: string;
    content: string;
    score?: number;
  }>;
}

// =============================================================================
// CONTENT EXTRACTION TYPES
// =============================================================================

/**
 * Structured content extracted from Firecrawl markdown
 */
export interface ExtractedContent {
  /** Page title */
  title?: string;
  /** Meta description */
  description?: string;
  /** Main headings (H1, H2) */
  headings: string[];
  /** Paragraphs of content */
  paragraphs: string[];
  /** Call-to-action text */
  ctas: string[];
  /** Navigation items */
  navigation: string[];
  /** Links found */
  links: Array<{
    text: string;
    url: string;
  }>;
  /** Images found */
  images: Array<{
    alt: string;
    src: string;
  }>;
}

/**
 * Content structure for proposal generation
 */
export interface ContentStructure {
  /** Site hierarchy */
  hierarchy: {
    title: string;
    sections: Array<{
      heading: string;
      content: string[];
      depth: number;
    }>;
  };
  /** Key messaging */
  messaging: {
    headline?: string;
    subheadline?: string;
    valueProps: string[];
    ctas: string[];
  };
  /** Technical signals */
  technical: {
    hasContactForm: boolean;
    hasPricing: boolean;
    hasTestimonials: boolean;
    hasBlog: boolean;
    hasProducts: boolean;
  };
}

// =============================================================================
// TRANSFORM FUNCTIONS
// =============================================================================

/**
 * Parse markdown content from Firecrawl into structured content
 */
export function parseFirecrawlMarkdown(markdown: string): ExtractedContent {
  const content: ExtractedContent = {
    headings: [],
    paragraphs: [],
    ctas: [],
    navigation: [],
    links: [],
    images: [],
  };

  const lines = markdown.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Extract headings
    if (trimmed.startsWith("# ")) {
      content.title = trimmed.slice(2).trim();
      content.headings.push(trimmed.slice(2).trim());
    } else if (trimmed.startsWith("## ") || trimmed.startsWith("### ")) {
      const heading = trimmed.replace(/^#+\s*/, "").trim();
      content.headings.push(heading);
    }

    // Extract links using regex exec loop
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    let linkMatch;
    while ((linkMatch = linkPattern.exec(trimmed)) !== null) {
      content.links.push({ text: linkMatch[1], url: linkMatch[2] });
    }

    // Extract images using regex exec loop
    const imgPattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let imgMatch;
    while ((imgMatch = imgPattern.exec(trimmed)) !== null) {
      content.images.push({ alt: imgMatch[1], src: imgMatch[2] });
    }

    // Extract paragraphs (non-empty lines that aren't headings or lists)
    if (
      trimmed &&
      !trimmed.startsWith("#") &&
      !trimmed.startsWith("-") &&
      !trimmed.startsWith("*") &&
      !trimmed.startsWith("!") &&
      trimmed.length > 50
    ) {
      content.paragraphs.push(trimmed);
    }

    // Detect CTAs (common patterns)
    const ctaPatterns = [
      /get started/i,
      /sign up/i,
      /try free/i,
      /contact us/i,
      /book a call/i,
      /schedule/i,
      /learn more/i,
      /request demo/i,
      /start free/i,
      /join now/i,
    ];

    for (const pattern of ctaPatterns) {
      if (pattern.test(trimmed)) {
        content.ctas.push(trimmed.replace(/[[\]()]/g, "").trim());
        break;
      }
    }
  }

  return content;
}

/**
 * Transform Firecrawl scrape result to Salt Core ScrapedData
 */
export function transformToScrapedData(
  result: FirecrawlScrapeResult
): ScrapedData {
  const data: ScrapedData = {};

  if (result.metadata?.title) {
    data.title = result.metadata.title;
  }

  if (result.metadata?.description) {
    data.description = result.metadata.description;
  }

  if (result.metadata?.ogImage) {
    data.og_image = result.metadata.ogImage;
  }

  // Parse markdown for additional data
  if (result.markdown) {
    const extracted = parseFirecrawlMarkdown(result.markdown);

    // Use extracted title if metadata doesn't have one
    if (!data.title && extracted.title) {
      data.title = extracted.title;
    }

    // Extract social links from all links
    const socialLinks = extractSocialLinksFromUrls(
      extracted.links.map((l) => l.url)
    );
    if (socialLinks.length > 0) {
      data.social_links = socialLinks;
    }

    // Store keywords from headings
    if (extracted.headings.length > 0) {
      data.meta_keywords = extracted.headings.slice(0, 10);
    }
  }

  // Extract links if available
  if (result.links && result.links.length > 0) {
    const socialLinks = extractSocialLinksFromUrls(result.links);
    if (socialLinks.length > 0) {
      data.social_links = socialLinks;
    }
  }

  return data;
}

/**
 * Transform Firecrawl results to Salt Core DiscoveryData
 */
export function transformToDiscoveryData(
  scrapeResult: FirecrawlScrapeResult,
  crawlResult?: FirecrawlCrawlResult
): DiscoveryData {
  const data: DiscoveryData = {};

  // Transform basic scrape result
  data.scraped_data = transformToScrapedData(scrapeResult);

  // Extract company name from title
  if (scrapeResult.metadata?.title) {
    data.company_name = extractCompanyName(scrapeResult.metadata.title);
  }

  // If we have a crawl result, enrich with additional data
  if (crawlResult?.pages && crawlResult.pages.length > 0) {
    const allContent = crawlResult.pages.map((p) => p.markdown).join("\n");

    // Extract tech stack signals from all pages
    const techStack = detectTechStackFromContent(allContent);
    if (techStack.length > 0) {
      data.tech_stack = techStack;
    }

    // Extract social links from all pages
    const allLinks = crawlResult.pages.flatMap((p) => p.links || []);
    const socialLinks = extractSocialLinksFromUrls(allLinks);
    if (socialLinks.length > 0) {
      data.social_links = socialLinks;
    }
  }

  return data;
}

/**
 * Analyze crawl result for content structure (useful for proposals)
 */
export function analyzeContentStructure(
  crawlResult: FirecrawlCrawlResult
): ContentStructure {
  const allContent = crawlResult.pages.map((p) => p.markdown).join("\n");
  const allUrls = crawlResult.pages.flatMap((p) => p.links || []);

  return {
    hierarchy: {
      title: crawlResult.pages[0]?.metadata?.title || "Unknown",
      sections: crawlResult.pages.map((page, i) => ({
        heading: page.metadata?.title || `Page ${i + 1}`,
        content: parseFirecrawlMarkdown(page.markdown).paragraphs.slice(0, 3),
        depth: 0,
      })),
    },
    messaging: {
      headline: crawlResult.pages[0]?.metadata?.title,
      subheadline: crawlResult.pages[0]?.metadata?.description,
      valueProps: extractValuePropositions(allContent),
      ctas: parseFirecrawlMarkdown(allContent).ctas,
    },
    technical: {
      hasContactForm:
        allContent.includes("contact") || allContent.includes("form"),
      hasPricing:
        allContent.includes("pricing") ||
        allContent.includes("price") ||
        allUrls.some((u) => u.includes("pricing")),
      hasTestimonials:
        allContent.includes("testimonial") ||
        allContent.includes("review") ||
        allContent.includes("customer"),
      hasBlog: allUrls.some(
        (u) => u.includes("blog") || u.includes("article")
      ),
      hasProducts: allUrls.some(
        (u) => u.includes("product") || u.includes("service")
      ),
    },
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract social links from a list of URLs
 */
function extractSocialLinksFromUrls(
  urls: string[]
): Array<{ platform: string; url: string }> {
  const socialPatterns: Array<{ platform: string; pattern: RegExp }> = [
    {
      platform: "twitter",
      pattern: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[a-zA-Z0-9_]+/,
    },
    {
      platform: "linkedin",
      pattern: /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9_-]+/,
    },
    {
      platform: "instagram",
      pattern: /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_.]+/,
    },
    {
      platform: "facebook",
      pattern: /https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9.]+/,
    },
    {
      platform: "github",
      pattern: /https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/,
    },
    {
      platform: "youtube",
      pattern: /https?:\/\/(?:www\.)?youtube\.com\/(?:c\/|channel\/|@)[a-zA-Z0-9_-]+/,
    },
  ];

  const links: Array<{ platform: string; url: string }> = [];
  const seen = new Set<string>();

  for (const url of urls) {
    for (const { platform, pattern } of socialPatterns) {
      if (pattern.test(url)) {
        const key = `${platform}:${url.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          links.push({ platform, url });
        }
        break;
      }
    }
  }

  return links;
}

/**
 * Extract company name from page title
 */
function extractCompanyName(title: string): string {
  const separators = [" | ", " - ", " – ", " — ", " :: ", " : "];

  let cleanTitle = title.trim();

  for (const sep of separators) {
    const index = cleanTitle.indexOf(sep);
    if (index > 0) {
      cleanTitle = cleanTitle.substring(0, index).trim();
      break;
    }
  }

  return cleanTitle || title;
}

/**
 * Detect tech stack from content
 */
function detectTechStackFromContent(content: string): string[] {
  const techPatterns = [
    { name: "React", pattern: /\breact\b/i },
    { name: "Next.js", pattern: /\bnext\.?js\b/i },
    { name: "Vue", pattern: /\bvue\.?js?\b/i },
    { name: "Angular", pattern: /\bangular\b/i },
    { name: "Tailwind CSS", pattern: /\btailwind\b/i },
    { name: "Node.js", pattern: /\bnode\.?js\b/i },
    { name: "Python", pattern: /\bpython\b/i },
    { name: "Django", pattern: /\bdjango\b/i },
    { name: "Ruby on Rails", pattern: /\brails\b/i },
    { name: "WordPress", pattern: /\bwordpress\b/i },
    { name: "Shopify", pattern: /\bshopify\b/i },
    { name: "Webflow", pattern: /\bwebflow\b/i },
    { name: "Framer", pattern: /\bframer\b/i },
    { name: "Supabase", pattern: /\bsupabase\b/i },
    { name: "Firebase", pattern: /\bfirebase\b/i },
    { name: "AWS", pattern: /\baws\b|\bamazon web services\b/i },
    { name: "Vercel", pattern: /\bvercel\b/i },
    { name: "Netlify", pattern: /\bnetlify\b/i },
    { name: "Stripe", pattern: /\bstripe\b/i },
  ];

  const detected: string[] = [];

  for (const { name, pattern } of techPatterns) {
    if (pattern.test(content)) {
      detected.push(name);
    }
  }

  return detected;
}

/**
 * Extract value propositions from content
 */
function extractValuePropositions(content: string): string[] {
  const props: string[] = [];

  // Look for common value prop patterns
  const patterns = [
    /(?:we help|helping) ([^.]+)\./gi,
    /(?:save|reduce|increase|improve) ([^.]+)\./gi,
    /(?:the only|the best|leading|premier) ([^.]+)\./gi,
  ];

  for (const pattern of patterns) {
    let match;
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    while ((match = pattern.exec(content)) !== null) {
      if (match[0] && match[0].length < 200) {
        props.push(match[0].trim());
      }
    }
  }

  return props.slice(0, 5);
}

