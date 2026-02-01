"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@repo/utils";

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
  action,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-3 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              !isOpen && "-rotate-90"
            )}
          />
          <span className="text-sm font-medium">{title}</span>
        </div>
        {action && (
          <div onClick={(e) => e.stopPropagation()}>
            {action}
          </div>
        )}
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="pb-3 pl-6">
          {children}
        </div>
      </div>
    </div>
  );
}
