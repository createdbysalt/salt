import { Suspense } from "react";
import { getPeople } from "@/app/_features/relationships/queries";
import { PeoplePage } from "@/app/_features/people/components/PeoplePage";
import { MemoryListPageSkeleton } from "@/app/_features/memory/components/MemoryListPageSkeleton";

async function PeopleWithData() {
  const people = await getPeople();
  return <PeoplePage initialPeople={people} />;
}

export default function PeopleRoute() {
  return (
    <Suspense fallback={<MemoryListPageSkeleton />}>
      <PeopleWithData />
    </Suspense>
  );
}
