"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@repo/utils";
import {
  AREA_LABELS,
  ENTITY_TYPE_LABELS,
} from "@/app/_features/capture/adapters/rule-entities";
import type { ConnectorRule } from "@/app/_features/capture/services/rules-manager";
import { removeConnectorRule } from "@/app/_features/connectors/actions/rules";
import { updateCaptureGatePolicy } from "@/app/_features/capture/actions/gate-policy";
import type { ResolvedGatePolicy } from "@/app/_features/capture/services/gates/gate-policy";
import { renderProofLine } from "@/app/_features/capture/utils/gate-proof-counts";
import { syncAndScanCaptures } from "@/app/_features/capture/actions/run-intelligence-scan";
import { ConnectorScopeSection } from "@/app/_features/connectors/components/detail/ConnectorScopeSection";
import {
  parseCustomizeCategory,
  syncSourcesUrl,
} from "../sources-tab-routing";
import type {
  CustomizeAreaData,
  CustomizeTabData,
} from "../sources-tab-data";
import { TellSaltBox } from "./TellSaltBox";

/**
 * Sources → Customize (2026-08-10) — intake policy at the intake surface,
 * organized by intake AREA (Email, Calendar, Billing, Storage, Messaging,
 * Meetings, CRM, Projects — the same vocabulary as the Activity area
 * filter) instead of by app. The page is Salt reporting, not a form:
 *
 *   What I'm doing     first-person defaults + proof counts + the named
 *                      gate choices (email), "See exactly what I do"
 *                      expands the full detail
 *   Tell Salt          one box per area — values parse deterministically,
 *                      sentences compile, everything confirms in plain
 *                      language before it lands
 *   Your accounts      per-account watch controls + Check for new items
 *   Always let in /    what's been learned, removable
 *   Keep out
 *
 * The "All connectors" pill holds the workspace-wide rules (provider NULL).
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
  const [selected, setSelected] = React.useState<string>(() =>
    requested === "all" ||
    (requested !== null &&
      data.areas.some((entry) => entry.area === requested))
      ? requested
      : (data.areas[0]?.area ?? "all"),
  );

  const select = (key: string) => {
    setSelected(key);
    syncSourcesUrl("customize", null, key);
  };

  if (data.areas.length === 0 && data.workspaceRules.length === 0) {
    return (
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
    );
  }

  const activeArea =
    selected === "all"
      ? null
      : (data.areas.find((entry) => entry.area === selected) ?? null);

  return (
    <div className="max-w-3xl space-y-8">
      <div
        role="group"
        aria-label="Customize area"
        className="flex flex-wrap items-center gap-1.5"
      >
        <AreaPill
          label="All connectors"
          active={selected === "all"}
          onSelect={() => select("all")}
        />
        {data.areas.map((entry) => (
          <AreaPill
            key={entry.area}
            label={AREA_LABELS[entry.area]}
            active={selected === entry.area}
            onSelect={() => select(entry.area)}
          />
        ))}
      </div>

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

function AreaPill({
  label,
  active,
  onSelect,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition",
        active
          ? "border-foreground/20 bg-muted text-foreground"
          : "border-border/60 text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
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
  const { policy } = data;
  const allowRules = data.rules.filter((rule) => rule.ruleType === "allow");
  const denyRules = data.rules.filter((rule) => rule.ruleType === "deny");
  const proofLine = renderProofLine(data.proof);
  const firstAccountProvider = data.accounts[0]?.provider ?? null;

  return (
    <div className="space-y-8">
      <section className="space-y-2.5">
        <h3 className="text-sm font-semibold text-foreground">
          What I&apos;m doing
        </h3>
        {proofLine ? (
          <p className="text-[13px] leading-snug text-muted-foreground">
            {proofLine}
          </p>
        ) : null}
        {data.area === "email" ? (
          <GatePolicyChoices gatePolicy={gatePolicy} onChanged={onChanged} />
        ) : (
          <ul className="space-y-1.5">
            {policy.gateBehavior.map((line) => (
              <li
                key={line}
                className="text-[13px] leading-snug text-muted-foreground"
              >
                {line}
              </li>
            ))}
          </ul>
        )}
        {data.whenItSyncs.length > 0 ? (
          <ul className="space-y-1">
            {data.whenItSyncs.map((line) => (
              <li
                key={line}
                className="text-xs leading-snug text-muted-foreground/80"
              >
                {line}
              </li>
            ))}
          </ul>
        ) : null}
        <FullDetailDisclosure
          upstreamFilters={policy.upstreamFilters}
          gateBehavior={data.area === "email" ? policy.gateBehavior : []}
        />
      </section>

      <section className="space-y-2.5">
        <h3 className="text-sm font-semibold text-foreground">Tell Salt</h3>
        <TellSaltBox
          area={data.area}
          provider={firstAccountProvider}
          onApplied={onChanged}
        />
        {data.accounts.length > 1 ? (
          <p className="text-xs leading-snug text-muted-foreground">
            Applies to {data.accounts[0].name}. Choices that span accounts
            live under All connectors.
          </p>
        ) : null}
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Your accounts</h3>
        {data.accounts.map((account) => (
          <div key={account.provider} className="space-y-2">
            <div className="flex flex-wrap items-center gap-x-2">
              <p className="text-[13px] font-medium text-foreground">
                {account.name}
              </p>
              {account.label ? (
                <p className="truncate text-xs text-muted-foreground">
                  {account.label}
                </p>
              ) : null}
              {account.captureEnabled ? (
                <CheckForNewItemsButton onDone={onChanged} />
              ) : null}
            </div>
            {account.captureEnabled ? (
              <ConnectorScopeSection
                provider={account.provider}
                scope={account.scope}
                onChanged={onChanged}
              />
            ) : (
              <p className="text-xs leading-snug text-muted-foreground">
                Memory capture is off for this account — turn it on from the
                connector&apos;s page to choose what Salt watches.
              </p>
            )}
          </div>
        ))}
      </section>

      <RulesSection
        title="Always let in"
        blurb="Matching items skip the noise filters and reach you at full prominence."
        rules={allowRules}
        providers={data.accounts.map((account) => account.provider)}
        onChanged={onChanged}
      />
      <RulesSection
        title="Keep out"
        blurb="Matching items are dropped before they reach your stream."
        rules={denyRules}
        providers={data.accounts.map((account) => account.provider)}
        onChanged={onChanged}
      />
    </div>
  );
}

/**
 * The named gate choices (S3) — rendered beside the email defaults they
 * govern. Named choices, never numeric knobs: a gate gets a control only
 * when reasonable users genuinely differ.
 */
function GatePolicyChoices({
  gatePolicy,
  onChanged,
}: {
  gatePolicy: ResolvedGatePolicy;
  onChanged: () => void;
}) {
  return (
    <div className="space-y-2">
      <GatePolicyChoice
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
      <GatePolicyChoice
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
    </div>
  );
}

function GatePolicyChoice({
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
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <p className="text-[13px] leading-snug text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1" role="group" aria-label={label}>
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
              "rounded-full border px-2.5 py-0.5 text-xs font-medium transition disabled:opacity-50",
              value === option.value
                ? "border-foreground/20 bg-muted text-foreground"
                : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
        {saving ? (
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        ) : null}
      </div>
    </div>
  );
}

/** Progressive disclosure: the full detail for the curious. */
function FullDetailDisclosure({
  upstreamFilters,
  gateBehavior,
}: {
  upstreamFilters: readonly string[];
  gateBehavior: readonly string[];
}) {
  const [open, setOpen] = React.useState(false);
  const lines = [...gateBehavior, ...upstreamFilters];
  if (lines.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ChevronDown
          className={cn("size-3 transition-transform", open && "rotate-180")}
        />
        See exactly what I do
      </button>
      {open ? (
        <ul className="space-y-1.5 border-l border-border/60 pl-3">
          {lines.map((line) => (
            <li
              key={line}
              className="text-xs leading-snug text-muted-foreground"
            >
              {line}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * "Check for new items" — runs the workspace reconcile+scan. The action is
 * workspace-wide, so the copy never claims it only checks this account.
 */
function CheckForNewItemsButton({ onDone }: { onDone: () => void }) {
  const [running, setRunning] = React.useState(false);
  return (
    <button
      type="button"
      disabled={running}
      onClick={() => {
        setRunning(true);
        void syncAndScanCaptures()
          .then((result) => {
            if (result.success) {
              const created = result.sync?.capturesCreated ?? 0;
              toast.success(
                created > 0
                  ? `Checked for new items — ${created} new.`
                  : "Checked for new items — nothing new.",
              );
              onDone();
            } else {
              toast.error(result.error ?? "Could not check right now.");
            }
          })
          .finally(() => setRunning(false));
      }}
      className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-50"
    >
      {running ? <Loader2 className="size-3 animate-spin" /> : null}
      Check for new items
    </button>
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

  return (
    <div className="space-y-8">
      <p className="max-w-xl text-[13px] leading-relaxed text-muted-foreground">
        These apply to every connected account. What you correct from the
        Kept Out section lands here too.
      </p>
      <section className="space-y-2.5">
        <h3 className="text-sm font-semibold text-foreground">Tell Salt</h3>
        <TellSaltBox area={null} provider={null} onApplied={onChanged} />
      </section>
      <RulesSection
        title="Always let in"
        blurb="Matching items skip the noise filters and reach you at full prominence."
        rules={allowRules}
        providers={[null]}
        onChanged={onChanged}
      />
      <RulesSection
        title="Keep out"
        blurb="Matching items are dropped before they reach your stream."
        rules={denyRules}
        providers={[null]}
        onChanged={onChanged}
      />
    </div>
  );
}

/** One rules list — allow or deny — with removal. */
function RulesSection({
  title,
  blurb,
  rules,
  providers,
  onChanged,
}: {
  title: string;
  blurb: string;
  rules: ConnectorRule[];
  /** Provider scopes a removal is legal for (null = workspace-wide). */
  providers: (string | null)[];
  onChanged: () => void;
}) {
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  const remove = async (rule: ConnectorRule) => {
    setRemovingId(rule.id);
    const result = await removeConnectorRule({
      provider: rule.provider,
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
    <section className="space-y-2.5">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs leading-snug text-muted-foreground">{blurb}</p>
      </div>
      {rules.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {rules.map((rule) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              showProvider={providers.length > 1}
              onRemove={
                removingId === rule.id ? undefined : () => void remove(rule)
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function RuleRow({
  rule,
  showProvider,
  onRemove,
}: {
  rule: ConnectorRule;
  showProvider: boolean;
  onRemove?: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-foreground">
          <span className="text-muted-foreground">
            {ENTITY_TYPE_LABELS[rule.entityType] ?? rule.entityType} ·{" "}
          </span>
          {rule.entityKey}
          {showProvider && rule.provider ? (
            <span className="text-muted-foreground"> · {rule.provider}</span>
          ) : null}
        </p>
        {rule.reason ? (
          <p className="truncate text-xs text-muted-foreground">
            {rule.reason}
          </p>
        ) : null}
      </div>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove rule for ${rule.entityKey}`}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : (
        <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
      )}
    </li>
  );
}
