import { Suspense } from "react";
import { PersonDetailPage } from "@/app/_features/people/components/PersonDetailPage";
import {
  getPersonActivity,
  getPersonDetailSummary,
  getPersonProfileFields,
} from "@/app/_features/people/queries";

export default async function PersonDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [personSummary, profileFields, activity] = await Promise.all([
    getPersonDetailSummary(id),
    getPersonProfileFields(id),
    getPersonActivity(id),
  ]);

  return (
    <Suspense fallback={null}>
      <PersonDetailPage
        personId={id}
        personSummary={personSummary}
        profileFields={profileFields}
        activity={activity}
      />
    </Suspense>
  );
}
