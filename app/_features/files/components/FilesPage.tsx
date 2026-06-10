"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { findMemoryFile } from "../data";
import { FilesDirectoryTable } from "./FilesDirectoryTable";

export function FilesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const previewParam = searchParams.get("preview");
  const previewId = previewParam && findMemoryFile(previewParam) ? previewParam : null;

  const setPreview = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("preview", id);
    else params.delete("preview");
    const qs = params.toString();
    router.replace(qs ? `/files?${qs}` : "/files", { scroll: false });
  };

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className="mx-auto w-full max-w-[1400px] space-y-8">
        <PlaysSectionHeader
          eyebrow="Memory"
          title="Files"
          description="Every document, link, photo, video, email, and transcript — linked to the people, orgs, and work they belong to. Ask Salt to add anything."
          action={
            <button
              type="button"
              onClick={() =>
                toast("Try: 'Save this Figma link to Acme' or 'Add the kickoff recording to Project X'")
              }
              className="surface-aurora relative inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-lift)] transition-transform hover:-translate-y-0.5"
            >
              <Sparkles className="relative z-10 size-4" strokeWidth={2.5} />
              <span className="relative z-10">Ask Salt to add</span>
            </button>
          }
        />

        <FilesDirectoryTable previewId={previewId} onPreviewChange={setPreview} />
      </div>
    </div>
  );
}
