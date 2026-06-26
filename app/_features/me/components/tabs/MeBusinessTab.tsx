"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, Check, X, Plus, Trash2, Briefcase, Lock } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Input,
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@repo/ui";
import {
  updateStudioProfile,
  createStudioService,
  updateStudioService,
  deleteStudioService,
} from "@/app/_features/workspace-settings/actions";
import { SectionCard } from "../MeSection";
import type { OperatorBusiness, OperatorBusinessService } from "../../types";

export function MeBusinessTab({ business }: { business: OperatorBusiness }) {
  const { canEdit } = business;

  return (
    <div className="space-y-8">
      {!canEdit && (
        <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 flex items-center gap-3">
          <Lock className="size-4 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground">
            This is your workspace&apos;s shared context. Only owners and admins can edit it.
          </p>
        </div>
      )}

      <BusinessProfile business={business} canEdit={canEdit} />
      <BusinessServices services={business.services} canEdit={canEdit} />
    </div>
  );
}

// ─── Profile ────────────────────────────────────────────────────────────────
function BusinessProfile({ business, canEdit }: { business: OperatorBusiness; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: business.name,
    tagline: business.tagline ?? "",
    description: business.description ?? "",
    website_url: business.websiteUrl ?? "",
    location: business.location ?? "",
  });
  const [pending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      const res = await updateStudioProfile(form);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Business updated");
      setEditing(false);
    });
  };

  return (
    <SectionCard
      eyebrow="Your business"
      title="What you do"
      description="The shared context Salt reads to represent your business."
      action={
        canEdit ? (
          editing ? (
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
                <X className="size-4" /> Cancel
              </Button>
              <Button size="sm" onClick={save} disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Save
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="size-3.5" /> Edit
            </Button>
          )
        ) : undefined
      }
    >
      {editing ? (
        <div className="space-y-3">
          <Labeled label="Business name"><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></Labeled>
          <Labeled label="Tagline"><Input value={form.tagline} onChange={(e) => setForm((p) => ({ ...p, tagline: e.target.value }))} placeholder="One line on what you do" /></Labeled>
          <Labeled label="Description"><Textarea rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></Labeled>
          <div className="grid sm:grid-cols-2 gap-3">
            <Labeled label="Website"><Input value={form.website_url} onChange={(e) => setForm((p) => ({ ...p, website_url: e.target.value }))} placeholder="https://" /></Labeled>
            <Labeled label="Location"><Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} /></Labeled>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <p className="text-base font-semibold text-foreground">{business.name || "Unnamed workspace"}</p>
            {business.tagline && <p className="text-sm text-muted-foreground mt-0.5">{business.tagline}</p>}
            {business.description && <p className="text-sm text-foreground/80 mt-2 leading-relaxed">{business.description}</p>}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <ReadField label="Website" value={business.websiteUrl} />
            <ReadField label="Location" value={business.location} />
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ─── Services ───────────────────────────────────────────────────────────────
function BusinessServices({ services, canEdit }: { services: OperatorBusinessService[]; canEdit: boolean }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<OperatorBusinessService | null>(null);

  return (
    <SectionCard
      eyebrow="Services"
      title="What you offer"
      description="Salt references these when scoping work and drafting proposals."
      action={
        canEdit ? (
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus className="size-3.5" /> Add service
          </Button>
        ) : undefined
      }
    >
      {services.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-2.5">
          {services.map((s) => (
            <ServiceCard key={s.id} service={s} canEdit={canEdit} onEdit={() => setEditing(s)} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-8 text-center">
          <Briefcase className="mx-auto size-8 text-muted-foreground/60" strokeWidth={1.5} />
          <p className="mt-2 text-sm text-muted-foreground">No services yet.</p>
        </div>
      )}

      <ServiceDialog open={addOpen} onOpenChange={setAddOpen} />
      <ServiceDialog
        open={editing !== null}
        onOpenChange={(v) => !v && setEditing(null)}
        service={editing ?? undefined}
      />
    </SectionCard>
  );
}

function ServiceCard({
  service,
  canEdit,
  onEdit,
}: {
  service: OperatorBusinessService;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const remove = () =>
    startTransition(async () => {
      const res = await deleteStudioService(service.id);
      if ("error" in res && res.error) toast.error(res.error);
      else toast("Service removed");
    });

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 group">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{service.name}</p>
        {canEdit && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
            <button onClick={onEdit} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition" aria-label="Edit service">
              <Pencil className="size-3.5" />
            </button>
            <button onClick={remove} disabled={pending} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition" aria-label="Delete service">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
      </div>
      {service.description && <p className="text-xs text-muted-foreground mt-1 leading-snug">{service.description}</p>}
      {(service.pricingType || service.typicalTimeline) && (
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
          {service.pricingType && <span className="rounded-md bg-muted px-1.5 py-0.5">{service.pricingType}</span>}
          {service.typicalTimeline && <span className="rounded-md bg-muted px-1.5 py-0.5">{service.typicalTimeline}</span>}
        </div>
      )}
    </div>
  );
}

function ServiceDialog({
  open,
  onOpenChange,
  service,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  service?: OperatorBusinessService;
}) {
  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [typicalTimeline, setTypicalTimeline] = useState(service?.typicalTimeline ?? "");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!name.trim()) return;
    startTransition(async () => {
      const payload = {
        name,
        description: description || null,
        typical_timeline: typicalTimeline || null,
        currency: "USD" as const,
        is_active: true,
      };
      const res = service
        ? await updateStudioService(service.id, payload)
        : await createStudioService(payload);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(service ? "Service updated" : "Service added");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{service ? "Edit service" : "Add service"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Service name" autoFocus />
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's included?" rows={2} />
          <Input value={typicalTimeline} onChange={(e) => setTypicalTimeline(e.target.value)} placeholder="Typical timeline (e.g. 2–4 weeks)" />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!name.trim() || pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {service ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Small helpers ──────────────────────────────────────────────────────────
function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function ReadField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value || <span className="text-muted-foreground italic">Not set</span>}</p>
    </div>
  );
}
