"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@repo/utils";

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  action?: React.ReactNode;
  /** Icon to display before the title */
  icon?: React.ReactNode;
}

export function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
  action,
  icon,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="py-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2.5 text-left hover:bg-muted/30 rounded-md transition-colors -mx-4"
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground/70 transition-transform duration-200",
              isOpen && "rotate-90"
            )}
          />
          {icon && (
            <span className="text-muted-foreground/70">{icon}</span>
          )}
          <span className="text-[13px] font-medium text-muted-foreground">{title}</span>
        </div>
        {action && (
          <div onClick={(e) => e.stopPropagation()}>
            {action}
          </div>
        )}
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-out",
          isOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="pt-1 pb-2">
          {children}
        </div>
      </div>
    </div>
  );
}
