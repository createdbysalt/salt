import { getStudioContext } from "@/app/_lib/utils/user-dashboard";
import { getIntakesForStudio } from "@/app/_features/intake/queries";
import { IntakesPageClient } from "./IntakesPageClient";

export const dynamic = "force-dynamic";

export default async function IntakesPage() {
  const { studio } = await getStudioContext();

  // Fetch all intakes for this studio
  const intakes = await getIntakesForStudio(studio.id);

  return <IntakesPageClient intakes={intakes} />;
}
