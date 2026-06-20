import { resolveBlogArticles } from "@/app/_features/marketing/blog/blog-article-data";
import { getCategoryRouteSlug } from "@/app/_features/marketing/blog/blog-category-config";
import {
  getBlogArticleHref,
  getBlogArticleMarkdownHref,
  getBlogCategoryHref,
  getBlogHubHref,
} from "@/app/_features/marketing/blog/blog-paths";
import { SALT_MARKETING_URL } from "@/app/_lib/seo/social-links";

/**
 * Extended blog catalog for answer engines — full article metadata.
 */
export async function buildSaltLlmFullContent(): Promise<string> {
  const articles = await resolveBlogArticles();
  const lines = [
    "# Salt Blog — Full Catalog",
    "",
    `Hub: ${SALT_MARKETING_URL}${getBlogHubHref()}`,
    `Articles: ${articles.length}`,
    "",
  ];

  for (const article of articles) {
    const url = `${SALT_MARKETING_URL}${getBlogArticleHref(article.slug)}`;
    const mdUrl = `${SALT_MARKETING_URL}${getBlogArticleMarkdownHref(article.slug)}`;
    const category = article.categories[0];
    const categoryRoute = category
      ? getCategoryRouteSlug(category.slug)
      : null;
    const categoryUrl = categoryRoute
      ? `${SALT_MARKETING_URL}${getBlogCategoryHref(categoryRoute)}`
      : null;

    lines.push(`## ${article.title}`);
    lines.push(`Slug: ${article.slug}`);
    lines.push(`URL: ${url}`);
    lines.push(`Markdown: ${mdUrl}`);
    lines.push(`Published: ${article.publishedAt}`);
    if (article.updatedAt) lines.push(`Updated: ${article.updatedAt}`);
    lines.push(`Author: ${article.author.name}`);
    if (category) {
      lines.push(
        `Category: ${category.titleShort ?? category.title}${categoryUrl ? ` (${categoryUrl})` : ""}`
      );
    }
    lines.push(`Summary: ${article.description}`);
    if (article.keyTakeaways?.length) {
      lines.push("Key takeaways:");
      for (const item of article.keyTakeaways) {
        lines.push(`- ${item}`);
      }
    }
    if (article.relatedSlugs?.length) {
      lines.push(`Related: ${article.relatedSlugs.join(", ")}`);
    }
    lines.push("");
  }

  lines.push("---", "", `Generated for ${SALT_MARKETING_URL}`, "");

  return lines.join("\n");
}
