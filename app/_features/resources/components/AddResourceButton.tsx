"use client";

import { useState } from "react";
import { Link as LinkIcon, Plus } from "lucide-react";
import { Button } from "@repo/ui";
import { AddResourceDialog } from "./AddResourceDialog";

type AddResourceButtonProps = {
  entityType?: "person" | "org" | "work" | "billing" | "meeting" | "note" | "space";
  entityId?: string;
  entityName?: string;
  onAdded?: (resourceId: string) => void;
  variant?: "default" | "panel";
};

export function AddResourceButton({
  entityType,
  entityId,
  entityName,
  onAdded,
  variant = "default",
}: AddResourceButtonProps) {
  const [open, setOpen] = useState(false);

  if (variant === "panel") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-foreground/80 transition hover:border-foreground/30 hover:text-foreground"
        >
          <LinkIcon className="size-3.5" strokeWidth={2} />
          Add Resource
        </button>
        <AddResourceDialog
          open={open}
          onOpenChange={setOpen}
          entityType={entityType}
          entityId={entityId}
          entityName={entityName}
          onAdded={onAdded}
        />
      </>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 size-4" />
        Add Resource
      </Button>
      <AddResourceDialog
        open={open}
        onOpenChange={setOpen}
        entityType={entityType}
        entityId={entityId}
        entityName={entityName}
        onAdded={onAdded}
      />
    </>
  );
}
