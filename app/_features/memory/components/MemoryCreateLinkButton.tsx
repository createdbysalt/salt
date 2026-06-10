"use client";

import { useState } from "react";
import { Network } from "lucide-react";
import type { Connection } from "@/app/_lib/demo/people-demo-data";
import { cn } from "@repo/utils";
import { CreateLinkDialog } from "./CreateLinkDialog";

type MemoryCreateLinkButtonProps = {
  recordKind: "person" | "org" | "work";
  recordId: string;
  recordName: string;
  existingConnections: Connection[];
  onLink: (connection: Connection) => void;
  className?: string;
};

export function MemoryCreateLinkButton({
  recordKind,
  recordId,
  recordName,
  existingConnections,
  onLink,
  className,
}: MemoryCreateLinkButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        title="Connect a person, organization, or work item in memory"
        onClick={() => setOpen(true)}
        className={cn(
          "h-11 px-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/15 backdrop-blur border border-white/20 text-sm font-medium text-white transition",
          className
        )}
      >
        <Network className="size-3.5 shrink-0" strokeWidth={2.25} />
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
