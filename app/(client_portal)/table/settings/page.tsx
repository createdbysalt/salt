import { redirect } from "next/navigation"
import { SidebarInset } from "@repo/ui"
import { getTenantContext } from "@/app/_lib/tenancy"
import { TableSettingsSidebar } from "./_components/TableSettingsSidebar"
import { TableAccountSection } from "./_components/sections/TableAccountSection"
import { getBridgeUserInfo } from "@/app/_lib/table/queries"

export const dynamic = "force-dynamic"

export default async function TableSettingsPage() {
  const { context } = await getTenantContext()

  if (!context.userId) {
    redirect("/table/login")
  }

  const userInfo = await getBridgeUserInfo(context.userId)

  return (
    <>
      <TableSettingsSidebar />
      <SidebarInset>
        <TableAccountSection user={userInfo} />
      </SidebarInset>
    </>
  )
}
