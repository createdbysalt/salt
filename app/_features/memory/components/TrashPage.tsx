"use client";

import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import type { MemoryEntityType, MemoryTrashItem } from "../types/trash";
import { TrashDirectoryTable } from "./TrashDirectoryTable";

interface TrashPageProps {
  archivedItems: MemoryTrashItem[];
  trashItems: MemoryTrashItem[];
  initialEntityFilter?: MemoryEntityType;
}

export function TrashPage({
  archivedItems,
  trashItems,
  initialEntityFilter,
}: TrashPageProps) {
  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className="mx-auto w-full max-w-[1400px] space-y-8">
        <PlaysSectionHeader
          eyebrow="Trash"
          title="Archived & deleted"
          description="Archived items are kept until you restore them. Deleted items are permanently removed after 30 days."
        />

        <TrashDirectoryTable
          archivedItems={archivedItems}
          trashItems={trashItems}
          initialEntityFilter={initialEntityFilter}
        />
      </div>
    </div>
  );
}
