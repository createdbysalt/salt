import { redirect } from "next/navigation";

type SpaceDetailRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function SpaceDetailRoute({ params }: SpaceDetailRouteProps) {
  const { id } = await params;
  redirect(`/work/${id}`);
}
