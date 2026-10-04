import Link from "next/link";
import type { JSX } from "react";
import type { categoryType } from "../content";

/** Category tile for the index and category pages. */
export default function CardCategory({
  category,
  tag = "h2",
}: {
  category: categoryType;
  tag?: keyof JSX.IntrinsicElements;
}) {
  const Heading = tag;
  return (
    <Link
      href={`/learn/category/${category.slug}`}
      rel="tag"
      className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/40"
    >
      <Heading className="font-medium md:text-lg">
        {category.titleShort ?? category.title}
      </Heading>
      {category.descriptionShort ? (
        <p className="mt-1 text-sm text-muted-foreground">
          {category.descriptionShort}
        </p>
      ) : null}
    </Link>
  );
}
