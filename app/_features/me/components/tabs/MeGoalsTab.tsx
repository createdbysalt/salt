"use client";

import { useState, useTransition } from "react";
import { Target, Plus, Loader2, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Input,
  Textarea,
  Slider,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@repo/ui";
import { cn } from "@repo/utils";
import { SectionCard } from "../MeSection";
import {
  createOperatorGoal,
  deleteOperatorGoal,
  updateOperatorGoal,
} from "../../actions";
import type { OperatorGoal, OperatorGoalHorizon } from "../../types";

const HORIZON_META: Record<OperatorGoalHorizon, { label: string; tone: string }> = {
  week: { label: "This week", tone: "bg-sky/15 text-sky border-sky/30" },
  quarter: { label: "This quarter", tone: "bg-flame/15 text-flame border-flame/30" },
  year: { label: "This year", tone: "bg-violet/15 text-violet border-violet/30" },
};

export function MeGoalsTab({ goals }: { goals: OperatorGoal[] }) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <SectionCard
      eyebrow="Focus"
      title="What you're driving"
      description="Salt prioritizes plays and insights that move these forward."
      action={
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          <Plus className="size-3.5" /> Add goal
        </Button>
      }
    >
      {goals.length > 0 ? (
        <div className="space-y-2.5">
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-8 text-center">
          <Target className="mx-auto size-8 text-muted-foreground/60" strokeWidth={1.5} />
          <p className="mt-2 text-sm text-muted-foreground">No goals yet.</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Add what you&apos;re driving so Salt can prioritize around it.
          </p>
        </div>
      )}

      <AddGoalDialog open={addOpen} onOpenChange={setAddOpen} />
    </SectionCard>
  );
}

function GoalCard({ goal }: { goal: OperatorGoal }) {
  const [progress, setProgress] = useState(goal.progress);
  const [pending, startTransition] = useTransition();
  const meta = HORIZON_META[goal.horizon];

  const commitProgress = (value: number) => {
    setProgress(value);
    startTransition(async () => {
      const res = await updateOperatorGoal({ id: goal.id, progress: value });
      if (!res.ok) toast.error(res.message);
    });
  };

  const markDone = () => {
    startTransition(async () => {
      const res = await updateOperatorGoal({ id: goal.id, status: "done", progress: 100 });
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

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 group">
      <div className="flex items-start gap-3">
        <span className="size-9 rounded-xl bg-muted grid place-items-center shrink-0">
          <Target className="size-4 text-foreground/70" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold", meta.tone)}>
              {meta.label}
            </span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
              {goal.status !== "done" && (
                <button onClick={markDone} disabled={pending} className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 transition" aria-label="Mark done">
                  <Check className="size-3.5" />
                </button>
              )}
              <button onClick={remove} disabled={pending} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition" aria-label="Delete goal">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
          <h3 className="mt-2 text-base font-semibold text-foreground leading-snug">{goal.title}</h3>
          {goal.detail && <p className="mt-1 text-sm text-muted-foreground leading-snug">{goal.detail}</p>}

          <div className="mt-3 flex items-center gap-3">
            <Slider
              value={[progress]}
              onValueChange={(v) => setProgress(v[0])}
              onValueCommit={(v) => commitProgress(v[0])}
              max={100}
              step={5}
              className="flex-1"
            />
            <span className="text-xs font-medium text-foreground/70 tabular-nums w-9 text-right">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddGoalDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [horizon, setHorizon] = useState<OperatorGoalHorizon>("quarter");
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setTitle("");
    setDetail("");
    setHorizon("quarter");
  };

  const submit = () => {
    if (!title.trim()) return;
    startTransition(async () => {
      const res = await createOperatorGoal({ title, detail, horizon });
      if (res.ok) {
        toast.success("Goal added");
        reset();
        onOpenChange(false);
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a goal</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you driving?" autoFocus />
          <Textarea value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Optional detail or context" rows={2} />
          <Select value={horizon} onValueChange={(v) => setHorizon(v as OperatorGoalHorizon)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This week</SelectItem>
              <SelectItem value="quarter">This quarter</SelectItem>
              <SelectItem value="year">This year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!title.trim() || pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Add goal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
