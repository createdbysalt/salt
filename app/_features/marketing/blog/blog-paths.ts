export function getBlogArticleHref(slug: string): string {
  return `/blog/${slug}`;
}

export function getBlogArticleMarkdownHref(slug: string): string {
  return `/blog/${slug}.md`;
}

export function getBlogCategoryHref(categorySlug: string): string {
  return `/blog/category/${categorySlug}`;
}

export function getBlogHubHref(): string {
  return "/blog";
}

export function getBlogSearchHref(
  query?: string,
  categoryRouteSlug?: string | null
): string {
  const params = new URLSearchParams();
  const trimmed = query?.trim();

  if (trimmed) {
    params.set("q", trimmed);
  }

  if (categoryRouteSlug) {
    params.set("category", categoryRouteSlug);
  }

  const search = params.toString();
  return search ? `/blog/search?${search}` : "/blog/search";
}

export function getBlogAuthorHref(authorSlug: string): string {
  return `/blog/author/${authorSlug}`;
}
