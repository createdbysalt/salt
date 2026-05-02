import { redirect } from "next/navigation"
import { SidebarInset } from "@repo/ui"
import { getTenantContext } from "@/app/_lib/tenancy"
import { TableSettingsSidebar } from "../_components/TableSettingsSidebar"
import { TableSettingsPage } from "../_components/TableSettingsPage"

export const dynamic = "force-dynamic"

export default async function BridgeSecurityPage() {
  const { context } = await getTenantContext()

  if (!context.userId) {
    redirect("/table/login")
  }

  return (
    <>
      <TableSettingsSidebar />
      <SidebarInset>
        <TableSettingsPage title="Security">
          <div className="text-muted-foreground">
            Security settings will go here
          </div>
        </TableSettingsPage>
      </SidebarInset>
    </>
  )
}
