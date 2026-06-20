import config from "@/config";
import {
  getBlogArticleHref,
  getBlogArticleMarkdownHref,
} from "../blog-paths";

type BlogExploreWithAiProps = {
  slug: string;
  title: string;
};

const AI_PROVIDERS = [
  {
    label: "ChatGPT",
    buildUrl: (pageUrl: string) =>
      `https://chatgpt.com/?q=${encodeURIComponent(
        `Summarize this article in 5 bullet points and list 3 key takeaways: [${pageUrl}]`
      )}`,
  },
  {
    label: "Perplexity",
    buildUrl: (pageUrl: string) =>
      `https://www.perplexity.ai/search?q=${encodeURIComponent(
        `Summarize the key points from this article and cite specific details from it: [${pageUrl}]`
      )}`,
  },
  {
    label: "Claude",
    buildUrl: (pageUrl: string) =>
      `https://claude.ai/new?q=${encodeURIComponent(
        `Read this article and provide a clear summary plus the most important insights: [${pageUrl}]`
      )}`,
  },
  {
    label: "Google AI Mode",
    buildUrl: (pageUrl: string) =>
      `https://www.google.com/search?udm=50&aep=11&q=${encodeURIComponent(
        `Read this article and summarize the main insights and practical takeaways: [${pageUrl}]`
      )}`,
  },
  {
    label: "Grok",
    buildUrl: (pageUrl: string) =>
      `https://grok.com/?q=${encodeURIComponent(
        `Summarize this article and highlight the most important insights: [${pageUrl}]`
      )}`,
  },
] as const;

export function BlogExploreWithAi({ slug, title }: BlogExploreWithAiProps) {
  const markdownPath = getBlogArticleMarkdownHref(slug);
  const markdownUrl = `https://${config.domainName}${markdownPath}`;

  return (
    <aside
      className="blog-explore-ai"
      aria-label={`Explore ${title} with AI`}
    >
      <p className="blog-explore-ai__heading">Explore this content with AI:</p>
      <ul className="blog-explore-ai__providers">
        {AI_PROVIDERS.map((provider) => (
          <li key={provider.label}>
            <a
              href={provider.buildUrl(markdownUrl)}
              className="blog-explore-ai__pill"
              target="_blank"
              rel="noopener noreferrer"
            >
              {provider.label}
            </a>
          </li>
        ))}
      </ul>
      <p className="blog-explore-ai__source">
        Machine-readable source:{" "}
        <a href={markdownPath} className="break-all sm:break-normal">
          {markdownPath}
        </a>
      </p>
    </aside>
  );
}
