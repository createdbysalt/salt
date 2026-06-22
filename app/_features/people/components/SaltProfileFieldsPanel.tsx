"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@repo/ui";
import type { PersonProfileFieldsView, ProfileFieldKey } from "@/app/_features/plays/playbooks/profile/types";
import { relationshipDisplayLabel } from "@/app/_features/people/utils/relationship-display";
import { approveProfileFieldSuggestion } from "@/app/_features/people/actions/profile-fields";
import { MemoryOverviewSection } from "@/app/_features/memory/components/MemoryOverviewSection";

type SaltProfileFieldsPanelProps = {
  profileFields: PersonProfileFieldsView | null;
  personId: string;
  onCorrectField?: (field: ProfileFieldKey) => void;
  onApproved?: () => void;
};

export function SaltProfileFieldsPanel({
  profileFields,
  personId,
  onCorrectField,
  onApproved,
}: SaltProfileFieldsPanelProps) {
  if (!profileFields) return null;

  const relProv = profileFields.provenance.find((p) => p.field === "relationship_type");
  const titleProv = profileFields.provenance.find((p) => p.field === "title");
  const orgProv = profileFields.provenance.find((p) => p.field === "org_link");
  const rows = [
    relProv
      ? {
          label: "Relationship",
          value: relationshipDisplayLabel(relProv.value ?? profileFields.relationshipType),
          field: "relationship_type" as const,
          provenance: relProv,
        }
      : null,
    titleProv
      ? {
          label: "Job title",
          value: titleProv.value ?? profileFields.title ?? "—",
          field: "title" as const,
          provenance: titleProv,
        }
      : null,
    orgProv
      ? {
          label: "Organization",
          value: orgProv.value ?? profileFields.primaryOrg?.name ?? "—",
          field: "org_link" as const,
          provenance: orgProv,
        }
      : null,
  ].filter((row) => row !== null);

  if (rows.length === 0) return null;

  return (
    <MemoryOverviewSection title="Why Salt filled this in" salt>
      <dl className="space-y-4 text-sm">
        {rows.map((row) => (
          <ProfileFieldRow
            key={row.field}
            label={row.label}
            value={row.value}
            field={row.field}
            personId={personId}
            provenance={row.provenance}
            onCorrect={onCorrectField ? () => onCorrectField(row.field) : undefined}
            onApproved={onApproved}
          />
        ))}
      </dl>
    </MemoryOverviewSection>
  );
}

function ProfileFieldRow({
  label,
  value,
  field,
  personId,
  provenance,
  onCorrect,
  onApproved,
}: {
  label: string;
  value: string;
  field: ProfileFieldKey;
  personId: string;
  provenance?: PersonProfileFieldsView["provenance"][number];
  onCorrect?: () => void;
  onApproved?: () => void;
}) {
  const [pending, setPending] = useState(false);
  const isPending = provenance?.status === "pending";

  async function handleApprove() {
    setPending(true);
    const result = await approveProfileFieldSuggestion({ personId, field });
    setPending(false);
    if (result.ok) onApproved?.();
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-muted/20 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
          <dd className="mt-1 font-medium text-foreground">{value}</dd>
        </div>
        {isPending && (
          <span className="rounded-full bg-flame/10 px-2 py-0.5 text-[10px] font-semibold text-flame">
            Needs approval
          </span>
        )}
      </div>
      {provenance && (
        <p className="mt-2 text-xs text-muted-foreground inline-flex items-start gap-1.5">
          <Sparkles className="size-3 mt-0.5 shrink-0 text-sky" strokeWidth={2.25} />
          <span>
            {provenance.because ??
              (provenance.source === "manual"
                ? "You corrected this"
                : provenance.source === "ai_fallback"
                  ? "Salt inferred this from context"
                  : "Matched a Keeper rule")}
            {provenance.confidence != null ? ` · ${provenance.confidence}% sure` : ""}
          </span>
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {isPending && (
          <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={handleApprove}>
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : "Approve suggestion"}
          </Button>
        )}
        {onCorrect && (
          <button
            type="button"
            onClick={onCorrect}
            className="text-xs font-semibold text-foreground hover:underline"
          >
            Not right? Change it
          </button>
        )}
      </div>
    </div>
  );
}
