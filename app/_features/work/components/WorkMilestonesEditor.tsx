"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Calendar, Check, GitBranch, Plus, Trash2 } from "lucide-react";
import { Button } from "@repo/ui";
import { cn } from "@repo/utils";
import {
  InlineDatePicker,
  InlineSelect,
} from "@/app/_features/memory/components/AccountFieldEditors";
import type { WorkMilestone, WorkMilestoneStatus, WorkMilestoneTriggerType, WorkType } from "@/app/_features/work/types";
import { formatCurrencyCents } from "@/app/_features/work/utils/pricing";
import { getStageOptions, STAGE_LABELS } from "@/app/_features/work/utils/stages";
import {
  createWorkMilestone,
  updateWorkMilestone,
  deleteWorkMilestone,
} from "@/app/_features/work/actions/milestones";

const TRIGGER_TYPE_OPTIONS = [
  { value: "stage" as const, label: "On stage" },
  { value: "date" as const, label: "On date" },
  { value: "manual" as const, label: "Manual" },
];

const inlineInputClass =
  "w-full bg-transparent border-0 border-b border-foreground/20 px-0 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/50 transition-colors";

interface WorkMilestonesEditorProps {
  workId: string;
  workType: WorkType | null;
  milestones: WorkMilestone[];
  contractValueCents: number | null;
  currency: string;
}

function getTriggerLabel(milestone: WorkMilestone): string {
  if (milestone.triggerType === "stage" && milestone.triggerStage) {
    return STAGE_LABELS[milestone.triggerStage] ?? milestone.triggerStage;
  }
  if (milestone.triggerType === "date" && milestone.dueDate) {
    return new Date(milestone.dueDate).toLocaleDateString();
  }
  return "Manual";
}

function MilestoneRow({
  milestone,
  contractValueCents,
  currency,
  onTogglePaid,
  onDelete,
}: {
  milestone: WorkMilestone;
  contractValueCents: number | null;
  currency: string;
  onTogglePaid: (id: string, paid: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const isPaid = milestone.status === "paid";
  const isDue = milestone.status === "due";
  const computedAmount =
    milestone.amountCents ??
    (milestone.percent != null && contractValueCents != null
      ? Math.round((milestone.percent / 100) * contractValueCents)
      : null);

  return (
    <div className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted/30">
      <button
        type="button"
        onClick={() => onTogglePaid(milestone.id, !isPaid)}
        aria-label={isPaid ? "Mark unpaid" : "Mark paid"}
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          isPaid
            ? "border-emerald-500 bg-emerald-500 text-white"
            : isDue
              ? "border-amber-500 bg-amber-500/10"
              : "border-border hover:border-foreground/50",
        )}
      >
        {isPaid && <Check className="size-3" strokeWidth={2.5} />}
      </button>

      <div className="min-w-0 flex-1">
        <span className={cn("text-sm font-medium", isPaid && "text-muted-foreground line-through")}>
          {milestone.name}
        </span>
        <span className="ml-2 inline-flex items-center gap-0.5 text-xs text-muted-foreground">
          {milestone.triggerType === "stage" && <GitBranch className="size-3" strokeWidth={1.75} />}
          {milestone.triggerType === "date" && <Calendar className="size-3" strokeWidth={1.75} />}
          {getTriggerLabel(milestone)}
        </span>
      </div>

      <span className={cn("shrink-0 text-sm tabular-nums", isPaid && "text-muted-foreground line-through")}>
        {milestone.percent != null ? `${milestone.percent}%` : ""}
        {computedAmount != null && (
          <span className="ml-1.5 text-muted-foreground">
            ({formatCurrencyCents(computedAmount, currency)})
          </span>
        )}
      </span>

      <button
        type="button"
        onClick={() => onDelete(milestone.id)}
        aria-label="Delete milestone"
        className="shrink-0 rounded-md p-1 text-muted-foreground/40 opacity-0 transition-all hover:text-destructive group-hover:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

export function WorkMilestonesEditor({
  workId,
  workType,
  milestones: initialMilestones,
  contractValueCents,
  currency,
}: WorkMilestonesEditorProps) {
  const [milestones, setMilestones] = useState(initialMilestones);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPercent, setNewPercent] = useState("");
  const [newTriggerType, setNewTriggerType] = useState<WorkMilestoneTriggerType>("stage");
  const [newTriggerStage, setNewTriggerStage] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  const totalPercent = milestones.reduce((sum, m) => sum + (m.percent ?? 0), 0);
  const stageOptions = workType
    ? [{ value: "", label: "Select stage…" }, ...getStageOptions(workType)]
    : [];

  const canAdd =
    newName.trim() &&
    newPercent.trim() &&
    (newTriggerType !== "stage" || newTriggerStage) &&
    (newTriggerType !== "date" || newDueDate);

  async function handleTogglePaid(id: string, paid: boolean) {
    const status: WorkMilestoneStatus = paid ? "paid" : "pending";
    const result = await updateWorkMilestone(id, { status });
    if (result.ok) {
      setMilestones((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status } : m)),
      );
    } else {
      toast.error(result.message);
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteWorkMilestone(id);
    if (result.ok) {
      setMilestones((prev) => prev.filter((m) => m.id !== id));
    } else {
      toast.error(result.message);
    }
  }

  async function handleAdd() {
    if (!newName.trim() || !newPercent.trim()) return;
    if (newTriggerType === "stage" && !newTriggerStage) return;
    if (newTriggerType === "date" && !newDueDate) return;

    const result = await createWorkMilestone(workId, {
      name: newName.trim(),
      percent: Number(newPercent),
      amountCents: null,
      triggerType: newTriggerType,
      triggerStage: newTriggerType === "stage" ? newTriggerStage : null,
      dueDate: newTriggerType === "date" ? newDueDate : null,
    });

    if (result.ok) {
      setMilestones((prev) => [...prev, result.milestone]);
      resetForm();
    } else {
      toast.error(result.message);
    }
  }

  function resetForm() {
    setNewName("");
    setNewPercent("");
    setNewTriggerType("stage");
    setNewTriggerStage("");
    setNewDueDate("");
    setAdding(false);
  }

  return (
    <div className="mt-4 border-t border-dashed border-border/50 pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Milestones
        </p>
        {totalPercent > 0 && totalPercent !== 100 && (
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
            {totalPercent}% allocated
          </span>
        )}
      </div>

      {milestones.length > 0 && (
        <div className="divide-y divide-border/40">
          {milestones.map((milestone) => (
            <MilestoneRow
              key={milestone.id}
              milestone={milestone}
              contractValueCents={contractValueCents}
              currency={currency}
              onTogglePaid={handleTogglePaid}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {adding ? (
        <div className="mt-3 rounded-2xl border border-border/60 bg-card/40 p-4">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_4.5rem]">
            <div className="min-w-0 space-y-1">
              <label
                htmlFor="milestone-name"
                className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground"
              >
                Name
              </label>
              <input
                id="milestone-name"
                placeholder="e.g. Kickoff payment"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canAdd) void handleAdd();
                  if (e.key === "Escape") resetForm();
                }}
                className={inlineInputClass}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="milestone-percent"
                className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground"
              >
                Share
              </label>
              <div className="relative">
                <input
                  id="milestone-percent"
                  placeholder="50"
                  type="number"
                  min={0}
                  max={100}
                  value={newPercent}
                  onChange={(e) => setNewPercent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canAdd) void handleAdd();
                    if (e.key === "Escape") resetForm();
                  }}
                  className={cn(inlineInputClass, "pr-4 text-center tabular-nums")}
                />
                <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  %
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Trigger
              </p>
              <InlineSelect
                value={newTriggerType}
                onChange={(value) => {
                  setNewTriggerType(value);
                  setNewTriggerStage("");
                  setNewDueDate("");
                }}
                options={TRIGGER_TYPE_OPTIONS}
              />
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {newTriggerType === "stage"
                  ? "Stage"
                  : newTriggerType === "date"
                    ? "Due date"
                    : "Timing"}
              </p>
              {newTriggerType === "stage" && workType && stageOptions.length > 0 ? (
                <InlineSelect
                  value={newTriggerStage}
                  onChange={setNewTriggerStage}
                  options={stageOptions}
                  placeholder="Select stage…"
                />
              ) : newTriggerType === "stage" ? (
                <span className="text-sm italic text-muted-foreground/80">Select work type first</span>
              ) : newTriggerType === "date" ? (
                <InlineDatePicker
                  value={newDueDate || null}
                  onChange={(value) => setNewDueDate(value ?? "")}
                  placeholder="Pick date"
                />
              ) : (
                <span className="text-sm text-muted-foreground/80">Marked due manually</span>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/40 pt-3">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-muted-foreground"
              onClick={resetForm}
            >
              Cancel
            </Button>
            <Button size="sm" className="h-8 px-4" onClick={handleAdd} disabled={!canAdd}>
              Add milestone
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/60 py-2.5 text-xs text-muted-foreground transition-colors hover:border-foreground/25 hover:bg-muted/20 hover:text-foreground"
        >
          <Plus className="size-3.5" strokeWidth={2.25} />
          {milestones.length === 0
            ? "Add milestones (e.g. 50% on Kickoff, 50% on Delivered)"
            : "Add milestone"}
        </button>
      )}
    </div>
  );
}
