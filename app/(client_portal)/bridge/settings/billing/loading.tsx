import { SidebarInset, Skeleton } from "@repo/ui"
import { BridgeSettingsSidebar } from "../_components/BridgeSettingsSidebar"
import { BridgeSettingsPage } from "../_components/BridgeSettingsPage"
import { BridgeSettingsSection } from "../_components/BridgeSettingsSection"
import { BridgeSettingsCard } from "../_components/BridgeSettingsCard"

export default function BridgeBillingLoading() {
  return (
    <>
      <BridgeSettingsSidebar />
      <SidebarInset>
        <BridgeSettingsPage title="Billing">
          <div className="space-y-8">
            {/* Retainer Section Skeleton */}
            <BridgeSettingsSection title="Retainer">
              <BridgeSettingsCard>
                <div className="flex items-center gap-3 px-4 py-4">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              </BridgeSettingsCard>
            </BridgeSettingsSection>

            {/* Invoices Section Skeleton */}
            <BridgeSettingsSection title="Invoices">
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
            </BridgeSettingsSection>

            {/* Payment Summary Section Skeleton */}
            <BridgeSettingsSection title="Payment Summary">
              <BridgeSettingsCard>
                <div className="flex items-center justify-between px-4 py-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex items-center justify-between px-4 py-4 border-t">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </BridgeSettingsCard>
            </BridgeSettingsSection>
          </div>
        </BridgeSettingsPage>
      </SidebarInset>
    </>
  )
}
