import { Suspense } from "react";
import { notFound } from "next/navigation";
import { MOCK_PEOPLE } from "@/app/_lib/demo";
import { PersonDetailPage } from "@/app/_features/people/components/PersonDetailPage";

export default async function PersonDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const person = MOCK_PEOPLE.find((p) => p.id === id);
  if (!person) notFound();
  return (
    <Suspense fallback={null}>
      <PersonDetailPage personId={id} />
    </Suspense>
  );
}
