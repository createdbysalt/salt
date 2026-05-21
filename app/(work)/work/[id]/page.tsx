import { notFound } from "next/navigation";
import { MOCK_PROJECTS } from "@/app/_lib/demo";
import { WorkDetailPage } from "@/app/_features/work/components/WorkDetailPage";

export default async function WorkDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = MOCK_PROJECTS.find((item) => item.id === id);
  if (!project) notFound();
  return <WorkDetailPage projectId={id} />;
}
