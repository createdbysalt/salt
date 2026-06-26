"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Textarea } from "@repo/ui";
import type { ProfileContextFacts } from "@/app/_features/plays/playbooks/profile/types";
import { SectionCard } from "../MeSection";
import { MeWorkspaceDomains } from "../MeWorkspaceDomains";
import { updateOperatorIdentity } from "../../actions";
import type { OperatorIdentity } from "../../types";

type IdentityForm = {
  roleTitle: string;
  tagline: string;
  timezone: string;
  location: string;
  workingHours: string;
  currentFocus: string;
  emailSignature: string;
};

function toForm(identity: OperatorIdentity): IdentityForm {
  return {
    roleTitle: identity.roleTitle,
    tagline: identity.tagline,
    timezone: identity.timezone,
    location: identity.location,
    workingHours: identity.workingHours,
    currentFocus: identity.currentFocus,
    emailSignature: identity.emailSignature,
  };
}

export function MeOverviewTab({
  identity,
  contextFacts,
}: {
  identity: OperatorIdentity;
  contextFacts: ProfileContextFacts;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<IdentityForm>(toForm(identity));
  const [pending, startTransition] = useTransition();

  const update = (key: keyof IdentityForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const save = () => {
    startTransition(async () => {
      const res = await updateOperatorIdentity(form);
      if (res.ok) {
        toast.success("Profile updated");
        setEditing(false);
      } else {
        toast.error(res.message);
      }
    });
  };

  const cancel = () => {
    setForm(toForm(identity));
    setEditing(false);
  };

  return (
    <div className="space-y-8">
      <SectionCard
        eyebrow="Identity"
        title="Who you are to Salt"
        description="Used to sign messages, set tone, and route the right things to you."
        action={
          editing ? (
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="ghost" onClick={cancel} disabled={pending}>
                <X className="size-4" /> Cancel
              </Button>
              <Button size="sm" onClick={save} disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                Save
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="size-3.5" /> Edit
            </Button>
          )
        }
      >
        {editing ? (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <LabeledInput label="Role / title" value={form.roleTitle} onChange={(v) => update("roleTitle", v)} placeholder="Founder & operator" />
              <LabeledInput label="Time zone" value={form.timezone} onChange={(v) => update("timezone", v)} placeholder="America/New_York" />
              <LabeledInput label="Working hours" value={form.workingHours} onChange={(v) => update("workingHours", v)} placeholder="9–6 ET · deep work mornings" />
              <LabeledInput label="Location" value={form.location} onChange={(v) => update("location", v)} placeholder="Brooklyn, NY" />
            </div>
            <LabeledTextarea label="Tagline" value={form.tagline} onChange={(v) => update("tagline", v)} placeholder="One line that captures how you work." rows={2} />
            <LabeledTextarea label="Current focus" value={form.currentFocus} onChange={(v) => update("currentFocus", v)} placeholder="What you're driving right now." rows={2} />
            <LabeledTextarea label="Email signature" value={form.emailSignature} onChange={(v) => update("emailSignature", v)} placeholder={"— Your name\nTitle · company"} rows={3} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Role / title" value={identity.roleTitle} />
              <Field label="Time zone" value={identity.timezone} />
              <Field label="Working hours" value={identity.workingHours} />
              <Field label="Location" value={identity.location} />
            </div>

            {identity.currentFocus && (
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Current focus</p>
                <p className="mt-2 text-sm text-foreground leading-snug">{identity.currentFocus}</p>
              </div>
            )}

            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Email signature</p>
              {identity.emailSignature ? (
                <pre className="mt-2 text-sm text-foreground font-sans whitespace-pre-wrap leading-snug">{identity.emailSignature}</pre>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground italic">No signature yet — add one so Salt can sign as you.</p>
              )}
            </div>
          </div>
        )}
      </SectionCard>

      <MeWorkspaceDomains initialFacts={contextFacts} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value || <span className="text-muted-foreground italic">Not set</span>}</p>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <Input className="mt-1.5" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

function LabeledTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <Textarea className="mt-1.5" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} />
    </label>
  );
}
