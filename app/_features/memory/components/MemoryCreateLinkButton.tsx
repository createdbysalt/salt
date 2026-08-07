"use client";

import { useState } from "react";
import { Link } from "lucide-react";
import type { Connection } from "@/app/_lib/demo/people-demo-data";
import { cn } from "@repo/utils";
import { CreateLinkDialog } from "./CreateLinkDialog";

const VARIANT_CLASS = {
  hero: "inline-flex items-center gap-1.5 rounded-full border transition h-11 px-4 bg-white/10 hover:bg-white/15 backdrop-blur border-white/20 text-white",
  panel:
    "inline-flex items-center gap-1.5 rounded-full border transition h-9 px-3.5 bg-card hover:bg-muted/40 border-border/60 text-foreground text-sm font-medium whitespace-nowrap",
  dropdown:
    "relative flex w-full cursor-default items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-hidden select-none hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground",
} as const;

type MemoryCreateLinkButtonProps = {
  recordKind: "person" | "org" | "work" | "billing" | "meeting" | "file";
  recordId: string;
  recordName: string;
  existingConnections: Connection[];
  onLink: (connection: Connection) => void;
  variant?: keyof typeof VARIANT_CLASS;
  className?: string;
};

export function MemoryCreateLinkButton({
  recordKind,
  recordId,
  recordName,
  existingConnections,
  onLink,
  variant = "hero",
  className,
}: MemoryCreateLinkButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        title="Connect a person, organization, or work item in memory"
        onClick={() => setOpen(true)}
        className={cn(VARIANT_CLASS[variant], className)}
      >
        <Link
          className={cn(
            "shrink-0",
            variant === "dropdown" ? "size-4 text-muted-foreground" : "size-3.5"
          )}
          strokeWidth={variant === "dropdown" ? 1.75 : 2.25}
        />
        Create connection
      </button>

      <CreateLinkDialog
        open={open}
        onOpenChange={setOpen}
        recordKind={recordKind}
        recordId={recordId}
        recordName={recordName}
        existingConnections={existingConnections}
        onLink={(connection) => {
          onLink(connection);
          setOpen(false);
        }}
      />
    </>
  );
}
