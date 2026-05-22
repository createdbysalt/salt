import { redirect } from "next/navigation";

interface LegacyTableDetailRouteProps {
  params: Promise<{ id: string }>;
}

export default async function LegacyTableDetailRoute({ params }: LegacyTableDetailRouteProps) {
  const { id } = await params;

  redirect(`/roundtables/${id}`);
}
