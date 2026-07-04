"use client";

import { useState, useTransition, useEffect, type ReactNode } from "react";
import {
  Target,
  Plus,
  Loader2,
  Trash2,
  Pencil,
  Check,
  ChevronDown,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Input,
  Textarea,
  Slider,
  ToggleGroup,
  ToggleGroupItem,
} from "@repo/ui";
import { cn } from "@repo/utils";
import { MemoryOverviewSection } from "@/app/_features/memory/components/MemoryOverviewSection";
import { InlineSelect } from "@/app/_features/memory/components/AccountFieldEditors";
import {
  createOperatorGoal,
  updateOperatorGoal,
  deleteOperatorGoal,
} from "../actions";
import {
  GOAL_TYPE_META,
  type OperatorGoal,
  type OperatorGoalType,
  type OperatorGoalHorizon,
} from "../types";
import {
  generatePeriodOptions,
  detectPeriodType,
  getDefaultPeriodType,
  getAvailablePeriodTypes,
  PERIOD_TYPE_LABELS,
  type GoalPeriodType,
} from "../utils/goal-periods";

const GOAL_TYPE_ICONS: Record<OperatorGoalType, React.ElementType> = {
  revenue_target: DollarSign,
  new_clients: Users,
  project_minimum: TrendingUp,
  work_hours: Clock,
  custom: Target,
};

const HORIZON_OPTIONS = [
  { value: "week", label: "This week" },
  { value: "quarter", label: "This quarter" },
  { value: "year", label: "This year" },
] as const;

type GoalsSectionProps = {
  goals: OperatorGoal[];
  canEdit: boolean;
};

export function GoalsSection({ goals, canEdit }: GoalsSectionProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const openAdd = () => {
    setEditingId(null);
    setAddOpen(true);
  };

  const openEdit = (goal: OperatorGoal) => {
    setAddOpen(false);
    setEditingId(goal.id);
  };

  const closeForm = () => {
    setAddOpen(false);
    setEditingId(null);
  };

  useEffect(() => {
    const handleAddGoal = () => openAdd();
    window.addEventListener("me:add-goal", handleAddGoal);
    return () => window.removeEventListener("me:add-goal", handleAddGoal);
  }, []);

  return (
    <MemoryOverviewSection
      title="Goals"
      variant="heading"
      actions={
        canEdit && !addOpen && editingId === null ? (
          <Button size="sm" variant="outline" onClick={openAdd}>
            <Plus className="size-3.5" /> Add goal
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {canEdit && addOpen && <GoalForm onClose={closeForm} />}

        {goals.length > 0 ? (
          <div className="space-y-2">
            {goals.map((goal) =>
              editingId === goal.id ? (
                <GoalForm key={goal.id} goal={goal} onClose={closeForm} />
              ) : (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  canEdit={canEdit}
                  onEdit={() => openEdit(goal)}
                />
              ),
            )}
          </div>
        ) : !addOpen ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-8 text-center">
            <Target
              className="mx-auto size-8 text-muted-foreground/60"
              strokeWidth={1.5}
            />
            <p className="mt-2 text-sm text-muted-foreground">No goals yet.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Set revenue, client, or hours goals so Salt can prioritize around
              them.
            </p>
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                className="mt-4"
                onClick={openAdd}
              >
                <Plus className="size-3.5" /> Add goal
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </MemoryOverviewSection>
  );
}

// ─── Goal Card ──────────────────────────────────────────────────────────────

function GoalCard({
  goal,
  canEdit,
  onEdit,
}: {
  goal: OperatorGoal;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const [currentValue, setCurrentValue] = useState(goal.currentValue);
  const [progress, setProgress] = useState(goal.progress);
  const [aiOpen, setAiOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const Icon = GOAL_TYPE_ICONS[goal.goalType];
  const meta = GOAL_TYPE_META[goal.goalType];
  const isCustom = goal.goalType === "custom";

  const computedProgress = !isCustom && goal.targetValue
    ? Math.min(100, Math.round((currentValue / goal.targetValue) * 100))
    : progress;

  const commitProgress = (value: number) => {
    if (isCustom) {
      setProgress(value);
      startTransition(async () => {
        const res = await updateOperatorGoal({ id: goal.id, progress: value });
        if (!res.ok) toast.error(res.message);
      });
    } else {
      const newCurrentValue = goal.targetValue
        ? (value / 100) * goal.targetValue
        : 0;
      setCurrentValue(newCurrentValue);
      startTransition(async () => {
        const res = await updateOperatorGoal({
          id: goal.id,
          currentValue: newCurrentValue,
        });
        if (!res.ok) toast.error(res.message);
      });
    }
  };

  const markDone = () => {
    startTransition(async () => {
      const res = await updateOperatorGoal({
        id: goal.id,
        status: "done",
        progress: 100,
        currentValue: goal.targetValue ?? undefined,
      });
      if (res.ok) toast.success("Goal completed");
      else toast.error(res.message);
    });
  };

  const remove = () => {
    startTransition(async () => {
      const res = await deleteOperatorGoal(goal.id);
      if (res.ok) toast("Goal removed");
      else toast.error(res.message);
    });
  };

  const displayValue = !isCustom && goal.targetValue
    ? goal.targetUnit === "dollars"
      ? `$${currentValue.toLocaleString()} / $${goal.targetValue.toLocaleString()}`
      : `${Math.round(currentValue)} / ${goal.targetValue} ${goal.targetUnit}`
    : null;

  const hasAIProgress = goal.aiProgress?.summary || goal.aiProgress?.recommendation;

  // Versioned derivation from me/goals/recompute.ts (percent + computed_at).
  const derivedProgress = (() => {
    const ai = goal.aiProgress;
    if (!ai?.computed_at || ai.unavailable) return null;
    const value = typeof ai.value === "number" ? ai.value : null;
    if (value == null) return null;
    const valueLabel =
      ai.unit === "dollars" ? `$${value.toLocaleString()}` : value.toLocaleString();
    const percentLabel = typeof ai.percent === "number" ? ` (${ai.percent}%)` : "";
    return {
      text: `Salt sees ${valueLabel}${percentLabel}`,
      tooltip: `Computed ${new Date(ai.computed_at).toLocaleString()}${ai.inputs ? ` · ${ai.inputs}` : ""}`,
    };
  })();

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="size-7 rounded-lg bg-muted grid place-items-center shrink-0">
              <Icon className="size-3.5 text-foreground/70" strokeWidth={2} />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {meta.shortLabel}
            </span>
          </div>
          <p className="text-sm font-medium text-foreground">{goal.title}</p>
          {goal.detail && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {goal.detail}
            </p>
          )}
        </div>
        {canEdit && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
            {goal.status !== "done" && (
              <button
                type="button"
                onClick={markDone}
                disabled={pending}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 transition disabled:opacity-50"
                aria-label="Mark done"
              >
                <Check className="size-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onEdit}
              disabled={pending}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition disabled:opacity-50"
              aria-label="Edit goal"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition disabled:opacity-50"
              aria-label="Delete goal"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-3 flex items-center gap-3">
        <Slider
          value={[computedProgress]}
          onValueChange={(v) => {
            if (isCustom) setProgress(v[0]);
            else if (goal.targetValue) {
              setCurrentValue((v[0] / 100) * goal.targetValue);
            }
          }}
          onValueCommit={(v) => commitProgress(v[0])}
          max={100}
          step={5}
          className="flex-1"
          disabled={!canEdit}
        />
        <span className="text-xs font-medium text-foreground/70 tabular-nums w-9 text-right">
          {computedProgress}%
        </span>
      </div>

      {/* Value display for structured goals */}
      {displayValue && (
        <p className="mt-1.5 text-xs text-muted-foreground">{displayValue}</p>
      )}

      {/* Salt-derived progress (system_derived — written by me/goals/recompute.ts) */}
      {derivedProgress && (
        <p
          className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground"
          title={derivedProgress.tooltip}
        >
          <Sparkles className="size-3 shrink-0 text-primary/70" />
          <span>{derivedProgress.text}</span>
        </p>
      )}

      {/* Collapsible AI Progress section */}
      {hasAIProgress && (
        <div className="mt-3 border-t border-border/40 pt-3">
          <button
            type="button"
            onClick={() => setAiOpen(!aiOpen)}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition"
          >
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                aiOpen && "rotate-180",
              )}
            />
            <span>AI Progress</span>
            {goal.aiProgress?.recommendation && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                <Sparkles className="size-2" />
                Insight
              </span>
            )}
          </button>

          {aiOpen && (
            <div className="mt-3 space-y-2 text-sm">
              {goal.aiProgress?.summary && (
                <p className="text-muted-foreground">{goal.aiProgress.summary}</p>
              )}
              {goal.aiProgress?.recommendation && (
                <p className="text-foreground">{goal.aiProgress.recommendation}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Goal Form ──────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  goalType: "custom" as OperatorGoalType,
  targetValue: "",
  targetPeriod: "",
  periodType: "yearly" as GoalPeriodType,
  title: "",
  detail: "",
  horizon: "quarter" as OperatorGoalHorizon,
};

function formatNumberWithCommas(value: string): string {
  const num = value.replace(/,/g, "");
  if (!num || isNaN(Number(num))) return value;
  return Number(num).toLocaleString();
}

function parseFormattedNumber(value: string): string {
  return value.replace(/,/g, "");
}

const GOAL_TYPES = (
  Object.keys(GOAL_TYPE_META) as OperatorGoalType[]
).map((type) => ({
  type,
  meta: GOAL_TYPE_META[type],
  Icon: GOAL_TYPE_ICONS[type],
}));

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-foreground">{label}</span>
      {children}
      {hint ? (
        <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function GoalForm({
  goal,
  onClose,
}: {
  goal?: OperatorGoal;
  onClose: () => void;
}) {
  const isEdit = !!goal;
  const [form, setForm] = useState(() =>
    goal
      ? {
          goalType: goal.goalType,
          targetValue: goal.targetValue ? formatNumberWithCommas(goal.targetValue.toString()) : "",
          targetPeriod: goal.targetPeriod ?? "",
          periodType: detectPeriodType(goal.targetPeriod),
          title: goal.title,
          detail: goal.detail ?? "",
          horizon: goal.horizon,
        }
      : EMPTY_FORM,
  );
  const [pending, startTransition] = useTransition();

  const isCustom = form.goalType === "custom";
  const meta = GOAL_TYPE_META[form.goalType];
  const FormIcon = GOAL_TYPE_ICONS[form.goalType];
  const availablePeriodTypes = getAvailablePeriodTypes(form.goalType);
  const periodOptions = generatePeriodOptions(form.periodType);

  const rawTargetValue = parseFormattedNumber(form.targetValue);
  const canSubmit = isCustom
    ? form.title.trim().length > 0
    : rawTargetValue.length > 0 && parseFloat(rawTargetValue) > 0;

  const submit = () => {
    if (!canSubmit) return;

    startTransition(async () => {
      const parsedValue = parseFloat(rawTargetValue);
      if (isEdit) {
        const res = await updateOperatorGoal({
          id: goal.id,
          targetValue: isCustom ? undefined : parsedValue,
          targetPeriod: isCustom ? undefined : form.targetPeriod || undefined,
          title: form.title.trim(),
          detail: form.detail.trim() || undefined,
          horizon: form.horizon,
        });
        if (res.ok) {
          toast.success("Goal updated");
          onClose();
        } else {
          toast.error(res.message);
        }
      } else {
        const res = await createOperatorGoal({
          goalType: form.goalType,
          targetValue: isCustom ? undefined : parsedValue,
          targetUnit: isCustom ? undefined : meta.unit ?? undefined,
          targetPeriod: isCustom ? undefined : form.targetPeriod || undefined,
          title: isCustom ? form.title.trim() : undefined,
          detail: form.detail.trim() || undefined,
          horizon: form.horizon,
        });
        if (res.ok) {
          toast.success("Goal added");
          onClose();
        } else {
          toast.error(res.message);
        }
      }
    });
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border shadow-sm",
        isEdit
          ? "border-primary/30 bg-gradient-to-br from-card via-card to-primary/[0.04]"
          : "border-border/60 bg-gradient-to-br from-card via-card to-muted/20",
      )}
    >
      <div className="border-b border-border/40 bg-muted/20 px-4 py-3 sm:px-5">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <FormIcon className="size-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">
              {isEdit ? "Edit goal" : "New goal"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isCustom
                ? "Describe what you’re working toward and when."
                : `Set a ${meta.label.toLowerCase()} so Salt can track progress.`}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {!isEdit && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Goal type</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {GOAL_TYPES.map(({ type, meta: typeMeta, Icon }) => {
                const selected = form.goalType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        goalType: type,
                        periodType: getDefaultPeriodType(type),
                        targetPeriod: "",
                      }))
                    }
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3 text-left transition",
                      selected
                        ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                        : "border-border/60 bg-background/70 hover:border-border hover:bg-muted/30",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-lg",
                        selected
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">
                        {typeMeta.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                        {type === "custom"
                          ? "Any outcome you want to track"
                          : typeMeta.unit === "dollars"
                            ? "Track a dollar target"
                            : `Track in ${typeMeta.unit}`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border/50 bg-background/70 p-4 space-y-4">
          {!isCustom && meta.hasPeriods ? (
            <>
              {/* Period type selector */}
              <FormField label="Tracking period">
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  value={form.periodType}
                  onValueChange={(value) => {
                    if (!value) return;
                    setForm((prev) => ({
                      ...prev,
                      periodType: value as GoalPeriodType,
                      targetPeriod: "",
                    }));
                  }}
                  className="grid w-full grid-cols-3 gap-1"
                >
                  {availablePeriodTypes.map((pt) => (
                    <ToggleGroupItem
                      key={pt}
                      value={pt}
                      className={cn(
                        "h-9 flex-1 rounded-lg px-2 text-[11px] font-medium",
                        "data-[state=on]:border-primary/40 data-[state=on]:bg-primary/10 data-[state=on]:text-primary",
                      )}
                    >
                      {PERIOD_TYPE_LABELS[pt]}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </FormField>

              {/* Target amount and specific period */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  label={meta.unit === "dollars" ? "Target amount" : `Target (${meta.unit})`}
                  hint={meta.unit === "dollars" ? `e.g. $${Number(meta.placeholder).toLocaleString()}` : undefined}
                >
                  <div className="relative">
                    {meta.unit === "dollars" && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    )}
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={form.targetValue}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, "");
                        setForm((prev) => ({
                          ...prev,
                          targetValue: raw ? formatNumberWithCommas(raw) : "",
                        }));
                      }}
                      placeholder={Number(meta.placeholder).toLocaleString()}
                      className={meta.unit === "dollars" ? "pl-7" : undefined}
                      autoFocus={!isEdit}
                    />
                  </div>
                </FormField>

                <FormField label="When">
                  <InlineSelect
                    variant="field"
                    value={form.targetPeriod}
                    onChange={(v) =>
                      setForm((prev) => ({ ...prev, targetPeriod: v }))
                    }
                    options={periodOptions}
                    placeholder={`Select ${form.periodType === "monthly" ? "month" : form.periodType === "quarterly" ? "quarter" : "year"}`}
                  />
                </FormField>
              </div>
            </>
          ) : !isCustom ? (
            <FormField
              label={meta.unit === "dollars" ? "Target amount" : `Target (${meta.unit})`}
              hint={meta.unit === "dollars" ? `e.g. $${Number(meta.placeholder).toLocaleString()}` : meta.placeholder ? `e.g. ${meta.placeholder}` : undefined}
            >
              <div className="relative">
                {meta.unit === "dollars" && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                )}
                <Input
                  type="text"
                  inputMode="numeric"
                  value={form.targetValue}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    setForm((prev) => ({
                      ...prev,
                      targetValue: raw ? formatNumberWithCommas(raw) : "",
                    }));
                  }}
                  placeholder={meta.unit === "dollars" ? Number(meta.placeholder).toLocaleString() : meta.placeholder}
                  className={meta.unit === "dollars" ? "pl-7" : undefined}
                  autoFocus={!isEdit}
                />
              </div>
            </FormField>
          ) : null}

          {isCustom && (
            <>
              <FormField label="What are you driving toward?">
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Launch the new offer, hit inbox zero every Friday…"
                  autoFocus={!isEdit}
                />
              </FormField>

              <FormField label="Timeframe">
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  value={form.horizon}
                  onValueChange={(value) => {
                    if (!value) return;
                    setForm((prev) => ({
                      ...prev,
                      horizon: value as OperatorGoalHorizon,
                    }));
                  }}
                  className="grid w-full grid-cols-3 gap-1"
                >
                  {HORIZON_OPTIONS.map((opt) => (
                    <ToggleGroupItem
                      key={opt.value}
                      value={opt.value}
                      className={cn(
                        "h-9 flex-1 rounded-lg px-2 text-[11px] font-medium",
                        "data-[state=on]:border-primary/40 data-[state=on]:bg-primary/10 data-[state=on]:text-primary",
                      )}
                    >
                      {opt.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </FormField>
            </>
          )}

          <FormField
            label="Notes"
            hint="Optional context for Salt — why this matters or how you’ll measure it."
          >
            <Textarea
              value={form.detail}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, detail: e.target.value }))
              }
              placeholder="Any context Salt should know when prioritizing your work"
              rows={3}
              className="field-sizing-fixed min-h-[5.5rem] resize-y leading-relaxed"
            />
          </FormField>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border/40 px-4 py-3 sm:px-5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-muted-foreground"
          onClick={onClose}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-8 px-4"
          disabled={!canSubmit || pending}
          onClick={submit}
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : isEdit ? (
            "Save changes"
          ) : (
            "Add goal"
          )}
        </Button>
      </div>
    </div>
  );
}
