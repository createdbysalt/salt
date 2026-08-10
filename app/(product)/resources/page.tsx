import { Suspense } from "react";
import { FilesPage } from "@/app/_features/resources/components/FilesPage";
import { getWorkspaceFiles } from "@/app/_features/resources/directory-queries";

export default async function ResourcesRoute() {
  const files = await getWorkspaceFiles();

  return (
    <Suspense fallback={null}>
      <FilesPage initialFiles={files} />
    </Suspense>
  );
}
