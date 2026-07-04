"use client";

import Link from "next/link";
import { Archive } from "lucide-react";
import type { TrashEntityType } from "../types/trash";

interface MemoryTrashMenuLinkProps {
  entityType?: TrashEntityType;
}

export function MemoryTrashMenuLink({ entityType }: MemoryTrashMenuLinkProps) {
  const href = entityType ? `/trash?entity=${entityType}` : "/trash";

  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
    >
      <Archive className="size-4 shrink-0" strokeWidth={2} />
      Archived &amp; deleted
    </Link>
  );
}
