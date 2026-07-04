"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Target } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Textarea } from "@repo/ui";
import { cn } from "@repo/utils";
import { MemoryOverviewSection } from "@/app/_features/memory/components/MemoryOverviewSection";
import type { ICPSegment } from "../types";
import { createICPSegment, updateICPSegment } from "../actions/icp-segments";
import { ICPSegmentCard } from "./ICPSegmentCard";

type ICPSegmentsSectionProps = {
  segments: ICPSegment[];
  canEdit: boolean;
};

const EMPTY_FORM = {
  name: "",
  description: "",
  painPoints: "",
  desiredOutcomes: "",
  budgetSignal: "",
  targetIndustry: "",
};

export function ICPSegmentsSection({
  segments: initialSegments,
  canEdit,
}: ICPSegmentsSectionProps) {
  const router = useRouter();
  const [segments, setSegments] = useState(initialSegments);
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pending, startTransition] = useTransition();

  // Sync local state when props change (e.g., after router.refresh())
  useEffect(() => {
    setSegments(initialSegments);
  }, [initialSegments]);

  const resetForm = () => setForm(EMPTY_FORM);

  const openAdd = () => {
    setEditingId(null);
    resetForm();
    setAddOpen(true);
  };

  const openEdit = (segment: ICPSegment) => {
    setAddOpen(false);
    setEditingId(segment.id);
    setForm({
      name: segment.name,
      description: segment.description ?? "",
      painPoints: segment.painPoints.join(", "),
      desiredOutcomes: segment.desiredOutcomes.join(", "),
      budgetSignal: segment.budgetSignal ?? "",
      targetIndustry: segment.targetIndustry ?? "",
    });
  };

  const closeForm = () => {
    setAddOpen(false);
    setEditingId(null);
    resetForm();
  };

  const parseList = (value: string): string[] =>
    value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const submitForm = () => {
    const name = form.name.trim();
    if (!name) return;

    startTransition(async () => {
      const payload = {
        name,
        description: form.description.trim() || null,
        painPoints: parseList(form.painPoints),
        desiredOutcomes: parseList(form.desiredOutcomes),
        budgetSignal: form.budgetSignal.trim() || null,
        targetIndustry: form.targetIndustry.trim() || null,
      };

      if (editingId) {
        const res = await updateICPSegment({ id: editingId, ...payload });
        if (!res.ok) {
          toast.error(res.message);
          return;
        }
        setSegments((prev) =>
          prev.map((s) => (s.id === editingId ? res.segment : s)),
        );
        toast.success("ICP segment updated");
      } else {
        const res = await createICPSegment(payload);
        if (!res.ok) {
          toast.error(res.message);
          return;
        }
        setSegments((prev) => [...prev, res.segment]);
        toast.success("ICP segment added");
      }

      closeForm();
      router.refresh();
    });
  };

  const handleSegmentUpdate = (id: string, updated: ICPSegment | null) => {
    if (updated === null) {
      setSegments((prev) => prev.filter((s) => s.id !== id));
    } else {
      setSegments((prev) => prev.map((s) => (s.id === id ? updated : s)));
    }
    router.refresh();
  };

  // Separate active and proposed segments
  const activeSegments = segments.filter((s) => s.status === "active");
  const proposedSegments = segments.filter((s) => s.status === "proposed");

  return (
    <MemoryOverviewSection
      title="Ideal Customers"
      variant="heading"
      actions={
        canEdit && !addOpen && editingId === null ? (
          <Button size="sm" variant="outline" onClick={openAdd}>
            <Plus className="size-3.5" /> Add segment
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {/* Add form */}
        {canEdit && addOpen && (
          <ICPSegmentForm
            title="New ICP segment"
            form={form}
            setForm={setForm}
            isPending={pending}
            submitLabel="Save segment"
            onSubmit={submitForm}
            onCancel={closeForm}
          />
        )}

        {/* Proposed segments (show first with emphasis) */}
        {proposedSegments.length > 0 && (
          <div className="space-y-3">
            {proposedSegments.map((segment) =>
              editingId === segment.id ? (
                <ICPSegmentForm
                  key={segment.id}
                  title="Edit segment"
                  form={form}
                  setForm={setForm}
                  isPending={pending}
                  submitLabel="Save changes"
                  onSubmit={submitForm}
                  onCancel={closeForm}
                  variant="edit"
                />
              ) : (
                <ICPSegmentCard
                  key={segment.id}
                  segment={segment}
                  canEdit={canEdit}
                  onEdit={() => openEdit(segment)}
                  onUpdate={(updated) => handleSegmentUpdate(segment.id, updated)}
                />
              ),
            )}
          </div>
        )}

        {/* Active segments */}
        {activeSegments.length > 0 ? (
          <div className="space-y-3">
            {activeSegments.map((segment) =>
              editingId === segment.id ? (
                <ICPSegmentForm
                  key={segment.id}
                  title="Edit segment"
                  form={form}
                  setForm={setForm}
                  isPending={pending}
                  submitLabel="Save changes"
                  onSubmit={submitForm}
                  onCancel={closeForm}
                  variant="edit"
                />
              ) : (
                <ICPSegmentCard
                  key={segment.id}
                  segment={segment}
                  canEdit={canEdit}
                  onEdit={() => openEdit(segment)}
                  onUpdate={(updated) => handleSegmentUpdate(segment.id, updated)}
                />
              ),
            )}
          </div>
        ) : !addOpen && proposedSegments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-8 text-center">
            <Target className="mx-auto size-8 text-muted-foreground/60" strokeWidth={1.5} />
            <p className="mt-2 text-sm text-muted-foreground">
              No ideal customer profiles yet.
            </p>
            <p className="mt-1 text-xs text-muted-foreground/80">
              Salt will learn your ideal customers as you work with clients.
            </p>
            {canEdit && (
              <Button size="sm" variant="outline" className="mt-4" onClick={openAdd}>
                <Plus className="size-3.5" /> Add segment
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </MemoryOverviewSection>
  );
}

// ─── Form Component ─────────────────────────────────────────────────────────

function SegmentFormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
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

function ICPSegmentForm({
  title,
  form,
  setForm,
  isPending,
  submitLabel,
  onSubmit,
  onCancel,
  variant = "add",
}: {
  title: string;
  form: typeof EMPTY_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
  isPending: boolean;
  submitLabel: string;
  onSubmit: () => void;
  onCancel: () => void;
  variant?: "add" | "edit";
}) {
  const isEdit = variant === "edit";

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
            <Target className="size-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isEdit
                ? "Refine who you serve best so Salt can tailor outreach and plays."
                : "Describe an ideal customer segment Salt should prioritize."}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="rounded-xl border border-border/50 bg-background/70 p-4 space-y-4">
          <SegmentFormField label="Segment name">
            <Input
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Tech startups (Seed–A)"
              autoFocus
            />
          </SegmentFormField>

          <SegmentFormField label="Description">
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Who they are, what stage they're at, and why they're a fit"
              rows={2}
              className="field-sizing-fixed min-h-[4.5rem] resize-y leading-relaxed"
            />
          </SegmentFormField>

          <SegmentFormField
            label="Pain points"
            hint="Separate with commas — what keeps them up at night"
          >
            <Input
              value={form.painPoints}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, painPoints: e.target.value }))
              }
              placeholder="Outgrew DIY branding, need to look legit for investors"
            />
          </SegmentFormField>

          <SegmentFormField
            label="Desired outcomes"
            hint="Separate with commas — what success looks like for them"
          >
            <Input
              value={form.desiredOutcomes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, desiredOutcomes: e.target.value }))
              }
              placeholder="Investor-ready brand, scalable design system"
            />
          </SegmentFormField>

          <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
            <label className="text-xs font-medium text-foreground">
              Budget signal
            </label>
            <label className="text-xs font-medium text-foreground">
              Target industry
            </label>

            <Input
              value={form.budgetSignal}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, budgetSignal: e.target.value }))
              }
              placeholder="$15k–40k"
            />
            <Input
              value={form.targetIndustry}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, targetIndustry: e.target.value }))
              }
              placeholder="Technology, SaaS"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border/40 px-4 py-3 sm:px-5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-muted-foreground"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-8 px-4"
          disabled={!form.name.trim() || isPending}
          onClick={onSubmit}
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </div>
  );
}
