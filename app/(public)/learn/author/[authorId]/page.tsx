import Image from "next/image";
import { notFound } from "next/navigation";
import config from "@/config";
import { getSEOTags } from "@/app/_lib/seo";
import { LearnSiteChrome } from "@/app/_features/marketing/components/LearnSiteChrome";
import CardArticle from "../../_assets/components/CardArticle";
import { articles, authors } from "../../_assets/content";

type Params = Promise<{ authorId: string }>;

function findAuthor(slug: string) {
  return authors.find((author) => author.slug === slug);
}

export async function generateMetadata({ params }: { params: Params }) {
  const { authorId } = await params;
  const author = findAuthor(authorId);
  if (!author) {
    return getSEOTags({
      title: "Author Not Found",
      description: "The requested author could not be found.",
    });
  }
  return getSEOTags({
    title: `${author.name} | ${config.appName} Learn`,
    description: author.description,
    canonicalUrlRelative: `/learn/author/${author.slug}`,
  });
}

export default async function LearnAuthorPage({ params }: { params: Params }) {
  const { authorId } = await params;
  const author = findAuthor(authorId);
  if (!author) notFound();

  const byAuthor = articles
    .filter((article) => article.author.slug === author.slug)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return (
    <LearnSiteChrome>
      <section className="mx-auto mb-20 mt-12 grid max-w-3xl gap-8 md:grid-cols-[1fr_auto]">
        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Author</p>
          <h1 className="mb-2 text-3xl font-extrabold tracking-tight lg:text-5xl">{author.name}</h1>
          <p className="mb-6 font-medium md:text-lg">{author.job}</p>
          <p className="text-muted-foreground md:text-lg">{author.description}</p>
        </div>

        <div className="flex flex-col gap-4 max-md:order-first">
          <Image
            src={author.avatar}
            alt={author.name}
            width={256}
            height={256}
            priority
            className="w-48 rounded-2xl md:w-64"
          />
          {author.socials?.length ? (
            <ul className="flex gap-3">
              {author.socials.map((social) => (
                <li key={social.name}>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noreferrer"
                    title={`${author.name} on ${social.name}`}
                    className="inline-flex rounded-lg border border-border p-2 transition-colors hover:bg-muted"
                  >
                    {social.icon}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="by-author">
        <h2 id="by-author" className="mb-8 text-center text-2xl font-bold tracking-tight lg:text-4xl">
          Articles by {author.name}
        </h2>
        <div className="grid gap-8 lg:grid-cols-2">
          {byAuthor.map((article) => (
            <CardArticle key={article.slug} article={article} />
          ))}
        </div>
      </section>
    </LearnSiteChrome>
  );
}
