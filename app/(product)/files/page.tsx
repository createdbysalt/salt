import { Suspense } from "react";
import { FilesPage } from "@/app/_features/files/components/FilesPage";

export default function FilesRoute() {
  return (
    <Suspense fallback={null}>
      <FilesPage />
    </Suspense>
  );
}
