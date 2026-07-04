"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@repo/ui";
import { cn } from "@repo/utils";

/** Icon-only filter trigger — shared by Connections, Notes, and Activity tabs. */
export const memoryRecordFilterIconButtonClass =
  "relative inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-card text-foreground/80 transition hover:border-border";

/** Panel CTA on record detail tabs (Create connection, Add note, etc.). */
export const memoryRecordPanelActionClass =
  "inline-flex items-center gap-1.5 rounded-full border transition h-9 px-3.5 bg-card hover:bg-muted/40 border-border/60 text-foreground text-sm font-medium";

type MemoryRecordTabHeaderProps = {
  title: string;
  action?: ReactNode;
};

export function MemoryRecordTabHeader({ title, action }: MemoryRecordTabHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-display text-2xl tracking-tight text-foreground">{title}</h2>
      {action}
    </header>
  );
}

type MemoryRecordTabSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
};

export function MemoryRecordTabSearch({
  value,
  onChange,
  placeholder,
  className,
}: MemoryRecordTabSearchProps) {
  return (
    <div className={cn("relative min-w-[180px] flex-1 sm:max-w-md", className)}>
      <Search
        className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        strokeWidth={2}
      />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 rounded-full border-border/60 bg-card pl-9"
      />
    </div>
  );
}

type MemoryRecordTabToolbarProps = {
  title: string;
  action?: ReactNode;
  showToolbar?: boolean;
  toolbar?: ReactNode;
};

/** Header row + optional search/filter row — used on all memory record detail tabs. */
export function MemoryRecordTabToolbar({
  title,
  action,
  showToolbar = true,
  toolbar,
}: MemoryRecordTabToolbarProps) {
  return (
    <div className="space-y-3">
      <MemoryRecordTabHeader title={title} action={action} />
      {showToolbar && toolbar ? toolbar : null}
    </div>
  );
}

type MemoryRecordTabShellProps = MemoryRecordTabToolbarProps & {
  children: ReactNode;
};

export function MemoryRecordTabShell({
  title,
  action,
  showToolbar = true,
  toolbar,
  children,
}: MemoryRecordTabShellProps) {
  return (
    <div className="space-y-4">
      <MemoryRecordTabToolbar
        title={title}
        action={action}
        showToolbar={showToolbar}
        toolbar={toolbar}
      />
      {children}
    </div>
  );
}
