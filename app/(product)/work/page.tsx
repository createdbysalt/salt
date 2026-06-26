import { Suspense } from "react";
import { getMemoryWorkItems } from "@/app/_features/work/queries";
import { WorkMemoryPage } from "@/app/_features/work/components/WorkMemoryPage";
import { MemoryListPageSkeleton } from "@/app/_features/memory/components/MemoryListPageSkeleton";

async function WorkWithData() {
  const workItems = await getMemoryWorkItems();
  return <WorkMemoryPage initialWorkItems={workItems} />;
}

export default function WorkRoute() {
  return (
    <Suspense fallback={<MemoryListPageSkeleton />}>
      <WorkWithData />
    </Suspense>
  );
}
