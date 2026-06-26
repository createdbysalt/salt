"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { memoryListShellClass } from "@/app/_features/memory/utils/memory-layout";
import { findMemoryFileInList } from "../mapper";
import type { MemoryFile } from "../data";
import { FilesDirectoryTable } from "./FilesDirectoryTable";
import { openAskSalt } from "../utils/open-ask-salt";

type FilesPageProps = {
  initialFiles: MemoryFile[];
};

export function FilesPage({ initialFiles }: FilesPageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const previewParam = searchParams.get("preview");
  const previewId =
    previewParam && findMemoryFileInList(initialFiles, previewParam) ? previewParam : null;

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

      <div className={memoryListShellClass}>
        <PlaysSectionHeader
          eyebrow="Memory"
          title="Files"
          description="Every document, link, photo, video, email, and transcript — linked to the people, orgs, and work they belong to. Ask Salt to add anything."
          action={
            <button
              type="button"
              onClick={() =>
                openAskSalt({
                  prompt: "Save this file or link to the right person, org, or work item.",
                })
              }
              className="surface-aurora relative inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-lift)] transition-transform hover:-translate-y-0.5"
            >
              <Sparkles className="relative z-10 size-4" strokeWidth={2.5} />
              <span className="relative z-10">Ask Salt to add</span>
            </button>
          }
        />

        <FilesDirectoryTable
          files={initialFiles}
          previewId={previewId}
          onPreviewChange={setPreview}
        />
      </div>
    </div>
  );
}
