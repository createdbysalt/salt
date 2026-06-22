import { getMemoryWorkItems } from "@/app/_features/work/queries";
import { WorkMemoryPage } from "@/app/_features/work/components/WorkMemoryPage";

export default async function WorkRoute() {
  const workItems = await getMemoryWorkItems();
  return <WorkMemoryPage initialWorkItems={workItems} />;
}
