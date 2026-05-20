"use client";

import { PenLine } from "lucide-react";
import { AIButton } from "@repo/ui";
import { PageBanner } from "@repo/patterns";

export function NotesPage() {
  return (
    <div className="w-full px-16 py-8">
      <PageBanner
        size="hero"
        eyebrow="YOUR KNOWLEDGE"
        title="Notes"
        subtitle="Standalone ideas and thoughts that don't belong to a specific person, project, or team."
        fullWidthDivider
        actions={
          <AIButton size="sm">
            <PenLine className="size-3.5" />
            Add Note
          </AIButton>
        }
      />
    </div>
  );
}
