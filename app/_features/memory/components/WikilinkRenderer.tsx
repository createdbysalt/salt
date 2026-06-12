"use client";

import { useMemo } from "react";
import Link from "next/link";
import { User2, Building2, Briefcase, Hash, FileText } from "lucide-react";
import { cn } from "@repo/utils";
import { extractWikilinks, type ResolvedEntity } from "@/app/_lib/notes";

type WikilinkRendererProps = {
  content: string;
  entities: ResolvedEntity[];
  className?: string;
};

const ENTITY_ICONS: Record<ResolvedEntity["type"], typeof User2> = {
  person: User2,
  org: Building2,
  work: Briefcase,
  space: Hash,
  note: FileText,
};

export function WikilinkRenderer({ content, entities, className }: WikilinkRendererProps) {
  const rendered = useMemo(() => {
    const links = extractWikilinks(content);
    if (links.length === 0) {
      return [{ type: "text" as const, value: content }];
    }

    const entityMap = new Map<string, ResolvedEntity>();
    for (const e of entities) {
      entityMap.set(e.name.toLowerCase(), e);
      if (e.slug) {
        entityMap.set(e.slug.toLowerCase(), e);
      }
    }

    const parts: Array<
      | { type: "text"; value: string }
      | { type: "link"; entity: ResolvedEntity | null; displayText: string; target: string }
    > = [];

    let lastIndex = 0;
    for (const link of links) {
      if (link.position.start > lastIndex) {
        parts.push({ type: "text", value: content.slice(lastIndex, link.position.start) });
      }

      const entity = entityMap.get(link.target.toLowerCase()) ?? null;
      parts.push({
        type: "link",
        entity,
        displayText: link.alias ?? link.target,
        target: link.target,
      });

      lastIndex = link.position.end;
    }

    if (lastIndex < content.length) {
      parts.push({ type: "text", value: content.slice(lastIndex) });
    }

    return parts;
  }, [content, entities]);

  return (
    <span className={className}>
      {rendered.map((part, i) => {
        if (part.type === "text") {
          return <span key={i}>{part.value}</span>;
        }

        if (part.entity) {
          const Icon = ENTITY_ICONS[part.entity.type];
          const href = `/${part.entity.type}s/${part.entity.slug ?? part.entity.id}`;

          return (
            <Link
              key={i}
              href={href}
              className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 -my-0.5 mx-0.5 rounded-md",
                "bg-accent/50 hover:bg-accent text-accent-foreground",
                "text-sm font-medium transition-colors"
              )}
            >
              <Icon className="size-3" strokeWidth={2} />
              <span>{part.displayText}</span>
            </Link>
          );
        }

        return (
          <span
            key={i}
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 -my-0.5 mx-0.5 rounded-md",
              "bg-muted/60 text-muted-foreground",
              "text-sm italic"
            )}
            title={`"${part.target}" not found`}
          >
            {part.displayText}
          </span>
        );
      })}
    </span>
  );
}
