import config from "@/config";
import { getSEOTags } from "@/app/_lib/seo";
import { LearnSiteChrome } from "@/app/_features/marketing/components/LearnSiteChrome";
import CardArticle from "./_assets/components/CardArticle";
import CardCategory from "./_assets/components/CardCategory";
import { articles, categories } from "./_assets/content";

export const metadata = getSEOTags({
  title: `${config.appName} Learn | Proactive AI for Independent Professionals`,
  description:
    "Learn how to run your independent practice like a studio. Pricing, client qualification, scope management, and how Salt's proactive AI helps you grow.",
  canonicalUrlRelative: "/learn",
});

const byNewest = (a: { publishedAt: string }, b: { publishedAt: string }) =>
  new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();

export default function LearnIndexPage() {
  const latest = [...articles].sort(byNewest).slice(0, 50);

  return (
    <LearnSiteChrome>
      <header className="mx-auto mb-20 mt-12 max-w-xl text-center">
        <h1 className="mb-5 text-3xl font-extrabold tracking-tight lg:text-5xl">
          {config.appName} Learn
        </h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          Practical advice for independent professionals running their own practice.
          Pricing, clients, scope, and how Salt helps you grow.
        </p>
      </header>

      <section aria-label="Latest articles" className="mb-24 grid gap-8 lg:grid-cols-2">
        {latest.map((article, index) => (
          <CardArticle key={article.slug} article={article} isImagePriority={index < 3} />
        ))}
      </section>

      <section aria-labelledby="learn-topics">
        <h2 id="learn-topics" className="mb-8 text-center text-2xl font-bold tracking-tight lg:text-4xl">
          Browse by topic
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => (
            <CardCategory key={category.slug} category={category} tag="h3" />
          ))}
        </div>
      </section>
    </LearnSiteChrome>
  );
}
