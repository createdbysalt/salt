import { Suspense } from "react";
import { OrgDetailPage } from "@/app/_features/orgs/components/OrgDetailPage";

export default async function OrgDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <OrgDetailPage orgId={id} />
    </Suspense>
  );
}
