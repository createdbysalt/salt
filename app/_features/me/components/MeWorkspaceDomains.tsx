"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input, Label } from "@repo/ui";
import type { ProfileContextFacts } from "@/app/_features/plays/playbooks/profile/types";
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
  const [pending, setPending] = useState(false);
  const [dirty, setDirty] = useState(false);

  function markDirty(setter: (value: string) => void) {
    return (value: string) => {
      setter(value);
      setDirty(true);
    };
  }

  async function handleSave() {
    setPending(true);
    const result = await updateProfileContextFacts({
      workspace_domains: splitDomains(workspaceDomains),
      partner_domains: splitDomains(partnerDomains),
      vendor_domains: splitDomains(vendorDomains),
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setDirty(false);
    toast.success("Domains saved");
  }

  return (
    <section className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Workspace context
        </p>
        <h2 className="mt-1 font-display text-2xl tracking-tight text-foreground">
          Domains Salt knows
        </h2>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
          Salt uses these to classify the people it resolves. Separate multiple with commas.
        </p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
        <DomainField
          label="Your company domains"
          description="Matches here are classified as Team."
          placeholder="usesalt.io, salthq.com"
          value={workspaceDomains}
          onChange={markDirty(setWorkspaceDomains)}
        />
        <DomainField
          label="Partner domains"
          description="Matches here are classified as Partner."
          placeholder="acme.com, globex.com"
          value={partnerDomains}
          onChange={markDirty(setPartnerDomains)}
        />
        <DomainField
          label="Vendor domains"
          description="Matches here are classified as Vendor."
          placeholder="aws.com, figma.com"
          value={vendorDomains}
          onChange={markDirty(setVendorDomains)}
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={pending || !dirty}
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background hover:bg-foreground/90 transition disabled:opacity-40"
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : "Save domains"}
          </button>
        </div>
      </div>
    </section>
  );
}

function DomainField({
  label,
  description,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  description: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function splitDomains(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}
