import { notFound } from "next/navigation";
import { resolveBlogArticle } from "@/app/_features/marketing/blog/blog-article-data";
import { buildBlogArticleMarkdown } from "@/app/_lib/seo/blog-markdown-export";

export const revalidate = 3600;

export async function generateStaticParams() {
  const { resolveBlogArticleSlugs } = await import(
    "@/app/_features/marketing/blog/blog-article-data"
  );
  const slugs = await resolveBlogArticleSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const article = await resolveBlogArticle(slug);

  if (!article) {
    notFound();
  }

  const markdown = buildBlogArticleMarkdown(article);

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
