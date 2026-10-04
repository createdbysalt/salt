import Image from "next/image";
import Link from "next/link";
import type { articleType } from "../content";

/** Author chip: small avatar plus name, linking to the author's page. */
export default function Avatar({ article }: { article: articleType }) {
  const { author } = article;
  return (
    <Link
      href={`/learn/author/${author.slug}`}
      rel="author"
      className="group inline-flex items-center gap-2 text-sm"
    >
      <Image
        src={author.avatar}
        alt=""
        width={28}
        height={28}
        className="h-7 w-7 rounded-full object-cover"
      />
      <span className="group-hover:underline" itemProp="author">
        {author.name}
      </span>
    </Link>
  );
}
