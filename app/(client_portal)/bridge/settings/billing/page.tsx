import { redirect } from "next/navigation"
import { SidebarInset } from "@repo/ui"
import { getTenantContext } from "@/app/_lib/tenancy"
import { getBridgeBillingData } from "@/app/_lib/bridge/queries"
import { BridgeSettingsSidebar } from "../_components/BridgeSettingsSidebar"
import { BridgeSettingsPage } from "../_components/BridgeSettingsPage"
import { BridgeBillingSection } from "../_components/sections/BridgeBillingSection"

export const dynamic = "force-dynamic"

export default async function BridgeBillingPage() {
  const { context } = await getTenantContext()

  if (!context.userId) {
    redirect("/bridge/login")
  }

  if (!context.client) {
    redirect("/bridge")
  }

  // Fetch billing data for this client
  const billingData = await getBridgeBillingData(context.client.id)

  return (
    <>
      <BridgeSettingsSidebar />
      <SidebarInset>
        <BridgeSettingsPage title="Billing">
          <BridgeBillingSection
            retainer={billingData.retainer}
            invoices={billingData.invoices}
            summary={billingData.summary}
          />
        </BridgeSettingsPage>
      </SidebarInset>
    </>
  )
}
