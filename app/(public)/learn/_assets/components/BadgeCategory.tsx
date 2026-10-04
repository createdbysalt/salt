import Link from "next/link";
import type { categoryType } from "../content";

/** Small category pill used on cards and article headers. */
export default function BadgeCategory({
  category,
  extraStyle = "",
}: {
  category: categoryType;
  extraStyle?: string;
}) {
  return (
    <Link
      href={`/learn/category/${category.slug}`}
      rel="tag"
      title={`Posts in ${category.title}`}
      className={`inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-medium transition-colors hover:bg-primary hover:text-primary-foreground ${extraStyle}`}
    >
      {category.titleShort ?? category.title}
    </Link>
  );
}
