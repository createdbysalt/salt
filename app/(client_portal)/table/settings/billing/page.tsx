import { redirect } from "next/navigation"
import { SidebarInset } from "@repo/ui"
import { getTenantContext } from "@/app/_lib/tenancy"
import { getBridgeBillingData } from "@/app/_lib/table/queries"
import { TableSettingsSidebar } from "../_components/TableSettingsSidebar"
import { TableSettingsPage } from "../_components/TableSettingsPage"
import { TableBillingSection } from "../_components/sections/TableBillingSection"

export const dynamic = "force-dynamic"

export default async function BridgeBillingPage() {
  const { context } = await getTenantContext()

  if (!context.userId) {
    redirect("/table/login")
  }

  if (!context.client) {
    redirect("/table")
  }

  // Fetch billing data for this client
  const billingData = await getBridgeBillingData(context.client.id)

  return (
    <>
      <TableSettingsSidebar />
      <SidebarInset>
        <TableSettingsPage title="Billing">
          <TableBillingSection
            retainer={billingData.retainer}
            invoices={billingData.invoices}
            summary={billingData.summary}
          />
        </TableSettingsPage>
      </SidebarInset>
    </>
  )
}
