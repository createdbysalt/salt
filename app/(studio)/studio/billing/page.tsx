"use client"

import { useState } from "react"
import {
  SidebarTrigger,
  Separator,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Button,
} from "@repo/ui"
import { Plus, Receipt, Package, CreditCard, Send } from "lucide-react"
import { ServicesTab } from "./ServicesTab"

type BillingTab = "overview" | "services" | "invoices"

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<BillingTab>("services")

  return (
    <div className="flex h-full flex-col">
      {/* Breadcrumb Header */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <div className="flex items-center gap-2 min-w-0">
          <SidebarTrigger className="-ml-1 shrink-0" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4 shrink-0"
          />
          <nav className="flex items-center gap-1 text-sm min-w-0">
            <span className="font-medium">Billing</span>
          </nav>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Send className="size-4" />
            Send Invoice
          </Button>
          <Button size="sm">
            <Plus className="size-4" />
            Service
          </Button>
        </div>
      </header>

      {/* Tab Bar */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as BillingTab)}
        className="flex-1 flex flex-col"
      >
        <div className="border-b px-4">
          <TabsList variant="line" className="h-10">
            <TabsTrigger value="overview" className="text-sm gap-1.5 px-3">
              <CreditCard className="size-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="services" className="text-sm gap-1.5 px-3">
              <Package className="size-4" />
              Services
            </TabsTrigger>
            <TabsTrigger value="invoices" className="text-sm gap-1.5 px-3">
              <Receipt className="size-4" />
              Invoices
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="flex-1 p-4 mt-0">
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Billing overview coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="services" className="flex-1 mt-0 overflow-hidden">
          <ServicesTab />
        </TabsContent>

        <TabsContent value="invoices" className="flex-1 p-4 mt-0">
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Invoices coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
