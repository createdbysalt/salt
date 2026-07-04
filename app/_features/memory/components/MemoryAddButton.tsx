"use client";

import { Loader2, Plus } from "lucide-react";
import { cn } from "@repo/utils";

type MemoryAddButtonProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pending?: boolean;
  className?: string;
};

export function MemoryAddButton({
  label,
  onClick,
  disabled = false,
  pending = false,
  className,
}: MemoryAddButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" strokeWidth={2.5} />
      ) : (
        <Plus className="size-4" strokeWidth={2.5} />
      )}
      {label}
    </button>
  );
}
