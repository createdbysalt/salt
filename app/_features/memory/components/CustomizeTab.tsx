"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Building2,
  Briefcase,
  CalendarDays,
  FileText,
  Gauge,
  Layers,
  Loader2,
  Plus,
  Receipt,
  Sparkles,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@repo/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
} from "@repo/ui";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { useClientMounted } from "@/app/_lib/hooks/use-client-mounted";
import {
  EXAMPLE_ENTRIES,
  MEMORY_CUSTOMIZE_GENERAL_SCOPE,
  MEMORY_CUSTOMIZE_SCOPE_LABELS,
  MEMORY_CUSTOMIZE_SCOPE_TITLES,
  MEMORY_CUSTOMIZE_SCOPES,
  defaultGuidanceForScope,
  headerDescriptionForScope,
  type DefaultGuidance,
  type MemoryCustomizeEntityType,
  type MemoryCustomizeScope,
} from "../customize/default-guidance";
import {
  getFieldsForEntity,
  getWritePolicy,
  type WritePolicy,
} from "../taxonomy/field-registry";
import {
  addCustomizeEntry,
  revertCustomizeEntry,
} from "../customize/actions";
import { detectHardExclusion } from "../customize/hard-exclusion";
import type { CustomizeEntry } from "../customize/queries";
import { buildMemoryPath } from "../memory-tab-routing";
import { updateMemoryCareThreshold } from "../care/actions";
import type { SignalSourceWeight } from "../care/reflection";
import { LearnedWeightsSection } from "./LearnedWeightsSection";

/**
 * Memory → Customize (2026-08-10) — what Salt looks for, per record type.
 *
 * Two-zone doc, no overwriting:
 * - Zone 1 ("What I look for") is Salt-authored and read-only, rendered
 *   from the live field registry so the copy can't drift from behavior.
 *   Fields render as chip groups, not sentences — transparency you can
 *   scan.
 * - Zone 2 ("Your customizations") is writable: free-text lines the intake
 *   pipeline reads when deciding what becomes a record. Every line carries
 *   its source and a revert.
 *
 * Layout is doc + rail: the doc (both zones) fills the main column; the
 * trust card (All Types only — it is one workspace-wide threshold) and the
 * learned-weights list sit in a sticky rail. Care itself is always on —
 * you steer it, you don't switch it off.
 */

const SCOPE_ICONS: Record<MemoryCustomizeScope, LucideIcon> = {
  general: Layers,
  person: Users,
  org: Building2,
  work: Briefcase,
  resource: FileText,
  meeting: CalendarDays,
  billing: Receipt,
};

interface CustomizeTabProps {
  workspaceId: string;
  activeType: MemoryCustomizeScope;
  entriesByType: Partial<Record<MemoryCustomizeScope, CustomizeEntry[]>>;
  initialThreshold: number;
  learnedWeights: SignalSourceWeight[];
}

export function CustomizeTab({
  workspaceId,
  activeType,
  entriesByType,
  initialThreshold,
  learnedWeights,
}: CustomizeTabProps) {
  const router = useRouter();
  // Defer the Radix Select until after hydration — its generated
  // aria-controls id mismatches under streamed SSR (vercel/next.js#84029).
  const selectMounted = useClientMounted();
  const guidance = defaultGuidanceForScope(activeType);
  const entries = entriesByType[activeType] ?? [];

  return (
    <div className="space-y-10">
      <PlaysSectionHeader
        eyebrow="Customize what Salt remembers"
        title={MEMORY_CUSTOMIZE_SCOPE_TITLES[activeType]}
        description={headerDescriptionForScope(activeType)}
        action={
          <div className="flex flex-col gap-1.5">
            <span className="pl-1 text-[10px] font-bold tracking-[0.22em] uppercase text-muted-foreground">
              Record type
            </span>
            {selectMounted ? (
              <Select
                value={activeType}
                onValueChange={(value) =>
                  router.push(
                    buildMemoryPath("customize", value as MemoryCustomizeScope),
                  )
                }
              >
                <SelectTrigger
                  aria-label="Record type"
                  className="h-10 w-[240px] rounded-full border-foreground/20 bg-muted px-4 text-sm font-semibold text-foreground shadow-sm"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEMORY_CUSTOMIZE_SCOPES.map((scope) => {
                    const ScopeIcon = SCOPE_ICONS[scope];
                    return (
                      <SelectItem key={scope} value={scope}>
                        <span className="flex items-center gap-2">
                          <ScopeIcon className="size-3.5 text-muted-foreground" />
                          {scope === MEMORY_CUSTOMIZE_GENERAL_SCOPE
                            ? "All Types"
                            : MEMORY_CUSTOMIZE_SCOPE_LABELS[scope]}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            ) : (
              <div
                aria-hidden
                className="h-10 w-[240px] rounded-full border border-foreground/20 bg-muted shadow-sm"
              />
            )}
          </div>
        }
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="max-w-3xl space-y-10">
          {/* The composer is the parent; an aurora thread ties the suggestions
              and the doc to it as its children — you write above, the line
              lands below. */}
          <div className="relative">
            <TellSaltComposer entityType={activeType} />
            <div
              aria-hidden
              className="absolute bottom-2 left-[21px] top-[50px] w-0.5 rounded-full bg-[linear-gradient(180deg,oklch(0.58_0.16_200_/_0.5),oklch(0.78_0.16_75_/_0.3)_60%,transparent)]"
            />
            <div className="mt-5 space-y-8 pl-10">
              <SuggestionRow entityType={activeType} entries={entries} />
              <CustomizationsZone
                entityType={activeType}
                entries={entries}
                heading={
                  activeType === MEMORY_CUSTOMIZE_GENERAL_SCOPE
                    ? "What I'll remember across every type"
                    : "What I'll remember"
                }
              />
            </div>
          </div>

        </div>

        <aside className="space-y-10 lg:sticky lg:top-6 lg:self-start">
          {/* One workspace-wide threshold — it lives on All Types so it can
              never read as a per-type setting. Per-type pages carry the
              record's fill logic in the same aurora shell instead. */}
          {activeType === MEMORY_CUSTOMIZE_GENERAL_SCOPE ? (
            <TrustCard
              workspaceId={workspaceId}
              initialThreshold={initialThreshold}
            />
          ) : (
            <RecordLogicCard guidance={guidance} scope={activeType} />
          )}

          <LearnedWeightsSection
            workspaceId={workspaceId}
            initialWeights={learnedWeights}
          />
        </aside>
      </div>
    </div>
  );
}

/** Per-field tier badge copy — same write-policy canon the registry uses. */
function tierLabel(policy: WritePolicy): string {
  switch (policy) {
    case "care_auto":
      return "I fill it in";
    case "care_ask":
      return "I suggest";
    case "user_only":
      return "Yours";
    case "system_derived":
      return "Derived";
  }
}

/** Zone 1, per-type rail — the aurora counterpart to the All Types trust
 *  card. Read-only transparency: how a record is born, then one dropdown
 *  per field with the exact logic that fills it. Everything renders live
 *  from the field registry, so the copy can't drift from pipeline behavior. */
function RecordLogicCard({
  guidance,
  scope,
}: {
  guidance: DefaultGuidance;
  scope: MemoryCustomizeEntityType;
}) {
  // Record-level logic (birth + connections + precedence) reads as one
  // story, so those sections lead the accordion; the system-maintained note
  // closes it, after the per-field dropdowns it refers to. fields/never
  // sections stay off the card — the per-field dropdowns carry that detail.
  const logicSections = guidance.sections.filter(
    (section) =>
      section.kind === "birth" ||
      section.kind === "connections" ||
      section.kind === "principle",
  );
  const systemSections = guidance.sections.filter(
    (section) => section.kind === "system",
  );
  const fields = getFieldsForEntity(scope).filter((field) => !field.isReadonly);

  return (
    <section className="surface-aurora relative overflow-hidden rounded-3xl p-6 text-white">
      <div className="relative z-10 space-y-4">
        <h2 className="font-display text-xl font-semibold leading-tight text-white">
          The logic I run on
        </h2>
        <p className="text-[13px] leading-snug text-white/70">
          {guidance.summary}
        </p>

        <Accordion
          type="multiple"
          className="aurora-scroll max-h-[440px] overflow-y-auto pr-2"
        >
          <p className="pb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-white/40">
            The record
          </p>
          {logicSections.map((section) => (
            <AccordionItem
              key={section.heading}
              value={`${section.kind}-${section.heading}`}
              className="border-white/15"
            >
              <AccordionTrigger className="py-2.5 text-[13px] text-white/90 hover:no-underline [&_svg]:text-white/60!">
                {section.heading}
              </AccordionTrigger>
              <AccordionContent className="text-xs leading-snug text-white/70">
                <ul className="list-disc space-y-1.5 pl-4 marker:text-white/40">
                  {section.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}

          <p className="border-t border-white/10 pb-1 pt-3 text-[10px] font-medium uppercase tracking-[0.08em] text-white/40">
            Field by field
          </p>
          {fields.map((field) => {
            const policy = getWritePolicy(field);
            return (
              <AccordionItem
                key={field.key}
                value={field.key}
                className="border-white/15"
              >
                <AccordionTrigger className="py-2.5 text-[13px] text-white/90 hover:no-underline [&_svg]:text-white/60!">
                  <span className="flex items-center gap-2">
                    {field.label}
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70">
                      {tierLabel(policy)}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-xs leading-snug text-white/70">
                  {policy === "user_only" ? (
                    <p>Yours alone — I never write it.</p>
                  ) : field.fillRules && field.fillRules.length > 0 ? (
                    <ul className="list-disc space-y-1.5 pl-4 marker:text-white/40">
                      {field.fillRules.map((rule, index) => (
                        <li key={`${field.key}-${index}`}>
                          {rule.because} · {rule.confidence}%
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>When I spot it, I suggest it — you decide.</p>
                  )}
                  {field.sourcing && (
                    <div className="mt-2 space-y-1 border-t border-white/10 pt-2 text-white/55">
                      <p>
                        Best source: {field.sourcing.best}
                        {field.sourcing.gap && (
                          <span className="ml-1.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/70">
                            new source
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}

          {systemSections.map((section) => (
            <AccordionItem
              key={section.heading}
              value={`${section.kind}-${section.heading}`}
              className="border-white/15"
            >
              <AccordionTrigger className="py-2.5 text-[13px] text-white/90 hover:no-underline [&_svg]:text-white/60!">
                {section.heading}
              </AccordionTrigger>
              <AccordionContent className="text-xs leading-snug text-white/70">
                <ul className="list-disc space-y-1.5 pl-4 marker:text-white/40">
                  {section.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

/** Subtle one-click ideas under the composer — they hide themselves once the
 *  same line already lives in the doc. */
function SuggestionRow({
  entityType,
  entries,
}: {
  entityType: MemoryCustomizeScope;
  entries: CustomizeEntry[];
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);
  const pendingRef = React.useRef(false);

  const remaining = EXAMPLE_ENTRIES[entityType].filter(
    (example) =>
      !entries.some(
        (entry) => entry.body.trim().toLowerCase() === example.toLowerCase(),
      ),
  );

  if (remaining.length === 0) return null;

  const pick = async (body: string) => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(body);
    const result = await addCustomizeEntry({
      entityType,
      body,
      source: "user",
    });
    pendingRef.current = false;
    setPending(null);
    if (result.success) {
      toast.success(
        result.enforcement === "enforced"
          ? "I'll always keep that out."
          : "I'll remember that.",
      );
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 pl-2">
      <span className="text-xs text-muted-foreground/70">Try:</span>
      {remaining.map((example) => (
        <button
          key={example}
          type="button"
          disabled={pending !== null}
          onClick={() => void pick(example)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-border/60 px-3 py-1 text-xs text-muted-foreground transition hover:border-foreground/30 hover:bg-muted/50 hover:text-foreground disabled:opacity-50"
        >
          {pending === example ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Plus className="size-3" />
          )}
          {example}
        </button>
      ))}
    </div>
  );
}

/** Each line carries a small provenance dot — lines Salt learned on its own
 *  glow aurora; the rest are quiet. */
const SOURCE_ANNOTATIONS: Record<
  CustomizeEntry["source"],
  { label: string; dotClassName: string }
> = {
  user: { label: "You wrote this", dotClassName: "bg-muted-foreground/40" },
  ask_salt: { label: "From your chat with me", dotClassName: "bg-primary" },
  correction: {
    label: "Learned from a correction",
    dotClassName: "bg-amber-500",
  },
  reflection: { label: "I noticed this", dotClassName: "surface-aurora" },
};

const DOC_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

/** The one text box on the surface, hoisted to the top. Styled after the HQ
 *  tab tray: an inset rounded-full pill with a flame spark, an active-pill
 *  submit, and a tray that turns solid on focus. */
function TellSaltComposer({ entityType }: { entityType: MemoryCustomizeScope }) {
  const router = useRouter();
  const [value, setValue] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const busyRef = React.useRef(false);

  const submit = async () => {
    const body = value.trim();
    if (!body || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    const result = await addCustomizeEntry({
      entityType,
      body,
      source: "user",
    });
    busyRef.current = false;
    setBusy(false);
    if (result.success) {
      setValue("");
      toast.success(
        result.enforcement === "enforced"
          ? "I'll always keep that out."
          : "I'll remember that.",
      );
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const placeholder =
    entityType === MEMORY_CUSTOMIZE_GENERAL_SCOPE
      ? "Tell Salt something that applies to every record type…"
      : `Tell Salt what to look for in ${MEMORY_CUSTOMIZE_SCOPE_LABELS[entityType].toLowerCase()}…`;

  return (
    <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/70 p-1.5 pl-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] transition focus-within:border-foreground/25 focus-within:bg-background dark:border-border dark:bg-background/60 dark:focus-within:bg-muted/40">
      <span className="surface-aurora grid size-8 shrink-0 place-items-center rounded-full">
        <Sparkles className="relative z-10 size-4 text-white" />
      </span>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void submit();
          }
        }}
        placeholder={placeholder}
        aria-label="Tell Salt what to remember"
        maxLength={500}
        className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy || value.trim().length === 0}
        className="surface-aurora shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 hover:shadow disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="relative z-10 inline-flex items-center">
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Remember this"}
        </span>
      </button>
    </div>
  );
}

/** Zone 2 — the living doc. Entries read as lines in a document, oldest to
 *  newest, each with quiet provenance and a hover-revealed revert. */
function CustomizationsZone({
  entityType,
  entries,
  heading,
}: {
  entityType: MemoryCustomizeScope;
  entries: CustomizeEntry[];
  heading?: string;
}) {
  const router = useRouter();
  const [revertingId, setRevertingId] = React.useState<string | null>(null);

  const revert = async (entry: CustomizeEntry) => {
    setRevertingId(entry.id);
    const result = await revertCustomizeEntry(entry.id);
    setRevertingId(null);
    if (result.success) {
      toast.success("Forgotten — I won't use that anymore.");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          {heading ?? "Your customizations"}
        </h2>
        {entries.length > 0 ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {entries.length}
          </span>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border/60 bg-card px-4 py-2 sm:px-5">
        {entries.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Nothing here yet. This page fills in as you correct me or tell me
            what matters — every line becomes part of how I work.
          </p>
        ) : (
          <ul className="divide-y divide-border/40">
            {entries.map((entry) => {
              const annotation = SOURCE_ANNOTATIONS[entry.source];
              const hardExclusion = detectHardExclusion(entry.body);
              return (
                <motion.li
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className="group flex items-start justify-between gap-4 py-2.5 first:pt-1 last:pb-1"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm leading-snug text-foreground">
                      {entry.body}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground/80">
                      <span
                        className={cn(
                          "inline-block size-1.5 rounded-full",
                          annotation.dotClassName,
                        )}
                      />
                      {annotation.label}
                      {hardExclusion ? " · always kept out" : null}
                      {" · "}
                      {DOC_DATE_FORMAT.format(new Date(entry.createdAt))}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void revert(entry)}
                    disabled={revertingId === entry.id}
                    aria-label="Remove this line"
                    className="mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition hover:bg-muted/60 hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-50"
                  >
                    {revertingId === entry.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <X className="size-3.5" />
                    )}
                  </button>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

const THRESHOLD_LABELS: Record<number, { label: string; description: string }> = {
  50: {
    label: "More autonomous",
    description: "I act faster with less evidence. Good for low-risk records.",
  },
  65: {
    label: "Balanced",
    description: "I wait for moderate evidence before acting.",
  },
  85: {
    label: "Conservative",
    description:
      "I accumulate strong evidence before acting. Recommended for most people.",
  },
  100: {
    label: "Always ask",
    description: "I never apply changes on my own; everything waits for you.",
  },
};

function getThresholdMeta(value: number) {
  if (value >= 95) return THRESHOLD_LABELS[100];
  if (value >= 75) return THRESHOLD_LABELS[85];
  if (value >= 55) return THRESHOLD_LABELS[65];
  return THRESHOLD_LABELS[50];
}

/**
 * The trust card — the one control that governs how boldly Salt acts on
 * this whole surface, including anything Salt writes to the doc itself.
 * Rendered in the aurora language of the HQ pulse card: chip label, one
 * big display number, one line of description. Nothing else.
 */
function TrustCard({
  workspaceId,
  initialThreshold,
}: {
  workspaceId: string;
  initialThreshold: number;
}) {
  const [threshold, setThreshold] = React.useState(initialThreshold);
  const [savedThreshold, setSavedThreshold] = React.useState(initialThreshold);
  const [saving, setSaving] = React.useState(false);

  const hasChanges = threshold !== savedThreshold;
  const thresholdMeta = getThresholdMeta(threshold);

  const save = async () => {
    setSaving(true);
    try {
      await updateMemoryCareThreshold(workspaceId, threshold);
      setSavedThreshold(threshold);
      toast.success("Saved — I'll act accordingly.");
    } catch {
      toast.error("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="surface-aurora relative overflow-hidden rounded-3xl p-6 text-white">
      <div className="relative z-10 space-y-5">
        <span className="chip">
          <Gauge className="size-3" /> How boldly I act
        </span>

        <div className="flex items-end gap-3">
          <p className="font-display text-5xl leading-none tabular-nums tracking-tight">
            {threshold}%
          </p>
          <p className="pb-0.5 text-sm font-medium text-white/80">
            {thresholdMeta.label}
          </p>
        </div>

        <p className="text-[13px] leading-snug text-white/70">
          {thresholdMeta.description}
        </p>

        <Slider
          value={[threshold]}
          onValueChange={([value]) => setThreshold(value)}
          min={50}
          max={100}
          step={5}
          aria-label="Act on my own when I'm this sure"
          className="w-full [&_[data-slot=slider-range]]:bg-white [&_[data-slot=slider-thumb]]:border-white [&_[data-slot=slider-track]]:bg-white/20"
        />

        <div className="flex items-center justify-between text-[11px] text-white/60">
          <span>More autonomous</span>
          {hasChanges ? (
            <Button
              size="sm"
              onClick={() => void save()}
              disabled={saving}
              className="h-7 rounded-full bg-white px-3 text-xs font-semibold text-black hover:bg-white/90"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : "Save"}
            </Button>
          ) : (
            <span>Always ask</span>
          )}
        </div>
      </div>
    </section>
  );
}
