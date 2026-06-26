import { TrashPage } from "@/app/_features/memory/components/TrashPage";
import { getArchivedItems, getTrashItems } from "@/app/_features/memory/queries/trash";
import { isMemoryEntityType } from "@/app/_features/memory/types/trash";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";

export default async function TrashRoute({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string }>;
}) {
  const { entity } = await searchParams;
  const initialEntityFilter = isMemoryEntityType(entity) ? entity : undefined;

  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);

  const [archivedItems, trashItems] = await Promise.all([
    getArchivedItems(workspace.id),
    getTrashItems(workspace.id),
  ]);

  return (
    <TrashPage
      archivedItems={archivedItems}
      trashItems={trashItems}
      initialEntityFilter={initialEntityFilter}
    />
  );
}
