"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@repo/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import {
  AREA_LABELS,
  ENTITY_TYPE_LABELS,
} from "@/app/_features/capture/adapters/rule-entities";
import type { ConnectorRule } from "@/app/_features/capture/services/rules-manager";
import { removeConnectorRule } from "@/app/_features/connectors/actions/rules";
import { updateCaptureGatePolicy } from "@/app/_features/capture/actions/gate-policy";
import type { ResolvedGatePolicy } from "@/app/_features/capture/services/gates/gate-policy";
import {
  AREA_LOGIC_SUMMARY,
  WORKSPACE_INTAKE_ORDER,
} from "@/app/_features/capture/adapters/default-policy";
import { renderProofLine } from "@/app/_features/capture/utils/gate-proof-counts";
import { ConnectorIcon } from "@/app/_features/connectors/components/connector-icons";
import { connectorForToolkit } from "@/app/_features/connectors/utils/toolkit-connector";
import {
  parseCustomizeCategory,
  syncSourcesUrl,
} from "../sources-tab-routing";
import type {
  CustomizeAccountData,
  CustomizeAreaData,
  CustomizeTabData,
} from "../sources-tab-data";
import { TellSaltBox } from "./TellSaltBox";

/**
 * Sources → Customize (2026-08-10) — intake policy at the intake surface,
 * organized by intake AREA (Email, Calendar, Billing, Storage, Messaging,
 * Meetings, CRM, Projects — the same vocabulary as the Activity area
 * filter) instead of by app. The page is Salt reporting, not a form, laid
 * out doc + rail like Memory → Customize:
 *
 *   Doc (left)         Tell Salt composer + Always let in / Keep out
 *                      rules, tied by the aurora thread — what's been
 *                      learned, removable
 *   Rail (right)       One aurora card, "The logic I run on" — heading +
 *                      account icons as one row, a "This week" proof row
 *                      (7-day gate counts), an opening paragraph for the
 *                      whole area, then accordions in story order:
 *                      HOW I RUN (upstream filters, cadence — read-only),
 *                      THE CHOICES (named gate decisions, current value
 *                      badged in the trigger), FINE TUNE (per-account watch
 *                      controls). Kept-out review lives in Activity behind
 *                      the stream's "Kept out" filter.
 *
 * Area views write AREA-scoped rules (provider NULL + area set) — they
 * cover every account in the area, including accounts connected later.
 * The "All connectors" option holds the workspace-wide rules (both NULL)
 * and lists area rules tagged with their area. Area switching is a
 * dropdown in the header, mirroring Memory → Customize's record-type
 * picker.
 *
 * Banned words on this surface: trigger, webhook, sync, scope, rule,
 * adapter, pipeline, config. The vocabulary is: watch, skip, keep out,
 * let in, learn, remember.
 */

interface SourcesCustomizeTabProps {
  data: CustomizeTabData;
  /** Raw ?category= param — validated against the connected categories. */
  initialCategory: string | null;
  /** Refetch the tab's server data after a mutation. */
  onChanged: () => void;
}

export function SourcesCustomizeTab({
  data,
  initialCategory,
  onChanged,
}: SourcesCustomizeTabProps) {
  const requested = parseCustomizeCategory(initialCategory);
  // Default landing is "All connectors" (workspace-wide rules); a specific
  // area is only preselected when the URL explicitly asks for one.
  const [selected, setSelected] = React.useState<string>(() =>
    requested === "all" ||
    (requested !== null &&
      data.areas.some((entry) => entry.area === requested))
      ? requested
      : "all",
  );

  const select = (key: string) => {
    setSelected(key);
    syncSourcesUrl("customize", null, key);
  };

  if (data.areas.length === 0 && data.workspaceRules.length === 0) {
    return (
      <div className="space-y-6">
        <PlaysSectionHeader
          eyebrow="Customize what Salt captures"
          title="Customize"
          description="What Salt does by default, and the rules you've added on top."
        />
        <div className="max-w-xl rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Nothing to customize yet — connect an account Salt can learn from
            and its intake policy shows up here. Corrections from the Kept Out
            section land here too, as workspace-wide rules.
          </p>
          <Link
            href="/sources"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Open Connectors
          </Link>
        </div>
      </div>
    );
  }

  const activeArea =
    selected === "all"
      ? null
      : (data.areas.find((entry) => entry.area === selected) ?? null);

  return (
    <div className="space-y-10">
      <PlaysSectionHeader
        eyebrow="Customize what Salt captures"
        title={activeArea ? AREA_LABELS[activeArea.area] : "All connectors"}
        description="What Salt does by default, and the rules you've added on top."
        action={
          <div className="flex flex-col gap-1.5">
            <span className="pl-1 text-[10px] font-bold tracking-[0.22em] uppercase text-muted-foreground">
              Area
            </span>
            <Select value={selected} onValueChange={select}>
              <SelectTrigger
                aria-label="Customize area"
                className="h-10 w-[240px] rounded-full border-foreground/20 bg-muted px-4 text-sm font-semibold text-foreground shadow-sm"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All connectors</SelectItem>
                {data.areas.map((entry) => (
                  <SelectItem key={entry.area} value={entry.area}>
                    {AREA_LABELS[entry.area]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {activeArea ? (
        <AreaSection
          data={activeArea}
          gatePolicy={data.gatePolicy}
          onChanged={onChanged}
        />
      ) : (
        <WorkspaceRulesView
          rules={data.workspaceRules}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}

function AreaSection({
  data,
  gatePolicy,
  onChanged,
}: {
  data: CustomizeAreaData;
  gatePolicy: ResolvedGatePolicy;
  onChanged: () => void;
}) {
  const allowRules = data.rules.filter((rule) => rule.ruleType === "allow");
  const denyRules = data.rules.filter((rule) => rule.ruleType === "deny");

  // Doc + rail, mirroring the All connectors view (and Memory → Customize):
  // the writable doc — composer + rules, tied by the aurora thread — fills
  // the main column; the rail holds the area's logic card and its
  // rules-and-kept-out card.
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* self-start: grid items stretch to the row height by default, which
          would drag the aurora thread past the rules to the bottom of the
          taller rail — the thread belongs to the doc, not the grid. */}
      <div className="relative max-w-3xl self-start">
        <div className="relative z-10 bg-background">
          <TellSaltBox
            area={data.area}
            onApplied={onChanged}
            existingKeys={data.rules.map((rule) => rule.entityKey)}
          />
        </div>
        <div
          aria-hidden
          className="absolute bottom-2 left-[21px] top-[50px] w-0.5 rounded-full bg-[linear-gradient(180deg,oklch(0.58_0.16_200_/_0.5),oklch(0.78_0.16_75_/_0.3)_60%,transparent)]"
        />
        <div className="mt-5 space-y-8 pl-10">
          <RulesSection
            title="Always let in"
            blurb="Matching items skip the noise filters and reach you at full prominence."
            rules={allowRules}
            scopeTag={(rule) => rule.provider}
            onChanged={onChanged}
          />
          <RulesSection
            title="Keep out"
            blurb="Matching items are dropped before they reach your stream."
            rules={denyRules}
            scopeTag={(rule) => rule.provider}
            onChanged={onChanged}
          />
        </div>
      </div>

      <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
        <AreaLogicCard
          data={data}
          gatePolicy={gatePolicy}
          onChanged={onChanged}
        />
      </aside>
    </div>
  );
}

/**
 * Card 1 of the area rail — "The logic I run on", mirroring Memory's
 * RecordLogicCard: heading + the area's account icons as one header row, an
 * opening paragraph that tells the area's story, then accordions. Every
 * area gets the same HOW I RUN trio (what I look for / what never reaches
 * me / when I check); email adds a FINE TUNE group with the named gate
 * decisions, the current value badged in the trigger.
 */
function AreaLogicCard({
  data,
  gatePolicy,
  onChanged,
}: {
  data: CustomizeAreaData;
  gatePolicy: ResolvedGatePolicy;
  onChanged: () => void;
}) {
  // Quiet proof the logic is working (7-day gate counts), side by side
  // under the heading. The label carries "This week" — drop the line's
  // redundant prefix.
  const proofLine = renderProofLine(data.proof)?.replace(/^This week: /, "");

  return (
    <section className="surface-aurora relative overflow-hidden rounded-3xl p-6 text-white">
      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold leading-tight text-white">
            The logic I run on
          </h2>
          <div className="flex items-center -space-x-1.5">
            {data.accounts.map((account) => (
              <AccountIcon key={account.provider} account={account} />
            ))}
          </div>
        </div>
        {proofLine ? (
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-white/40">
              This week
            </p>
            <p className="text-xs leading-snug text-white/70">{proofLine}</p>
          </div>
        ) : null}
        <p className="text-[13px] leading-snug text-white/70">
          {areaOpeningLine(data)}
        </p>

        <Accordion
          type="multiple"
          className="aurora-scroll max-h-[440px] overflow-y-auto pr-2"
        >
          <HowIRunItems data={data} />
          {data.area === "email" ? (
            <>
              <AccordionGroupLabel>Fine tune</AccordionGroupLabel>
              <GateChoiceItem
                label="Automated senders — receipts, notifications"
                value={gatePolicy.email.automatedSenders}
                options={[
                  { value: "dropped", label: "Kept out" },
                  { value: "watched", label: "Watched" },
                  { value: "let_in", label: "Let in" },
                ]}
                onPick={async (value) => {
                  const result = await updateCaptureGatePolicy({
                    email: {
                      automated_senders: value as "dropped" | "watched" | "let_in",
                    },
                  });
                  if (result.success) {
                    onChanged();
                  } else {
                    toast.error(result.error);
                  }
                }}
              />
              <GateChoiceItem
                label="Receipts & subscriptions from your tools"
                value={gatePolicy.email.trackSubscriptions}
                options={[
                  { value: "tracked", label: "Tracked" },
                  { value: "ignored", label: "Ignored" },
                ]}
                onPick={async (value) => {
                  const result = await updateCaptureGatePolicy({
                    email: {
                      track_subscriptions: value as "tracked" | "ignored",
                    },
                  });
                  if (result.success) {
                    onChanged();
                  } else {
                    toast.error(result.error);
                  }
                }}
              />
              <GateChoiceItem
                label="Mail from people you don't know"
                value={gatePolicy.email.strangers}
                options={[
                  { value: "watched", label: "Watched" },
                  { value: "let_in", label: "Let in" },
                  { value: "dropped", label: "Kept out" },
                ]}
                onPick={async (value) => {
                  const result = await updateCaptureGatePolicy({
                    email: { strangers: value as "watched" | "let_in" | "dropped" },
                  });
                  if (result.success) {
                    onChanged();
                  } else {
                    toast.error(result.error);
                  }
                }}
              />
            </>
          ) : null}
        </Accordion>
      </div>
    </section>
  );
}

/**
 * The opening paragraph — the card's main beat. Speaks for the whole area,
 * never naming specific apps: the logic covers every account in the area,
 * connected now or later.
 */
function areaOpeningLine(data: CustomizeAreaData): string {
  return `One logic across all your ${AREA_LABELS[data.area].toLowerCase()} apps — ${AREA_LOGIC_SUMMARY[data.area]}.`;
}

/**
 * One named gate choice as an accordion item: the trigger carries the
 * current value as a badge (Memory's field-tier pattern), the content holds
 * the option pills that change it.
 */
function GateChoiceItem({
  label,
  value,
  options,
  onPick,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onPick: (value: string) => Promise<void>;
}) {
  const [saving, setSaving] = React.useState(false);
  const current = options.find((option) => option.value === value);
  return (
    <AccordionItem value={label} className="border-white/15">
      <AccordionTrigger className="py-2.5 text-left text-[13px] text-white/90 hover:no-underline [&_svg]:shrink-0 [&_svg]:text-white/60!">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {label}
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70">
            {current?.label ?? value}
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="text-xs leading-snug text-white/70">
        {/* Segmented control — one bordered track reads as a single
            selectable control where loose pills read as static badges. */}
        <div
          role="group"
          aria-label={label}
          className="mb-1 inline-flex flex-wrap items-center gap-1 rounded-full border border-white/20 bg-white/10 p-1"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={value === option.value}
              disabled={saving}
              onClick={() => {
                if (option.value === value) return;
                setSaving(true);
                void onPick(option.value).finally(() => setSaving(false));
              }}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition disabled:opacity-50",
                value === option.value
                  ? "bg-white text-black shadow-sm"
                  : "text-white/70 hover:bg-white/10 hover:text-white",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        {saving ? (
          <Loader2 className="ml-1 inline size-3.5 animate-spin text-white/70" />
        ) : null}
      </AccordionContent>
    </AccordionItem>
  );
}

/** Uppercase mini-label separating accordion groups (Memory's pattern). */
function AccordionGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-t border-white/10 pb-1 pt-3 text-[10px] font-medium uppercase tracking-[0.08em] text-white/40">
      {children}
    </p>
  );
}

/**
 * HOW I RUN — the read-only rhythm of the area, first in the accordion:
 * what Salt looks for (the extraction layer), what never reaches it
 * (live-rendered upstream filters), and when delivery happens. No controls
 * here; the choices and fine-tuning follow.
 */
function HowIRunItems({ data }: { data: CustomizeAreaData }) {
  const { policy } = data;
  return (
    <>
      <p className="pb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-white/40">
        How I run
      </p>
      {policy.lookFor.length > 0 ? (
        <AccordionItem value="look-for" className="border-white/15">
          <AccordionTrigger className="py-2.5 text-left text-[13px] text-white/90 hover:no-underline [&_svg]:text-white/60!">
            What I look for
          </AccordionTrigger>
          <AccordionContent className="text-xs leading-snug text-white/70">
            <ul className="list-disc space-y-1.5 pl-4 marker:text-white/40">
              {policy.lookFor.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      ) : null}
      <AccordionItem value="upstream-filters" className="border-white/15">
        <AccordionTrigger className="py-2.5 text-left text-[13px] text-white/90 hover:no-underline [&_svg]:text-white/60!">
          What never reaches me
        </AccordionTrigger>
        <AccordionContent className="text-xs leading-snug text-white/70">
          <ul className="list-disc space-y-1.5 pl-4 marker:text-white/40">
            {policy.upstreamFilters.length > 0 ? (
              policy.upstreamFilters.map((line) => <li key={line}>{line}</li>)
            ) : (
              // No seeded upstream filters for this area — say so honestly
              // rather than hiding the item and breaking the trio.
              <li>Nothing is filtered out upstream — everything these apps emit reaches the gate</li>
            )}
          </ul>
        </AccordionContent>
      </AccordionItem>
      {data.whenItSyncs.length > 0 ? (
        <AccordionItem value="cadence" className="border-white/15">
          <AccordionTrigger className="py-2.5 text-left text-[13px] text-white/90 hover:no-underline [&_svg]:text-white/60!">
            When I check
          </AccordionTrigger>
          <AccordionContent className="text-xs leading-snug text-white/70">
            <ul className="list-disc space-y-1.5 pl-4 marker:text-white/40">
              {data.whenItSyncs.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      ) : null}
    </>
  );
}

/**
 * One account's connector glyph. Provider keys are toolkit slugs ("gmail"),
 * so resolve through connectorForToolkit — a raw cast renders nothing for
 * slugs whose catalog id differs ("google", "google-calendar").
 */
function AccountIcon({
  account,
  shell = true,
}: {
  account: CustomizeAccountData;
  /** Shell = the overlapping-stack circle; false = bare glyph for rows. */
  shell?: boolean;
}) {
  const connector = connectorForToolkit(account.provider);
  if (!connector) return null;
  if (!shell) {
    return <ConnectorIcon id={connector.id} size={14} />;
  }
  return (
    <span
      title={account.label ?? account.name}
      aria-label={account.label ?? account.name}
      className="inline-flex size-7 items-center justify-center rounded-full border border-border/60 bg-card shadow-sm ring-2 ring-card"
    >
      <ConnectorIcon id={connector.id} size={14} />
    </span>
  );
}

function WorkspaceRulesView({
  rules,
  onChanged,
}: {
  rules: ConnectorRule[];
  onChanged: () => void;
}) {
  const allowRules = rules.filter((rule) => rule.ruleType === "allow");
  const denyRules = rules.filter((rule) => rule.ruleType === "deny");

  // Doc + rail, mirroring Memory → Customize: the writable doc fills the
  // main column; the workspace-wide intake order sits in a sticky rail.
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* self-start: keeps the aurora thread measured against the doc, not
          the grid row, when the rail is taller. */}
      <div className="relative max-w-3xl self-start">
        {/* The Tell Salt box is the parent; an aurora thread ties the learned
            rules to it as its children — you write above, the rule lands
            below. The composer block masks the thread so its live feedback
            and confirm panel never cross the line. */}
        <div className="relative z-10 bg-background">
          <TellSaltBox
            area={null}
            onApplied={onChanged}
            existingKeys={rules.map((rule) => rule.entityKey)}
          />
        </div>
        <div
          aria-hidden
          className="absolute bottom-2 left-[21px] top-[50px] w-0.5 rounded-full bg-[linear-gradient(180deg,oklch(0.58_0.16_200_/_0.5),oklch(0.78_0.16_75_/_0.3)_60%,transparent)]"
        />
        <div className="mt-5 space-y-8 pl-10">
          <RulesSection
            title="Always let in"
            blurb="Matching items skip the noise filters and reach you at full prominence."
            rules={allowRules}
            scopeTag={workspaceScopeTag}
            onChanged={onChanged}
          />
          <RulesSection
            title="Keep out"
            blurb="Matching items are dropped before they reach your stream."
            rules={denyRules}
            scopeTag={workspaceScopeTag}
            onChanged={onChanged}
          />
        </div>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <WorkspaceLogicCard />
      </aside>
    </div>
  );
}

/**
 * The All connectors rail card — the workspace-wide intake order, in the
 * same aurora shell as Memory's trust card. Read-only transparency: the
 * lines mirror the gate pipeline (rules first, then drop, fast-track,
 * hold), so the card doubles as the "why workspace rules matter" story.
 */
function WorkspaceLogicCard() {
  return (
    <section className="surface-aurora relative overflow-hidden rounded-3xl p-6 text-white">
      <div className="relative z-10 space-y-4">
        <h2 className="font-display text-xl font-semibold leading-tight text-white">
          The logic I run on
        </h2>
        <p className="text-[13px] leading-snug text-white/70">
          Every connected account, in this order.
        </p>
        <ol className="space-y-2.5">
          {WORKSPACE_INTAKE_ORDER.map((line, index) => (
            <li key={line} className="flex items-start gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/15 text-[11px] font-semibold tabular-nums text-white/90">
                {index + 1}
              </span>
              <span className="text-[13px] leading-snug text-white/80">
                {line}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/**
 * Scope tag for the All connectors view: area rules carry their area label
 * ("Email"), provider rules their provider key; workspace-wide rules (the
 * view's own scope) need no tag.
 */
function workspaceScopeTag(rule: ConnectorRule): string | null {
  if (rule.area) {
    return AREA_LABELS[rule.area as keyof typeof AREA_LABELS] ?? rule.area;
  }
  return rule.provider;
}

/** One rules list — allow or deny — with removal. */
function RulesSection({
  title,
  blurb,
  rules,
  scopeTag,
  onChanged,
}: {
  title: string;
  blurb: string;
  rules: ConnectorRule[];
  /** What distinguishes a row's scope in this view; null = no tag. */
  scopeTag: (rule: ConnectorRule) => string | null;
  onChanged: () => void;
}) {
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  const remove = async (rule: ConnectorRule) => {
    setRemovingId(rule.id);
    const result = await removeConnectorRule({
      provider: rule.provider,
      area: rule.area,
      ruleId: rule.id,
    });
    setRemovingId(null);
    if (result.success) {
      onChanged();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {rules.length > 0 ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
              {rules.length}
            </span>
          ) : null}
        </div>
        <p className="text-xs leading-snug text-muted-foreground">{blurb}</p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card px-4 py-2 sm:px-5">
        {rules.length === 0 ? (
          <p className="py-1 text-sm leading-relaxed text-muted-foreground">
            Nothing here yet.
          </p>
        ) : (
          <ul className="divide-y divide-border/40">
            {rules.map((rule) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                tag={scopeTag(rule)}
                onRemove={
                  removingId === rule.id ? undefined : () => void remove(rule)
                }
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function RuleRow({
  rule,
  tag,
  onRemove,
}: {
  rule: ConnectorRule;
  tag: string | null;
  onRemove?: () => void;
}) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="group flex items-start justify-between gap-4 py-2.5 first:pt-1 last:pb-1"
    >
      <div className="min-w-0 space-y-1">
        <p className="text-sm leading-snug text-foreground">
          <span className="text-muted-foreground">
            {ENTITY_TYPE_LABELS[rule.entityType] ?? rule.entityType} ·{" "}
          </span>
          {rule.entityKey}
          {tag ? (
            <span className="text-muted-foreground"> · {tag}</span>
          ) : null}
        </p>
        {rule.reason ? (
          <p className="text-xs text-muted-foreground/80">{rule.reason}</p>
        ) : null}
      </div>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove rule for ${rule.entityKey}`}
          className="mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition hover:bg-muted/60 hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
        >
          <X className="size-3.5" />
        </button>
      ) : (
        <Loader2 className="mt-1 size-3.5 shrink-0 animate-spin text-muted-foreground" />
      )}
    </motion.li>
  );
}
