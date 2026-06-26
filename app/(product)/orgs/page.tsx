import { Suspense } from "react";
import { getOrganizations } from "@/app/_features/relationships/queries";
import { OrgsPage } from "@/app/_features/orgs/components/OrgsPage";
import { MemoryListPageSkeleton } from "@/app/_features/memory/components/MemoryListPageSkeleton";

async function OrgsWithData() {
  const organizations = await getOrganizations();
  return <OrgsPage initialOrganizations={organizations} />;
}

export default function OrgsRoute() {
  return (
    <Suspense fallback={<MemoryListPageSkeleton />}>
      <OrgsWithData />
    </Suspense>
  );
}
