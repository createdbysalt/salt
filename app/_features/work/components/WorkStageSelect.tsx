"use client";

import { useEffect, useState } from "react";
import { InlineSelect } from "@/app/_features/memory/components/AccountFieldEditors";
import {
  getStageOptions,
  STAGE_LABELS,
  type WorkType,
} from "@/app/_features/work/utils/stages";

type WorkStageSelectProps = {
  workType: WorkType | "";
  value: string;
  onChange: (stage: string) => void;
};

export function WorkStageSelect({ workType, value, onChange }: WorkStageSelectProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleChangeStage = () => setOpen(true);
    window.addEventListener("work:change-stage", handleChangeStage);
    return () => window.removeEventListener("work:change-stage", handleChangeStage);
  }, []);

  if (!workType) {
    return (
      <span className="text-sm text-muted-foreground/80 italic">Select work type first</span>
    );
  }

  const baseOptions = getStageOptions(workType);
  const options =
    value && !baseOptions.some((option) => option.value === value)
      ? [
          ...baseOptions,
          {
            value,
            label: STAGE_LABELS[value] ?? value.replace(/_/g, " "),
          },
        ]
      : baseOptions;

  return (
    <InlineSelect
      value={value}
      onChange={onChange}
      options={[{ value: "", label: "Add stage" }, ...options]}
      placeholder="Add stage"
      open={open}
      onOpenChange={setOpen}
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
