import Image from "next/image";
import Link from "next/link";
import type { ResolvedBlogAuthor } from "./blog-author-data";
import { Landing2Container } from "@/app/_features/marketing/landing2/Landing2Container";
import { Landing2FooterServer } from "@/app/_features/marketing/landing2/Landing2FooterServer";
import { Landing2NavServer } from "@/app/_features/marketing/landing2/Landing2NavServer";
import { Landing2WaitlistSection } from "@/app/_features/marketing/landing2/Landing2WaitlistSection";
import "@/app/_features/marketing/landing2/landing2.css";
import type { articleType } from "./blog-utils";
import { getBlogHubHref } from "./blog-paths";
import { BlogBrowseArticleCard } from "./components/BlogBrowseArticleCard";

type BlogAuthorPageProps = {
  author: ResolvedBlogAuthor;
  articles: articleType[];
};

export function BlogAuthorPage({ author, articles }: BlogAuthorPageProps) {
  return (
    <div className="landing2-home">
      <main className="min-h-screen overflow-x-hidden bg-background">
        <Landing2NavServer />

        <section className="pb-12 sm:pb-16">
          <Landing2Container>
            <header className="pt-10 sm:pt-14 md:pt-16">
              <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
                <ol className="flex flex-wrap items-center gap-1.5">
                  <li>
                    <Link
                      href={getBlogHubHref()}
                      className="transition hover:text-foreground"
                    >
                      Blog
                    </Link>
                  </li>
                  <li aria-hidden className="text-foreground/30">
                    /
                  </li>
                  <li className="font-medium text-foreground">{author.name}</li>
                </ol>
              </nav>

              <div className="mt-8 grid gap-8 border-b border-foreground/10 pb-8 md:mt-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-10 lg:gap-16 lg:pb-10">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/12 bg-foreground/[0.04] px-3 py-1 text-xs font-medium uppercase tracking-wide text-foreground/65">
                    Author
                  </span>

                  <h1 className="mt-4 font-display text-4xl tracking-[-0.04em] sm:text-5xl lg:text-6xl">
                    {author.name}
                  </h1>

                  {author.job ? (
                    <p className="mt-3 text-base text-muted-foreground sm:text-lg">
                      {author.job}
                    </p>
                  ) : null}

                  {author.description ? (
                    <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {author.description}
                    </p>
                  ) : null}
                </div>

                <div className="shrink-0">
                  {author.avatar ? (
                    <Image
                      src={author.avatar}
                      alt={author.name}
                      width={192}
                      height={192}
                      className="size-36 rounded-2xl object-cover sm:size-44 lg:size-48"
                      priority
                    />
                  ) : null}
                </div>
              </div>
            </header>

            <section aria-labelledby="author-articles-heading" className="pt-10 sm:pt-12">
              <h2
                id="author-articles-heading"
                className="font-display text-xl tracking-[-0.03em] sm:text-2xl lg:text-3xl"
              >
                Articles by {author.name}
              </h2>

              {articles.length > 0 ? (
                <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 sm:mt-8 sm:grid-cols-2 sm:gap-y-10 lg:grid-cols-3 xl:grid-cols-4">
                  {articles.map((article) => (
                    <BlogBrowseArticleCard key={article.slug} article={article} />
                  ))}
                </div>
              ) : (
                <p className="mt-8 text-sm text-muted-foreground">
                  No published articles yet.
                </p>
              )}
            </section>
          </Landing2Container>
        </section>

        <Landing2WaitlistSection />

        <section className="pb-16 sm:pb-24">
          <Landing2Container>
            <Link
              href={getBlogHubHref()}
              className="text-sm font-medium text-muted-foreground underline underline-offset-4 transition hover:text-foreground"
            >
              ← Back to all articles
            </Link>
          </Landing2Container>
        </section>
      </main>
      <Landing2FooterServer />
    </div>
  );
}
