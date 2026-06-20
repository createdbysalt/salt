import Image from "next/image";
import Link from "next/link";
import type { CompareUserReviewsConfig } from "../types";

type CompareUserReviewsSectionProps = {
  reviews: CompareUserReviewsConfig;
};

export function CompareUserReviewsSection({ reviews }: CompareUserReviewsSectionProps) {
  if (reviews.highlights.length === 0) {
    return null;
  }

  const g2MediaUrl = reviews.g2ProductUrl ?? reviews.g2ReviewsUrl;
  const hasPlatformMedia =
    reviews.platformScreenshots !== undefined && reviews.platformScreenshots.length > 0;

  return (
    <section
      className="compare-user-reviews min-w-0 rounded-2xl bg-foreground/[0.03] px-5 py-8 sm:rounded-3xl sm:px-8 sm:py-12 lg:px-10 lg:py-14"
      aria-labelledby="compare-user-reviews-heading"
    >
      <div className="space-y-2">
        <h2
          id="compare-user-reviews-heading"
          className="text-balance font-display text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl"
        >
          What {reviews.competitorName} users say
        </h2>
        <p>
          <Link
            href={reviews.g2ReviewsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-foreground underline underline-offset-[3px] transition hover:text-foreground/80 sm:text-[15px]"
          >
            Read more reviews on G2
          </Link>
        </p>
      </div>

      <ul className="mt-8 grid list-none gap-4 p-0 sm:grid-cols-2 lg:mt-10 lg:grid-cols-3 lg:gap-6">
        {reviews.highlights.map((highlight) => (
          <li
            key={highlight.title}
            className="rounded-2xl border border-foreground/10 bg-background px-5 py-5 sm:px-6 sm:py-6"
          >
            <h3 className="text-base font-semibold leading-snug text-foreground sm:text-[17px]">
              {highlight.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px] sm:leading-[1.65]">
              {highlight.body}
            </p>
          </li>
        ))}
      </ul>

      {hasPlatformMedia ? (
        <div className="mt-10 space-y-4 lg:mt-12">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              {reviews.competitorName} platform
            </h3>
            {reviews.platformScreenshotsCaption ? (
              <p className="text-sm text-muted-foreground sm:text-[15px]">
                {reviews.platformScreenshotsCaption}{" "}
                <Link
                  href={g2MediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground underline underline-offset-[3px] transition hover:text-foreground/80"
                >
                  View on G2
                </Link>
              </p>
            ) : null}
          </div>

          <ul className="grid list-none gap-3 p-0 sm:grid-cols-2 sm:gap-4 lg:gap-5">
            {reviews.platformScreenshots?.map((shot) => (
              <li
                key={shot.src}
                className="overflow-hidden rounded-2xl border border-foreground/10 bg-background"
              >
                <Image
                  src={shot.src}
                  alt={shot.alt}
                  width={3314}
                  height={1756}
                  className="h-auto w-full"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
