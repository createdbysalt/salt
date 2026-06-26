"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Link2 } from "lucide-react";
import { cn } from "@repo/utils";
import { MockContentEmptyState } from "@/app/_features/shell/components/MockContentEmptyState";
import {
  memoryDetailGridClass,
  memoryDetailShellClass,
  memoryTabPanelClass,
  memoryTabsListEqualClass,
  memoryTabTriggerEqualClass,
} from "@/app/_features/memory/utils/memory-layout";
import type { BillingDetailData } from "../detail-types";
import { toBillingDetailViewModel } from "../utils/detail-mapper";
import { BillingActivityTab } from "./BillingActivityTab";
import { BillingDetailHero } from "./BillingDetailHero";
import { BillingOverviewTab } from "./BillingOverviewTab";
import { BillingPaymentSidebar } from "./BillingPaymentSidebar";

type BillingDetailPageProps = {
  billingRecordId: string;
  detailData?: BillingDetailData | null;
};

const BILLING_DETAIL_TABS = [
  { value: "overview", label: "Overview" },
  { value: "connections", label: "Connections" },
  { value: "activity", label: "Activity" },
] as const;

type BillingDetailTab = (typeof BILLING_DETAIL_TABS)[number]["value"];

export function BillingDetailPage({ billingRecordId: _billingRecordId, detailData = null }: BillingDetailPageProps) {
  const [tab, setTab] = useState<BillingDetailTab>("overview");
  const billing = detailData?.record
    ? toBillingDetailViewModel(detailData.record, {
        captureSourceUrl: detailData.captureSourceUrl,
        documentUrl: detailData.documentUrl,
        updatedAt: detailData.updatedAt,
      })
    : undefined;

  if (!billing) {
    return (
      <div className="relative min-h-full">
        <div aria-hidden className="salt-ambient-wash" />
        <div className={memoryDetailShellClass}>
          <BackToBillingLink />
          <MockContentEmptyState
            title="Billing record not found"
            description="This invoice or payable is not in your Billing Memory yet."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className={memoryDetailShellClass}>
        <BackToBillingLink />
        <BillingDetailHero billing={billing} />

        <div className={memoryDetailGridClass}>
          <div className="min-w-0 space-y-6">
            <div className="space-y-5">
              <div className={memoryTabsListEqualClass} role="tablist" aria-label="Billing detail tabs">
                {BILLING_DETAIL_TABS.map((item) => {
                  const active = tab === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      role="tab"
                      id={`billing-detail-${item.value}-trigger`}
                      aria-selected={active}
                      aria-controls={`billing-detail-${item.value}-panel`}
                      className={cn(
                        memoryTabTriggerEqualClass,
                        active
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      data-state={active ? "active" : "inactive"}
                      onClick={() => setTab(item.value)}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div className={memoryTabPanelClass}>
                <div
                  role="tabpanel"
                  id="billing-detail-overview-panel"
                  aria-labelledby="billing-detail-overview-trigger"
                  hidden={tab !== "overview"}
                  className="m-0"
                >
                  <BillingOverviewTab billing={billing} />
                </div>
                <div
                  role="tabpanel"
                  id="billing-detail-connections-panel"
                  aria-labelledby="billing-detail-connections-trigger"
                  hidden={tab !== "connections"}
                  className="m-0"
                >
                  <ConnectionsPanel billing={billing} />
                </div>
                <div
                  role="tabpanel"
                  id="billing-detail-activity-panel"
                  aria-labelledby="billing-detail-activity-trigger"
                  hidden={tab !== "activity"}
                  className="m-0"
                >
                  <BillingActivityTab billing={billing} />
                </div>
              </div>
            </div>
          </div>

          <BillingPaymentSidebar billing={billing} plays={detailData?.billingPlays ?? []} />
        </div>
      </div>
    </div>
  );
}

function BackToBillingLink() {
  return (
    <Link
      href="/billing"
      className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" strokeWidth={2} />
      Back to Billing
    </Link>
  );
}

function ConnectionsPanel({ billing }: { billing: ReturnType<typeof toBillingDetailViewModel> }) {
  if (!billing.connections.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 p-6">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <Link2 className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
          <p>Unmatched party. Salt can link this to an existing person, org, or work record.</p>
        </div>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {billing.connections.map((connection) => (
        <li key={`${connection.type}-${connection.id}`}>
          <Link
            href={
              connection.type === "person"
                ? `/people/${connection.id}`
                : connection.type === "org"
                  ? `/orgs/${connection.id}`
                  : `/work/${connection.id}`
            }
            className="block rounded-xl border border-border/60 px-4 py-3 text-sm transition hover:bg-muted/50"
          >
            <span className="font-medium capitalize text-foreground">{connection.type}</span>
            <span className="mt-0.5 block font-medium text-foreground">{connection.name}</span>
            {connection.subtitle ? (
              <span className="mt-0.5 block text-xs text-muted-foreground">{connection.subtitle}</span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
