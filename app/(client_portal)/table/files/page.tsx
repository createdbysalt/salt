import { redirect } from "next/navigation";
import { SidebarInset } from "@repo/ui";

import { getTenantContext } from "@/app/_lib/tenancy";
import {
  getBridgeClientFiles,
  getBridgeUserInfo,
  getBridgeStudioInfo,
  getBridgeProjects,
  getStudioIdFromClient,
} from "@/app/_lib/table/queries";
import { BridgeSidebar } from "../components/table-sidebar";
import { BridgeHeader } from "../components/table-header";
import { TableFilesClient } from "./_components/TableFilesClient";

export const dynamic = "force-dynamic";

export default async function BridgeFilesPage() {
  const { context } = await getTenantContext();

  // Redirect to login if not authenticated
  if (!context.userId) {
    redirect("/table/login");
  }

  // Redirect to client select if no client context
  if (!context.client) {
    redirect("/table/select");
  }

  // Get files data
  const filesData = await getBridgeClientFiles(context.client.id);

  // Get user info for sidebar
  const userInfo = await getBridgeUserInfo(context.userId);

  // Get studio ID from client
  const studioId = await getStudioIdFromClient(context.client.id);

  // Get studio info and projects
  const studioInfo = studioId
    ? await getBridgeStudioInfo(studioId)
    : { name: "Studio", logoUrl: null };

  const projects = await getBridgeProjects(context.client.id);

  return (
    <>
      <BridgeSidebar
        variant="inset"
        user={userInfo}
        studio={studioInfo}
        projects={projects}
      />
      <SidebarInset>
        <BridgeHeader title="Files" />
        <main className="flex-1 p-4 lg:p-6">
          <TableFilesClient
            files={filesData.files}
            projects={filesData.projects}
            currentUserId={context.userId}
          />
        </main>
      </SidebarInset>
    </>
  );
}
