import { redirect } from "next/navigation"
import { SidebarInset } from "@repo/ui"
import { getTenantContext } from "@/app/_lib/tenancy"
import { BridgeSettingsSidebar } from "./_components/BridgeSettingsSidebar"
import { BridgeAccountSection } from "./_components/sections/BridgeAccountSection"
import { getBridgeUserInfo } from "@/app/_lib/bridge/queries"

export const dynamic = "force-dynamic"

export default async function BridgeSettingsPage() {
  const { context } = await getTenantContext()

  if (!context.userId) {
    redirect("/bridge/login")
  }

  const userInfo = await getBridgeUserInfo(context.userId)

  return (
    <>
      <BridgeSettingsSidebar />
      <SidebarInset>
        <BridgeAccountSection user={userInfo} />
      </SidebarInset>
    </>
  )
}
