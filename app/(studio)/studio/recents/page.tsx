import { RecentsPageClient } from "@/app/_features/shell/components/RecentsPageClient";

export const dynamic = "force-dynamic";

export default function StudioRecentsPage() {
  return <RecentsPageClient mode="studio" />;
}
