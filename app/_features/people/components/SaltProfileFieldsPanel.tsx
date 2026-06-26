"use client";

import { Sparkles } from "lucide-react";
import type {
  PersonProfileFieldKey,
  PersonProfileFieldsView,
} from "@/app/_features/plays/playbooks/profile/types";
import { relationshipDisplayLabel } from "@/app/_features/people/utils/relationship-display";
import { MemoryOverviewSection } from "@/app/_features/memory/components/MemoryOverviewSection";

type SaltProfileFieldsPanelProps = {
  profileFields: PersonProfileFieldsView | null;
  onCorrectField?: (field: PersonProfileFieldKey) => void;
};

export function SaltProfileFieldsPanel({
  profileFields,
  onCorrectField,
}: SaltProfileFieldsPanelProps) {
  if (!profileFields) return null;

  const relProv = profileFields.provenance.find(
    (p) => p.field === "relationship_type" && p.status !== "pending",
  );
  const titleProv = profileFields.provenance.find(
    (p) => p.field === "title" && p.status !== "pending",
  );
  const orgProv = profileFields.provenance.find(
    (p) => p.field === "org_link" && p.status !== "pending",
  );
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
            provenance={row.provenance}
            onCorrect={onCorrectField ? () => onCorrectField(row.field) : undefined}
          />
        ))}
      </dl>
    </MemoryOverviewSection>
  );
}

function ProfileFieldRow({
  label,
  value,
  provenance,
  onCorrect,
}: {
  label: string;
  value: string;
  provenance?: PersonProfileFieldsView["provenance"][number];
  onCorrect?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-muted/20 px-4 py-3">
      <div>
        <dt className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
        <dd className="mt-1 font-medium text-foreground">{value}</dd>
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
      {onCorrect && (
        <button
          type="button"
          onClick={onCorrect}
          className="mt-2 text-xs font-semibold text-foreground hover:underline"
        >
          Not right? Change it
        </button>
      )}
    </div>
  );
}
