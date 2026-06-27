"use client";

import { Sparkles } from "lucide-react";
import { MemoryOverviewSection } from "@/app/_features/memory/components/MemoryOverviewSection";
import type { WorkProfileFieldKey, WorkProfileFieldsView } from "@/app/_features/work/types";
import { workProfileFieldLabel } from "@/app/_features/work/utils/activity";

type WorkSaltProfileFieldsPanelProps = {
  profileFields: WorkProfileFieldsView | null;
  onCorrectField?: (field: WorkProfileFieldKey) => void;
};

export function WorkSaltProfileFieldsPanel({
  profileFields,
  onCorrectField,
}: WorkSaltProfileFieldsPanelProps) {
  if (!profileFields) return null;

  const rows = [
    fieldRow(profileFields, "status", profileFields.status),
    fieldRow(profileFields, "description", profileFields.description),
    fieldRow(profileFields, "deadline", profileFields.deadline),
    fieldRow(profileFields, "start_date", profileFields.startDate),
  ].filter((row) => row !== null);

  if (rows.length === 0) return null;

  return (
    <MemoryOverviewSection title="Why Salt filled this in" salt>
      <dl className="space-y-4 text-sm">
        {rows.map((row) => (
          <div key={row.field} className="space-y-1">
            <dt className="text-muted-foreground">{workProfileFieldLabel(row.field)}</dt>
            <dd className="font-medium text-foreground">{row.value}</dd>
            {row.provenance.because ? (
              <p className="text-xs text-muted-foreground">{row.provenance.because}</p>
            ) : null}
            {row.provenance.confidence != null ? (
              <p className="text-xs text-muted-foreground">{row.provenance.confidence}% sure</p>
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

function fieldRow(
  profileFields: WorkProfileFieldsView,
  field: WorkProfileFieldKey,
  fallback: string | null,
) {
  const provenance = profileFields.provenance.find((p) => p.field === field && p.status !== "pending");
  if (!provenance) return null;
  return {
    field,
    value: provenance.value ?? fallback ?? "-",
    provenance,
  };
}
