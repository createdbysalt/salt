import { Suspense } from "react";
import { notFound } from "next/navigation";
import { findOrg } from "@/app/_lib/demo/orgs-demo-data";
import { isMockContentEnabledForUser } from "@/app/_lib/demo/mock-content.server";
import { OrgDetailPage } from "@/app/_features/orgs/components/OrgDetailPage";

export default async function OrgDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const mockContent = await isMockContentEnabledForUser();
  const org = mockContent ? findOrg(id) : null;
  if (!org) notFound();
  return (
    <Suspense fallback={null}>
      <OrgDetailPage orgId={id} />
    </Suspense>
  );
}
