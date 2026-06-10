import { Suspense } from "react";
import { PersonDetailPage } from "@/app/_features/people/components/PersonDetailPage";

export default async function PersonDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <PersonDetailPage personId={id} />
    </Suspense>
  );
}
