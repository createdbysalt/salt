import { Suspense } from "react";
import { notFound } from "next/navigation";
import { findPerson } from "@/app/_lib/demo/people-demo-data";
import { isMockContentEnabledForUser } from "@/app/_lib/demo/mock-content.server";
import { PersonDetailPage } from "@/app/_features/people/components/PersonDetailPage";

export default async function PersonDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const mockContent = await isMockContentEnabledForUser();
  const person = mockContent ? findPerson(id) : null;
  if (!person) notFound();
  return (
    <Suspense fallback={null}>
      <PersonDetailPage personId={id} />
    </Suspense>
  );
}
