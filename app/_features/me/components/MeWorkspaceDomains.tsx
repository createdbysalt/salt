"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MemoryOverviewSection } from "@/app/_features/memory/components/MemoryOverviewSection";
import { AccountRow, InlineEditableText } from "@/app/_features/memory/components/AccountFieldEditors";
import type { ProfileContextFacts } from "@/app/_features/plays/playbooks/records-engine/types";
import { updateProfileContextFacts } from "@/app/_features/people/actions/profile-fields";

type MeWorkspaceDomainsProps = {
  initialFacts: ProfileContextFacts;
};

export function MeWorkspaceDomains({ initialFacts }: MeWorkspaceDomainsProps) {
  const [workspaceDomains, setWorkspaceDomains] = useState(
    (initialFacts.workspace_domains ?? []).join(", "),
  );
  const [partnerDomains, setPartnerDomains] = useState(
    (initialFacts.partner_domains ?? []).join(", "),
  );
  const [vendorDomains, setVendorDomains] = useState(
    (initialFacts.vendor_domains ?? []).join(", "),
  );
  const [, startTransition] = useTransition();

  const saveDomains = (
    field: "workspace" | "partner" | "vendor",
    value: string,
  ) => {
    const newWorkspace = field === "workspace" ? value : workspaceDomains;
    const newPartner = field === "partner" ? value : partnerDomains;
    const newVendor = field === "vendor" ? value : vendorDomains;

    if (field === "workspace") setWorkspaceDomains(value);
    if (field === "partner") setPartnerDomains(value);
    if (field === "vendor") setVendorDomains(value);

    startTransition(async () => {
      const result = await updateProfileContextFacts({
        workspace_domains: splitDomains(newWorkspace),
        partner_domains: splitDomains(newPartner),
        vendor_domains: splitDomains(newVendor),
      });
      if (!result.ok) {
        toast.error(result.message);
      }
    });
  };

  return (
    <MemoryOverviewSection title="Domains">
      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <AccountRow label="Your company">
          <InlineEditableText
            value={workspaceDomains}
            onChange={(v) => saveDomains("workspace", v)}
            placeholder="yourcompany.com, yourbrand.io"
          />
        </AccountRow>
        <AccountRow label="Partners">
          <InlineEditableText
            value={partnerDomains}
            onChange={(v) => saveDomains("partner", v)}
            placeholder="agency.com, collaborator.io"
          />
        </AccountRow>
        <AccountRow label="Vendors">
          <InlineEditableText
            value={vendorDomains}
            onChange={(v) => saveDomains("vendor", v)}
            placeholder="stripe.com, notion.so, figma.com"
          />
        </AccountRow>
      </dl>
    </MemoryOverviewSection>
  );
}

function splitDomains(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}
