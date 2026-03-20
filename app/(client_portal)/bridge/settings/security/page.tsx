import { redirect } from "next/navigation"
import { SidebarInset } from "@repo/ui"
import { getTenantContext } from "@/app/_lib/tenancy"
import { BridgeSettingsSidebar } from "../_components/BridgeSettingsSidebar"
import { BridgeSettingsPage } from "../_components/BridgeSettingsPage"

export const dynamic = "force-dynamic"

export default async function BridgeSecurityPage() {
  const { context } = await getTenantContext()

  if (!context.userId) {
    redirect("/bridge/login")
  }

  return (
    <>
      <BridgeSettingsSidebar />
      <SidebarInset>
        <BridgeSettingsPage title="Security">
          <div className="text-muted-foreground">
            Security settings will go here
          </div>
        </BridgeSettingsPage>
      </SidebarInset>
    </>
  )
}
