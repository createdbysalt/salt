import { Suspense } from "react";
import { FilesPage } from "@/app/_features/files/components/FilesPage";
import { getWorkspaceFiles } from "@/app/_features/files/queries";

export default async function FilesRoute() {
  const files = await getWorkspaceFiles();

  return (
    <Suspense fallback={null}>
      <FilesPage initialFiles={files} />
    </Suspense>
  );
}
