import type { articleType } from "./blog-types";

export type BlogQuoteSlide = {
  article: articleType;
  quote: string;
};

function pickQuote(article: articleType): string {
  const takeaway = article.keyTakeaways?.find((item) => item.trim());
  if (takeaway) return takeaway;
  return article.description;
}

/** Hub quote carousel — pulls from Sanity key takeaways or excerpt. */
export function getBlogQuoteSlides(list: articleType[]): BlogQuoteSlide[] {
  const withQuotes = list
    .map((article) => {
      const quote = pickQuote(article);
      return quote.trim() ? { article, quote } : null;
    })
    .filter((slide): slide is BlogQuoteSlide => slide !== null);

  return withQuotes.slice(0, 7);
}
