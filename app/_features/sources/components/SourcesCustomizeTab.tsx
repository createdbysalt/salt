"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@repo/utils";
import type { ConnectorCategory } from "@/app/_lib/composio/enrichment/types";
import {
  CATEGORY_LABELS,
  ENTITY_TYPE_LABELS,
} from "@/app/_features/capture/adapters/rule-entities";
import type { ConnectorRule } from "@/app/_features/capture/services/rules-manager";
import { removeConnectorRule } from "@/app/_features/connectors/actions/rules";
import { ConnectorScopeSection } from "@/app/_features/connectors/components/detail/ConnectorScopeSection";
import {
  parseCustomizeCategory,
  syncSourcesUrl,
} from "../sources-tab-routing";
import type {
  CustomizeCategoryData,
  CustomizeTabData,
} from "../sources-tab-data";
import { RuleInputBox } from "./RuleInputBox";

/**
 * Sources → Customize (2026-08-10) — intake policy at the intake surface,
 * organized by capture category instead of by app. Per category:
 *
 *   What Salt does by default   read-only transparency (P1 default-policy)
 *   Your accounts               per-account scope controls (moved from the
 *                               connector detail pane)
 *   Always let in / Keep out    smart parse box + rules
 *
 * The "All connectors" pill holds the workspace-wide rules (provider NULL),
 * editable here for the first time — previously they were only creatable
 * via Kept Out corrections.
 *
 * User-facing copy is "Customize" / "Always let in" / "Keep out";
 * engineering vocabulary stays "rules".
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
      data.categories.some((entry) => entry.category === requested))
      ? requested
      : (data.categories[0]?.category ?? "all"),
  );

  const select = (key: string) => {
    setSelected(key);
    syncSourcesUrl("customize", null, key);
  };

  if (data.categories.length === 0 && data.workspaceRules.length === 0) {
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

  const activeCategory =
    selected === "all"
      ? null
      : (data.categories.find((entry) => entry.category === selected) ?? null);

  return (
    <div className="max-w-3xl space-y-8">
      <div
        role="group"
        aria-label="Customize category"
        className="flex flex-wrap items-center gap-1.5"
      >
        <CategoryPill
          label="All connectors"
          active={selected === "all"}
          onSelect={() => select("all")}
        />
        {data.categories.map((entry) => (
          <CategoryPill
            key={entry.category}
            label={CATEGORY_LABELS[entry.category]}
            active={selected === entry.category}
            onSelect={() => select(entry.category)}
          />
        ))}
      </div>

      {activeCategory ? (
        <CategorySection
          data={activeCategory}
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

function CategoryPill({
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

function CategorySection({
  data,
  onChanged,
}: {
  data: CustomizeCategoryData;
  onChanged: () => void;
}) {
  const { policy } = data;
  const allowRules = data.rules.filter((rule) => rule.ruleType === "allow");
  const denyRules = data.rules.filter((rule) => rule.ruleType === "deny");

  return (
    <div className="space-y-8">
      <section className="space-y-2.5">
        <h3 className="text-sm font-semibold text-foreground">
          What Salt does by default
        </h3>
        <ul className="space-y-1.5">
          {[...policy.upstreamFilters, ...policy.gateBehavior].map((line) => (
            <li
              key={line}
              className="text-[13px] leading-snug text-muted-foreground"
            >
              {line}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Your accounts</h3>
        {data.accounts.map((account) => (
          <div key={account.provider} className="space-y-2">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <p className="text-[13px] font-medium text-foreground">
                {account.name}
              </p>
              {account.label ? (
                <p className="truncate text-xs text-muted-foreground">
                  {account.label}
                </p>
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
      >
        <CategoryRuleInput
          data={data}
          ruleType="allow"
          label="Always let in"
          onAdded={onChanged}
        />
      </RulesSection>
      <RulesSection
        title="Keep out"
        blurb="Matching items are dropped before they reach your stream."
        rules={denyRules}
        providers={data.accounts.map((account) => account.provider)}
        onChanged={onChanged}
      >
        <CategoryRuleInput
          data={data}
          ruleType="deny"
          label="Keep out"
          onAdded={onChanged}
        />
      </RulesSection>
    </div>
  );
}

/**
 * Rules are provider-scoped (no category scope in v1), so the box writes to
 * the category's connected account. When two accounts share a category
 * (Gmail + Outlook), the box says which one it applies to — never a silent
 * guess.
 */
function CategoryRuleInput({
  data,
  ruleType,
  label,
  onAdded,
}: {
  data: CustomizeCategoryData;
  ruleType: "allow" | "deny";
  label: string;
  onAdded: () => void;
}) {
  const account = data.accounts[0];
  if (!account) return null;
  return (
    <div className="space-y-1">
      <RuleInputBox
        provider={account.provider}
        category={data.category}
        ruleType={ruleType}
        label={label}
        onAdded={onAdded}
      />
      {data.accounts.length > 1 ? (
        <p className="text-xs leading-snug text-muted-foreground">
          Applies to {account.name}. Rules are per account — workspace-wide
          rules live under All connectors.
        </p>
      ) : null}
    </div>
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
        These rules apply to every connected account. Rules you create from
        the Kept Out section land here too.
      </p>
      <RulesSection
        title="Always let in"
        blurb="Matching items skip the noise filters and reach you at full prominence."
        rules={allowRules}
        providers={[null]}
        onChanged={onChanged}
      >
        <RuleInputBox
          provider={null}
          category={null}
          ruleType="allow"
          label="Always let in"
          onAdded={onChanged}
        />
      </RulesSection>
      <RulesSection
        title="Keep out"
        blurb="Matching items are dropped before they reach your stream."
        rules={denyRules}
        providers={[null]}
        onChanged={onChanged}
      >
        <RuleInputBox
          provider={null}
          category={null}
          ruleType="deny"
          label="Keep out"
          onAdded={onChanged}
        />
      </RulesSection>
    </div>
  );
}

/**
 * One rules list with its smart input — moved from the connector detail
 * pane's Customize tab (deleted in Phase 4 of this plan).
 */
function RulesSection({
  title,
  blurb,
  rules,
  providers,
  onChanged,
  children,
}: {
  title: string;
  blurb: string;
  rules: ConnectorRule[];
  /** Provider scopes a removal is legal for (null = workspace-wide). */
  providers: (string | null)[];
  onChanged: () => void;
  children: React.ReactNode;
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
      {children}
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
