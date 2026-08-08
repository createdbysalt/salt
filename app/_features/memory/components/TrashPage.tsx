"use client";

import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { memoryListShellClass } from "@/app/_features/memory/utils/memory-layout";
import type { TrashEntityType, MemoryTrashItem } from "../types/trash";
import { TrashDirectoryTable } from "./TrashDirectoryTable";

interface TrashPageProps {
  archivedItems: MemoryTrashItem[];
  trashItems: MemoryTrashItem[];
  initialEntityFilter?: TrashEntityType;
}

export function TrashPage({
  archivedItems,
  trashItems,
  initialEntityFilter,
}: TrashPageProps) {
  return (
    <div className="relative min-h-full">
      <div className={memoryListShellClass}>
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
