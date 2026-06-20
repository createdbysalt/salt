import type { MouseEvent } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@repo/utils";

interface SourceExternalLinkProps {
  href: string;
  label?: string;
  className?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}

export function SourceExternalLink({
  href,
  label = "Open in Gmail",
  className,
  onClick,
}: SourceExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-medium text-sky hover:text-sky/80 underline-offset-2 hover:underline",
        className
      )}
    >
      {label}
      <ExternalLink className="size-3" strokeWidth={2.25} />
    </a>
  );
}
