import { notFound } from "next/navigation";
import config from "@/config";
import { getSEOTags } from "@/app/_lib/seo";
import { LearnSiteChrome } from "@/app/_features/marketing/components/LearnSiteChrome";
import CardArticle from "../../_assets/components/CardArticle";
import CardCategory from "../../_assets/components/CardCategory";
import { articles, categories } from "../../_assets/content";

type Params = Promise<{ categoryId: string }>;

function findCategory(slug: string) {
  return categories.find((category) => category.slug === slug);
}

export async function generateMetadata({ params }: { params: Params }) {
  const { categoryId } = await params;
  const category = findCategory(categoryId);
  if (!category) {
    return getSEOTags({
      title: "Category Not Found",
      description: "The requested category could not be found.",
    });
  }
  return getSEOTags({
    title: `${category.title} | ${config.appName} Learn`,
    description: category.description,
    canonicalUrlRelative: `/learn/category/${category.slug}`,
  });
}

export default async function LearnCategoryPage({ params }: { params: Params }) {
  const { categoryId } = await params;
  const category = findCategory(categoryId);
  if (!category) notFound();

  const inCategory = articles
    .filter((article) => article.categories.some((c) => c.slug === category.slug))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  const otherCategories = categories.filter((c) => c.slug !== category.slug);

  return (
    <LearnSiteChrome>
      <header className="mx-auto mb-20 mt-12 max-w-3xl text-center">
        <h1 className="mb-5 text-3xl font-extrabold tracking-tight lg:text-5xl">{category.title}</h1>
        <p className="mx-auto max-w-xl text-muted-foreground md:text-lg">{category.description}</p>
      </header>

      <section aria-label={`Articles in ${category.title}`} className="mb-24">
        {inCategory.length === 0 ? (
          <p className="text-center text-muted-foreground">No articles in this topic yet.</p>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            {inCategory.map((article) => (
              <CardArticle key={article.slug} article={article} tag="h2" showCategory={false} />
            ))}
          </div>
        )}
      </section>

      {otherCategories.length > 0 ? (
        <section aria-labelledby="other-topics">
          <h2 id="other-topics" className="mb-8 text-center text-2xl font-bold tracking-tight lg:text-4xl">
            More topics
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {otherCategories.map((c) => (
              <CardCategory key={c.slug} category={c} tag="h3" />
            ))}
          </div>
        </section>
      ) : null}
    </LearnSiteChrome>
  );
}
