"use client";

import { Sparkles } from "lucide-react";
import { relationshipDisplayLabel } from "@/app/_features/people/utils/relationship-display";
import { MemoryOverviewSection } from "@/app/_features/memory/components/MemoryOverviewSection";
import type { OrgProfileFieldKey, OrgProfileFieldsView } from "@/app/_features/orgs/types";

type OrgSaltProfileFieldsPanelProps = {
  profileFields: OrgProfileFieldsView | null;
  onCorrectField?: (field: OrgProfileFieldKey) => void;
};

export function OrgSaltProfileFieldsPanel({
  profileFields,
  onCorrectField,
}: OrgSaltProfileFieldsPanelProps) {
  if (!profileFields) return null;

  const rows = [
    profileFields.provenance.find((p) => p.field === "relationship_status" && p.status !== "pending")
      ? {
          label: "Relationship",
          value: relationshipDisplayLabel(
            profileFields.provenance.find((p) => p.field === "relationship_status")?.value ??
              profileFields.relationshipStatus,
          ),
          field: "relationship_status" as const,
          provenance: profileFields.provenance.find((p) => p.field === "relationship_status")!,
        }
      : null,
    profileFields.provenance.find((p) => p.field === "website" && p.status !== "pending")
      ? {
          label: "Domain",
          value:
            profileFields.provenance.find((p) => p.field === "website")?.value ??
            profileFields.website ??
            "—",
          field: "website" as const,
          provenance: profileFields.provenance.find((p) => p.field === "website")!,
        }
      : null,
    profileFields.provenance.find((p) => p.field === "industry" && p.status !== "pending")
      ? {
          label: "Industry",
          value:
            profileFields.provenance.find((p) => p.field === "industry")?.value ??
            profileFields.industry ??
            "—",
          field: "industry" as const,
          provenance: profileFields.provenance.find((p) => p.field === "industry")!,
        }
      : null,
    profileFields.provenance.find((p) => p.field === "key_contact" && p.status !== "pending")
      ? {
          label: "Key contact",
          value:
            profileFields.provenance.find((p) => p.field === "key_contact")?.value ??
            profileFields.primaryContact?.name ??
            "—",
          field: "key_contact" as const,
          provenance: profileFields.provenance.find((p) => p.field === "key_contact")!,
        }
      : null,
  ].filter((row) => row !== null);

  if (rows.length === 0) return null;

  return (
    <MemoryOverviewSection title="Why Salt filled this in" salt>
      <dl className="space-y-4 text-sm">
        {rows.map((row) => (
          <div key={row.field} className="space-y-1">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="text-foreground font-medium">{row.value}</dd>
            {row.provenance.because ? (
              <p className="text-xs text-muted-foreground">{row.provenance.because}</p>
            ) : null}
            {onCorrectField ? (
              <button
                type="button"
                onClick={() => onCorrectField(row.field)}
                className="inline-flex items-center gap-1 text-xs font-medium text-flame hover:underline"
              >
                <Sparkles className="size-3" strokeWidth={2.25} />
                Not right? Change it
              </button>
            ) : null}
          </div>
        ))}
      </dl>
    </MemoryOverviewSection>
  );
}
