"use client";

import type { ReactNode } from "react";
import {
  Mail,
  AtSign,
  Slack,
  CreditCard,
  FileText,
  Linkedin,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Pencil,
  MessageSquare,
  Phone,
  Smartphone,
  Clock,
  ShieldOff,
  Target,
  Check,
  X,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@repo/utils";
import {
  ME,
  AUTONOMY_META,
  type ChannelPreference,
  type ConnectedAccount,
  type Goal,
  type SaltMemoryFact,
  type MeActivityEntry,
} from "../data";

const PROVIDER_ICON: Record<string, typeof Mail> = {
  "Google Calendar": Calendar,
  Gmail: Mail,
  Slack: Slack,
  Stripe: CreditCard,
  Notion: FileText,
  LinkedIn: Linkedin,
};

const STATUS_META: Record<ConnectedAccount["status"], { label: string; tone: string; icon: typeof CheckCircle2 }> = {
  connected: { label: "Connected", tone: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30", icon: CheckCircle2 },
  needs_reauth: { label: "Reauth needed", tone: "text-flame bg-flame/10 border-flame/30", icon: AlertTriangle },
  disconnected: { label: "Disconnected", tone: "text-muted-foreground bg-muted border-border", icon: XCircle },
};

const CHANNEL_ICON: Record<ChannelPreference["channel"], typeof Mail> = {
  Slack: Slack,
  Email: Mail,
  iMessage: MessageSquare,
  WhatsApp: Smartphone,
  Phone: Phone,
};

const SOURCE_TONE: Record<SaltMemoryFact["source"], string> = {
  you: "bg-muted text-foreground/70 border-border/60",
  imported: "bg-muted text-foreground/70 border-border/60",
  salt_inferred: "bg-flame/10 text-flame border-flame/30",
};

function SectionCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        {eyebrow && (
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-1 font-display text-2xl tracking-tight text-foreground">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

// ─── Overview ───────────────────────────────────────────────
export function MeOverviewTab() {
  return (
    <div className="space-y-8">
      <SectionCard
        eyebrow="Identity"
        title="Who you are to Salt"
        description="Used to sign messages, set tone, and route the right things to you."
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Pronouns" value={ME.pronouns} />
          <Field label="Time zone" value={ME.timezone} />
          <Field label="Working hours" value={ME.workingHours} />
          <Field label="Location" value={ME.location} />
        </div>

        <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Email signature</p>
          <pre className="mt-2 text-sm text-foreground font-sans whitespace-pre-wrap leading-snug">{ME.signature}</pre>
        </div>

        <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Tone</p>
          <p className="mt-2 text-sm text-foreground leading-snug">{ME.tone}</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Identities Salt watches</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ME.identities.map((id) => (
              <span key={id} className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card px-2 py-1 text-[12px] text-foreground/80">
                <AtSign className="size-3 text-muted-foreground" />
                {id}
              </span>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Accounts"
        title="Connected sources"
        description="Where Salt pulls signals from. Reauth or disconnect anytime."
      >
        <div className="grid sm:grid-cols-2 gap-2.5">
          {ME.accounts.map((a) => {
            const Icon = PROVIDER_ICON[a.provider] ?? Mail;
            const status = STATUS_META[a.status];
            const StatusIcon = status.icon;
            return (
              <div
                key={a.provider}
                className="rounded-2xl border border-border/60 bg-card p-4 flex items-start gap-3"
              >
                <span className="size-9 rounded-xl bg-muted grid place-items-center shrink-0">
                  <Icon className="size-4 text-foreground/70" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{a.provider}</p>
                    <span className={cn("inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-medium", status.tone)}>
                      <StatusIcon className="size-2.5" />
                      {status.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{a.identifier}</p>
                  {a.lastSyncedRelative && (
                    <p className="text-[11px] text-muted-foreground/80 mt-1">Last sync · {a.lastSyncedRelative}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  );
}

// ─── Preferences ────────────────────────────────────────────
export function MePreferencesTab() {
  return (
    <div className="space-y-8">
      <SectionCard
        eyebrow="Autonomy"
        title="What Salt can do on its own"
        description="Per-scope rules. Salt respects these for every action it takes for you."
      >
        <div className="space-y-2">
          {ME.autonomyRules.map((r) => {
            const meta = AUTONOMY_META[r.level];
            return (
              <div key={r.id} className="rounded-2xl border border-border/60 bg-card p-4 flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{r.scope}</p>
                  {r.detail && <p className="mt-1 text-xs text-muted-foreground leading-snug">{r.detail}</p>}
                </div>
                <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-wider font-semibold shrink-0", meta.tone)}>
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Channels"
        title="How specific people prefer to hear from you"
        description="Salt uses these when drafting outreach."
      >
        <div className="grid sm:grid-cols-2 gap-2.5">
          {ME.channelPreferences.map((c) => {
            const Icon = CHANNEL_ICON[c.channel];
            return (
              <div key={c.contactName} className="rounded-2xl border border-border/60 bg-card p-4 flex items-start gap-3">
                <span className="size-9 rounded-xl bg-muted grid place-items-center shrink-0">
                  <Icon className="size-4 text-foreground/70" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{c.contactName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Prefers {c.channel}</p>
                  {c.note && <p className="text-[11px] text-muted-foreground/80 italic mt-1">&quot;{c.note}&quot;</p>}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard eyebrow="Boundaries" title="Quiet hours & do-not-contact">
        <div className="rounded-2xl border border-border/60 bg-card p-4 flex items-start gap-3">
          <span className="size-9 rounded-xl bg-muted grid place-items-center shrink-0">
            <Clock className="size-4 text-foreground/70" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Quiet hours</p>
            <p className="mt-1 text-sm text-foreground leading-snug">{ME.quietHours}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4 flex items-start gap-3">
          <span className="size-9 rounded-xl bg-destructive/10 text-destructive grid place-items-center shrink-0">
            <ShieldOff className="size-4" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Do not contact</p>
            <ul className="mt-1.5 space-y-1">
              {ME.doNotContact.map((d) => (
                <li key={d} className="text-sm text-foreground">{d}</li>
              ))}
            </ul>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Goals ──────────────────────────────────────────────────
const HORIZON_META: Record<Goal["horizon"], { label: string; tone: string }> = {
  this_week: { label: "This week", tone: "bg-sky/15 text-sky border-sky/30" },
  this_quarter: { label: "This quarter", tone: "bg-flame/15 text-flame border-flame/30" },
  this_year: { label: "This year", tone: "bg-violet/15 text-violet border-violet/30" },
};

export function MeGoalsTab() {
  return (
    <SectionCard
      eyebrow="Focus"
      title="What you're driving"
      description="Salt prioritizes plays, insights, and spaces that move these forward."
    >
      <div className="space-y-2.5">
        {ME.goals.map((g) => {
          const meta = HORIZON_META[g.horizon];
          return (
            <div key={g.id} className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="flex items-start gap-3">
                <span className="size-9 rounded-xl bg-muted grid place-items-center shrink-0">
                  <Target className="size-4 text-foreground/70" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold", meta.tone)}>
                      {meta.label}
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-foreground leading-snug">{g.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-snug">{g.detail}</p>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full surface-aurora" style={{ width: `${g.progress}%` }} />
                    </div>
                    <span className="text-xs font-medium text-foreground/70 tabular-nums">{g.progress}%</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ─── Salt Memory ────────────────────────────────────────────
export function MeSaltMemoryTab() {
  return (
    <SectionCard
      eyebrow="What Salt knows"
      title="Memory about you"
      description="Every fact Salt has stored about how you work. Correct anything that's wrong."
    >
      <div className="space-y-2">
        {ME.saltMemory.map((m) => (
          <SaltMemoryRow key={m.id} memory={m} />
        ))}
      </div>
    </SectionCard>
  );
}

function SaltMemoryRow({ memory }: { memory: SaltMemoryFact }) {
  const sourceLabel = memory.source === "you" ? "You" : memory.source === "imported" ? "Imported" : "Salt";
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-start gap-3">
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold shrink-0", SOURCE_TONE[memory.source])}>
          {memory.source === "salt_inferred" && <Sparkles className="size-2.5" strokeWidth={2.25} />}
          {sourceLabel}
        </span>
        <p className="text-sm text-foreground leading-snug flex-1">{memory.fact}</p>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>{memory.sourceLabel}</span>
          <span aria-hidden>·</span>
          <span>{memory.freshness}</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Sparkles className="size-3 text-flame" strokeWidth={2.25} />
            {memory.confidence}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => toast("Edit (coming soon)")} className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition">
            <Pencil className="size-3" /> Edit
          </button>
          <button type="button" onClick={() => toast("Confirmed — Salt will keep using this")} className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition">
            <Check className="size-3 text-emerald-600" /> Confirm
          </button>
          <button type="button" onClick={() => toast("We'll remember this — wiring coming soon")} className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition">
            <RotateCcw className="size-3" /> Revise
          </button>
          <button type="button" onClick={() => toast.success("Removed from Memory")} className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card px-2 py-1 text-[11px] text-muted-foreground hover:text-destructive transition">
            <X className="size-3" /> Forget
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Activity ───────────────────────────────────────────────
const CHANNEL_DOT: Record<MeActivityEntry["channel"], string> = {
  Plays: "bg-flame",
  Convos: "bg-sky",
  Capture: "bg-violet",
  Spaces: "bg-blush",
  Memory: "bg-foreground/60",
  Meetings: "bg-emerald-500",
};

export function MeActivityTab() {
  return (
    <SectionCard eyebrow="Activity" title="Your recent moves across Salt">
      <div className="space-y-1">
        {ME.activity.map((a) => (
          <div key={a.id} className="flex items-start gap-3 rounded-xl border border-transparent hover:border-border/60 hover:bg-muted/30 px-3 py-2.5 transition">
            <span className={cn("size-2 rounded-full mt-1.5 shrink-0", CHANNEL_DOT[a.channel])} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground leading-snug">{a.summary}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {a.channel} · {a.when}
              </p>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
