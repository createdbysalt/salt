import { getPeople } from "@/app/_features/relationships/queries";
import { PeoplePage } from "@/app/_features/people/components/PeoplePage";

export default async function PeopleRoute() {
  const people = await getPeople();
  return <PeoplePage initialPeople={people} />;
}
