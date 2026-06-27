"use client";

import { InlineSelect } from "@/app/_features/memory/components/AccountFieldEditors";
import { getStageOptions, STAGE_LABELS, type WorkType } from "@/app/_features/work/utils/stages";

type WorkStageSelectProps = {
  workType: WorkType;
  value: string | null;
  onChange: (stage: string) => void;
};

export function WorkStageSelect({ workType, value, onChange }: WorkStageSelectProps) {
  const options = getStageOptions(workType).map((opt) => ({
    value: opt.value,
    label: opt.label,
  }));

  return (
    <InlineSelect
      value={value ?? options[0]?.value ?? ""}
      onChange={onChange}
      options={options}
    />
  );
}

type WorkTypeSelectProps = {
  value: WorkType;
  onChange: (workType: WorkType) => void;
};

const WORK_TYPE_OPTIONS = [
  { value: "project" as const, label: "Project" },
  { value: "retainer" as const, label: "Retainer" },
  { value: "hourly" as const, label: "Hourly" },
  { value: "proposal" as const, label: "Proposal" },
  { value: "quick" as const, label: "Quick Job" },
  { value: "event" as const, label: "Event" },
];

export function WorkTypeSelect({ value, onChange }: WorkTypeSelectProps) {
  return (
    <InlineSelect
      value={value}
      onChange={(v) => onChange(v as WorkType)}
      options={WORK_TYPE_OPTIONS}
    />
  );
}
