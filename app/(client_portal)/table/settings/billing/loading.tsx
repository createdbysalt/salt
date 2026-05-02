import { SidebarInset, Skeleton } from "@repo/ui"
import { TableSettingsSidebar } from "../_components/TableSettingsSidebar"
import { TableSettingsPage } from "../_components/TableSettingsPage"
import { TableSettingsSection } from "../_components/TableSettingsSection"
import { TableSettingsCard } from "../_components/TableSettingsCard"

export default function BridgeBillingLoading() {
  return (
    <>
      <TableSettingsSidebar />
      <SidebarInset>
        <TableSettingsPage title="Billing">
          <div className="space-y-8">
            {/* Retainer Section Skeleton */}
            <TableSettingsSection title="Retainer">
              <TableSettingsCard>
                <div className="flex items-center gap-3 px-4 py-4">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              </TableSettingsCard>
            </TableSettingsSection>

            {/* Invoices Section Skeleton */}
            <TableSettingsSection title="Invoices">
              <div className="rounded-lg border">
                <div className="p-4 space-y-4">
                  {/* Table header skeleton */}
                  <div className="flex items-center gap-4 pb-2 border-b">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-20 ml-auto" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  {/* Table rows skeleton */}
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 py-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16 ml-auto" />
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            </TableSettingsSection>

            {/* Payment Summary Section Skeleton */}
            <TableSettingsSection title="Payment Summary">
              <TableSettingsCard>
                <div className="flex items-center justify-between px-4 py-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex items-center justify-between px-4 py-4 border-t">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </TableSettingsCard>
            </TableSettingsSection>
          </div>
        </TableSettingsPage>
      </SidebarInset>
    </>
  )
}
