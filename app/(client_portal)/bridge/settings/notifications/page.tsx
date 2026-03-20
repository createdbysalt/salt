import { redirect } from "next/navigation"
import { SidebarInset } from "@repo/ui"
import { getTenantContext } from "@/app/_lib/tenancy"
import { BridgeSettingsSidebar } from "../_components/BridgeSettingsSidebar"
import { BridgeSettingsPage } from "../_components/BridgeSettingsPage"

export const dynamic = "force-dynamic"

export default async function BridgeNotificationsPage() {
  const { context } = await getTenantContext()

  if (!context.userId) {
    redirect("/bridge/login")
  }

  return (
    <>
      <BridgeSettingsSidebar />
      <SidebarInset>
        <BridgeSettingsPage title="Notifications">
          <div className="text-muted-foreground">
            Notification preferences will go here
          </div>
        </BridgeSettingsPage>
      </SidebarInset>
    </>
  )
}
