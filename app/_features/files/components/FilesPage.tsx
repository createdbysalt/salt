"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { AddResourceButton } from "@/app/_features/resources/components/AddResourceButton";
import { memoryListShellClass } from "@/app/_features/memory/utils/memory-layout";
import type { MemoryFile } from "../data";
import { FilesDirectoryTable } from "./FilesDirectoryTable";

type FilesPageProps = {
  initialFiles: MemoryFile[];
};

export function FilesPage({ initialFiles }: FilesPageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const previewParam = searchParams.get("preview");
  const previewId = previewParam;

  const setPreview = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("preview", id);
    else params.delete("preview");
    const qs = params.toString();
    router.replace(qs ? `/resources?${qs}` : "/resources", { scroll: false });
  };

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className={memoryListShellClass}>
        <PlaysSectionHeader
          eyebrow="Memory"
          title="Resources"
          description="Documents, external links, and live-watched repos — linked to the people, orgs, and work they belong to."
          action={<AddResourceButton />}
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
