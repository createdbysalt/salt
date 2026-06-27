"use client";

import { useState, useTransition } from "react";
import {
  Loader2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Lock,
  Briefcase,
  Pencil,
} from "lucide-react";
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
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@repo/ui";
import { MemoryOverviewSection } from "@/app/_features/memory/components/MemoryOverviewSection";
import {
  AccountRow,
  InlineEditableText,
  InlineSelect,
  ReadOnlyDerivedValue,
} from "@/app/_features/memory/components/AccountFieldEditors";
import type { ProfileContextFacts } from "@/app/_features/plays/playbooks/records-engine/types";
import { MeWorkspaceDomains } from "../MeWorkspaceDomains";
import { updateOperatorIdentity } from "../../actions";
import {
  updateStudioProfile,
  createStudioService,
  updateStudioService,
  deleteStudioService,
} from "@/app/_features/workspace-settings/actions";
import type { OperatorIdentity, OperatorBusiness, OperatorBusinessService } from "../../types";

type MeOverviewTabProps = {
  identity: OperatorIdentity;
  business: OperatorBusiness;
  contextFacts: ProfileContextFacts;
};

export function MeOverviewTab({ identity, business, contextFacts }: MeOverviewTabProps) {
  return (
    <div className="space-y-10">
      <section>
        <SectionHeader>About You</SectionHeader>
        <div className="mt-4">
          <IdentitySection identity={identity} />
        </div>
      </section>

      <section>
        <SectionHeader>Business</SectionHeader>
        <div className="mt-4 space-y-6">
          <BusinessSection business={business} />
          <MeWorkspaceDomains initialFacts={contextFacts} />
          <ServicesSection services={business.services} canEdit={business.canEdit} />
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-2xl tracking-tight text-foreground">
      {children}
    </h2>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

const GENDER_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
] as const;

// ─── Identity Section ───────────────────────────────────────────────────────
function IdentitySection({ identity }: { identity: OperatorIdentity }) {
  const [, startTransition] = useTransition();

  const saveField = (field: string, value: string | null) => {
    startTransition(async () => {
      const update: Record<string, string | null | undefined> = {};
      update[field] = value;
      const res = await updateOperatorIdentity(update);
      if (!res.ok) toast.error(res.message);
    });
  };

  return (
    <div className="space-y-4">
      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <AccountRow label="Preferred name">
          <InlineEditableText
            value={identity.preferredName}
            onChange={(v) => saveField("preferredName", v)}
            placeholder="What should Salt call you?"
          />
        </AccountRow>
        <AccountRow label="Full name">
          <InlineEditableText
            value={identity.fullName}
            onChange={(v) => saveField("fullName", v)}
            placeholder="Your legal or display name"
          />
        </AccountRow>
        <AccountRow label="Gender">
          <InlineSelect
            value={identity.gender ?? ""}
            onChange={(v) => saveField("gender", v || null)}
            options={GENDER_OPTIONS}
            placeholder="Not specified"
          />
        </AccountRow>
        <AccountRow label="Role / title">
          <InlineEditableText
            value={identity.roleTitle}
            onChange={(v) => saveField("roleTitle", v)}
            placeholder="Founder, Designer, etc."
          />
        </AccountRow>
        <AccountRow label="Phone">
          <InlineEditableText
            value={identity.phone}
            onChange={(v) => saveField("phone", v)}
            placeholder="Add phone"
          />
        </AccountRow>
        <AccountRow label="Time zone">
          <InlineEditableText
            value={identity.timezone}
            onChange={(v) => saveField("timezone", v)}
            placeholder="America/New_York"
          />
        </AccountRow>
        <AccountRow label="Working hours">
          <InlineEditableText
            value={identity.workingHours}
            onChange={(v) => saveField("workingHours", v)}
            placeholder="9am–6pm ET"
          />
        </AccountRow>
        <AccountRow label="Location">
          <InlineEditableText
            value={identity.location}
            onChange={(v) => saveField("location", v)}
            placeholder="City, State"
          />
        </AccountRow>
        <AccountRow label="Credentials">
          <InlineEditableText
            value={identity.professionalCredentials}
            onChange={(v) => saveField("professionalCredentials", v)}
            placeholder="CPA, PMP, etc."
          />
        </AccountRow>
        <AccountRow label="Email">
          <ReadOnlyDerivedValue empty={!identity.email}>
            {identity.email || "Not set"}
          </ReadOnlyDerivedValue>
        </AccountRow>
        <AccountRow label="Company">
          <ReadOnlyDerivedValue empty={!identity.companyName}>
            {identity.companyName || "Not set"}
          </ReadOnlyDerivedValue>
        </AccountRow>
      </dl>

      {identity.currentFocus && (
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Current focus</p>
          <p className="mt-1 text-sm text-foreground leading-snug">{identity.currentFocus}</p>
        </div>
      )}

      {identity.emailSignature && (
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Email signature</p>
          <pre className="mt-1 text-sm text-foreground font-sans whitespace-pre-wrap leading-snug">{identity.emailSignature}</pre>
        </div>
      )}
    </div>
  );
}

const BUSINESS_TYPE_OPTIONS = [
  { value: "", label: "Select type" },
  { value: "sole_proprietor", label: "Sole Proprietor" },
  { value: "llc", label: "LLC" },
  { value: "corporation", label: "Corporation" },
  { value: "partnership", label: "Partnership" },
  { value: "nonprofit", label: "Nonprofit" },
] as const;

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
  { value: "CAD", label: "CAD" },
  { value: "AUD", label: "AUD" },
] as const;

const PAYMENT_TERMS_OPTIONS = [
  { value: "", label: "Select terms" },
  { value: "due_on_receipt", label: "Due on Receipt" },
  { value: "net_15", label: "Net 15" },
  { value: "net_30", label: "Net 30" },
  { value: "net_45", label: "Net 45" },
  { value: "net_60", label: "Net 60" },
] as const;

// ─── Business Section ───────────────────────────────────────────────────────
function BusinessSection({ business }: { business: OperatorBusiness }) {
  const { canEdit } = business;
  const [, startTransition] = useTransition();

  const saveField = (field: string, value: string | null) => {
    if (!canEdit) return;
    startTransition(async () => {
      const update: Record<string, string | null | undefined> = {};
      update[field] = value || null;
      const res = await updateStudioProfile(update);
      if ("error" in res && res.error) toast.error(res.error);
    });
  };

  const EditableField = ({ label, field, value, placeholder }: { label: string; field: string; value: string | null; placeholder: string }) => (
    <AccountRow label={label}>
      {canEdit ? (
        <InlineEditableText
          value={value ?? ""}
          onChange={(v) => saveField(field, v)}
          placeholder={placeholder}
        />
      ) : (
        <ReadOnlyDerivedValue empty={!value}>
          {value || "Not set"}
        </ReadOnlyDerivedValue>
      )}
    </AccountRow>
  );

  return (
    <div className="space-y-6">
      {!canEdit && (
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3 flex items-center gap-2">
          <Lock className="size-3.5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">Only owners and admins can edit.</p>
        </div>
      )}

      <Subsection title="Brand">
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <EditableField label="Brand name" field="name" value={business.name} placeholder="Your Company" />
          <EditableField label="Tagline" field="tagline" value={business.tagline} placeholder="What you do" />
          <EditableField label="Website" field="website_url" value={business.websiteUrl} placeholder="https://yoursite.com" />
          <EditableField label="Industry" field="industry" value={business.industry} placeholder="Design, Consulting, etc." />
        </dl>
      </Subsection>

      <Subsection title="Legal">
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <EditableField label="Legal name" field="legal_business_name" value={business.legalBusinessName} placeholder="Legal entity name" />
          <AccountRow label="Business type">
            {canEdit ? (
              <InlineSelect
                value={business.businessType ?? ""}
                onChange={(v) => saveField("business_type", v || null)}
                options={BUSINESS_TYPE_OPTIONS}
                placeholder="Select type"
              />
            ) : (
              <ReadOnlyDerivedValue empty={!business.businessType}>
                {BUSINESS_TYPE_OPTIONS.find(o => o.value === business.businessType)?.label || "Not set"}
              </ReadOnlyDerivedValue>
            )}
          </AccountRow>
          <EditableField label="Legal address" field="legal_address" value={business.legalAddress} placeholder="123 Main St, City, ST 12345" />
        </dl>
      </Subsection>

      <Subsection title="Contact">
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <EditableField label="Business phone" field="business_phone" value={business.businessPhone} placeholder="+1 (555) 123-4567" />
          <EditableField label="Business email" field="business_email" value={business.businessEmail} placeholder="hello@yourcompany.com" />
          <EditableField label="Location" field="location" value={business.location} placeholder="City, State" />
        </dl>
      </Subsection>

      <Subsection title="Tax & Billing">
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <EditableField label="Tax ID type" field="tax_id_type" value={business.taxIdType} placeholder="EIN, VAT, ABN" />
          <EditableField label="Tax ID (last 4)" field="tax_id_last4" value={business.taxIdLast4} placeholder="1234" />
          <AccountRow label="Currency">
            {canEdit ? (
              <InlineSelect
                value={business.defaultCurrency}
                onChange={(v) => saveField("default_currency", v)}
                options={CURRENCY_OPTIONS}
              />
            ) : (
              <ReadOnlyDerivedValue>
                {business.defaultCurrency}
              </ReadOnlyDerivedValue>
            )}
          </AccountRow>
          <AccountRow label="Payment terms">
            {canEdit ? (
              <InlineSelect
                value={business.paymentTerms ?? ""}
                onChange={(v) => saveField("payment_terms", v || null)}
                options={PAYMENT_TERMS_OPTIONS}
                placeholder="Select terms"
              />
            ) : (
              <ReadOnlyDerivedValue empty={!business.paymentTerms}>
                {PAYMENT_TERMS_OPTIONS.find(o => o.value === business.paymentTerms)?.label || "Not set"}
              </ReadOnlyDerivedValue>
            )}
          </AccountRow>
        </dl>
      </Subsection>
    </div>
  );
}

// ─── Services Section ───────────────────────────────────────────────────────
function ServicesSection({ services, canEdit }: { services: OperatorBusinessService[]; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<OperatorBusinessService | null>(null);
  const activeCount = services.filter((s) => s.isActive).length;

  return (
    <MemoryOverviewSection title="Services">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
              {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              <Briefcase className="size-4" />
              <span>{activeCount} service{activeCount !== 1 ? "s" : ""}</span>
            </button>
          </CollapsibleTrigger>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
              <Plus className="size-3.5" /> Add
            </Button>
          )}
        </div>

        <CollapsibleContent className="mt-3">
          {services.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-2.5">
              {services.map((s) => (
                <ServiceCard key={s.id} service={s} canEdit={canEdit} onEdit={() => setEditing(s)} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-6 text-center">
              <Briefcase className="mx-auto size-6 text-muted-foreground/60" strokeWidth={1.5} />
              <p className="mt-2 text-sm text-muted-foreground">No services yet.</p>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      <ServiceDialog open={addOpen} onOpenChange={setAddOpen} />
      <ServiceDialog
        open={editing !== null}
        onOpenChange={(v) => !v && setEditing(null)}
        service={editing ?? undefined}
      />
    </MemoryOverviewSection>
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

  const priceDisplay = service.basePriceCents
    ? `$${(service.basePriceCents / 100).toLocaleString()}`
    : service.priceMin
      ? `$${service.priceMin.toLocaleString()}${service.priceMax ? `–$${service.priceMax.toLocaleString()}` : "+"}`
      : null;

  return (
    <div className="rounded-xl border border-border/60 bg-card p-3 group">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{service.name}</p>
        {canEdit && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
            <button onClick={onEdit} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition" aria-label="Edit service">
              <Pencil className="size-3" />
            </button>
            <button onClick={remove} disabled={pending} className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition" aria-label="Delete service">
              <Trash2 className="size-3" />
            </button>
          </div>
        )}
      </div>
      {service.description && <p className="text-xs text-muted-foreground mt-1 leading-snug line-clamp-2">{service.description}</p>}
      {(priceDisplay || service.typicalTimeline) && (
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
          {priceDisplay && <span className="rounded-md bg-muted px-1.5 py-0.5">{priceDisplay}</span>}
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
  const [basePriceCents, setBasePriceCents] = useState(service?.basePriceCents ? (service.basePriceCents / 100).toString() : "");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!name.trim()) return;
    startTransition(async () => {
      const priceValue = basePriceCents ? Math.round(parseFloat(basePriceCents) * 100) : null;
      const payload = {
        name,
        description: description || null,
        typical_timeline: typicalTimeline || null,
        base_price_cents: priceValue,
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
          <LabeledInput label="Service name" value={name} onChange={setName} placeholder="Brand Identity" autoFocus />
          <LabeledTextarea label="Description" value={description} onChange={setDescription} placeholder="What's included?" rows={2} />
          <div className="grid sm:grid-cols-2 gap-3">
            <LabeledInput label="Base price ($)" value={basePriceCents} onChange={setBasePriceCents} placeholder="8000" type="number" />
            <LabeledInput label="Typical timeline" value={typicalTimeline} onChange={setTypicalTimeline} placeholder="2–4 weeks" />
          </div>
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
function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <Input className="mt-1.5" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type} autoFocus={autoFocus} />
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
