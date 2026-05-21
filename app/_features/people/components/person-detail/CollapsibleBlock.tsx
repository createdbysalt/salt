"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@repo/utils";

export function CollapsibleBlock({
  title,
  defaultOpen = true,
  action,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <section className="border-b border-border py-4 last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <ChevronRight
            className={cn(
              "size-3.5 transition-transform",
              isOpen && "rotate-90"
            )}
          />
          {title}
        </span>
        {action ? (
          <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            {action}
          </span>
        ) : null}
      </button>
      {isOpen ? <div className="mt-3 space-y-2">{children}</div> : null}
    </section>
  );
}
