import { getClient } from './client'
import type {
  LandingPage,
  BlogPost,
  LegalPage,
  SiteSettings,
  Category,
  Author,
} from './types'

const landingPageFields = `
  _id,
  _type,
  title,
  slug,
  pageBuilder[] {
    _type,
    _key,
    ...,
    testimonials[]-> {
      _id,
      quote,
      authorName,
      authorTitle,
      authorCompany,
      authorImage
    }
  },
  seo
`

const blogPostFields = `
  _id,
  _type,
  title,
  slug,
  excerpt,
  body,
  publishedAt,
  author-> {
    _id,
    name,
    slug,
    bio,
    image
  },
  category-> {
    _id,
    title,
    slug
  },
  featuredImage,
  seo
`

const legalPageFields = `
  _id,
  _type,
  title,
  slug,
  body,
  lastUpdated,
  seo
`

export async function getLandingPage(
  slug: string,
  preview = false
): Promise<LandingPage | null> {
  const client = getClient(preview)
  return client.fetch(
    `*[_type == "landingPage" && slug.current == $slug][0] {
      ${landingPageFields}
    }`,
    { slug }
  )
}

export async function getHomePage(preview = false): Promise<LandingPage | null> {
  return getLandingPage('home', preview)
}

export async function getAllLandingPages(preview = false): Promise<LandingPage[]> {
  const client = getClient(preview)
  return client.fetch(
    `*[_type == "landingPage"] | order(title asc) {
      ${landingPageFields}
    }`
  )
}

export async function getBlogPost(
  slug: string,
  preview = false
): Promise<BlogPost | null> {
  const client = getClient(preview)
  return client.fetch(
    `*[_type == "blogPost" && slug.current == $slug][0] {
      ${blogPostFields}
    }`,
    { slug }
  )
}

export async function getAllBlogPosts(preview = false): Promise<BlogPost[]> {
  const client = getClient(preview)
  return client.fetch(
    `*[_type == "blogPost"] | order(publishedAt desc) {
      ${blogPostFields}
    }`
  )
}

export async function getBlogPostsByCategory(
  categorySlug: string,
  preview = false
): Promise<BlogPost[]> {
  const client = getClient(preview)
  return client.fetch(
    `*[_type == "blogPost" && category->slug.current == $categorySlug] | order(publishedAt desc) {
      ${blogPostFields}
    }`,
    { categorySlug }
  )
}

export async function getLegalPage(
  slug: string,
  preview = false
): Promise<LegalPage | null> {
  const client = getClient(preview)
  return client.fetch(
    `*[_type == "legalPage" && slug.current == $slug][0] {
      ${legalPageFields}
    }`,
    { slug }
  )
}

export async function getAllLegalPages(preview = false): Promise<LegalPage[]> {
  const client = getClient(preview)
  return client.fetch(
    `*[_type == "legalPage"] | order(title asc) {
      ${legalPageFields}
    }`
  )
}

export async function getSiteSettings(preview = false): Promise<SiteSettings | null> {
  const client = getClient(preview)
  return client.fetch(
    `*[_type == "siteSettings"][0] {
      _id,
      _type,
      siteName,
      tagline,
      logo,
      favicon,
      socialLinks,
      defaultSeo
    }`
  )
}

export async function getAllCategories(preview = false): Promise<Category[]> {
  const client = getClient(preview)
  return client.fetch(
    `*[_type == "category"] | order(title asc) {
      _id,
      _type,
      title,
      slug,
      description
    }`
  )
}

export async function getAllAuthors(preview = false): Promise<Author[]> {
  const client = getClient(preview)
  return client.fetch(
    `*[_type == "author"] | order(name asc) {
      _id,
      _type,
      name,
      slug,
      bio,
      image
    }`
  )
}

export async function getAuthor(
  slug: string,
  preview = false
): Promise<Author | null> {
  const client = getClient(preview)
  return client.fetch(
    `*[_type == "author" && slug.current == $slug][0] {
      _id,
      _type,
      name,
      slug,
      bio,
      image
    }`,
    { slug }
  )
}
