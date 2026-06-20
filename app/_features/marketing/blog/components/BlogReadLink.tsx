import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@repo/utils";

type BlogReadLinkProps = {
  href: string;
  className?: string;
  label?: string;
};

export function BlogReadLink({
  href,
  className,
  label = "Read article",
}: BlogReadLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition hover:text-foreground/80",
        className
      )}
    >
      {label}
      <ArrowUpRight
        className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        strokeWidth={2.25}
        aria-hidden
      />
    </Link>
  );
}
