"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@repo/utils";
import { Button } from "@repo/ui";
import type { CaptureScope } from "@/app/_lib/composio/capture-scope";
import type { ConnectorRule } from "@/app/_features/capture/services/rules-manager";
import {
  ENTITY_TYPE_LABELS,
  type RuleEntityOption,
} from "@/app/_features/capture/adapters/rule-entities";
import type { ConnectorRuleEntityType } from "@/app/_features/capture/adapters/types";
import {
  addConnectorRule,
  getConnectorCustomization,
  removeConnectorRule,
} from "../../actions/rules";
import { ConnectorScopeSection } from "./ConnectorScopeSection";

/**
 * Customize tab on the connector detail pane (Connector Rules & Learning,
 * P3). One place for "what Salt watches" (capture scope) and this
 * connection's allow/deny rules. Workspace-wide rules are inherited intake
 * policy — shown read-only with a pointer to Sources → Activity.
 */

interface ConnectorCustomizeTabProps {
  provider: string;
  connectorName: string;
  captureCapable: boolean;
  captureEnabled: boolean;
  scope: CaptureScope | null;
  onChanged: () => void;
}

export function ConnectorCustomizeTab({
  provider,
  connectorName,
  captureCapable,
  captureEnabled,
  scope,
  onChanged,
}: ConnectorCustomizeTabProps) {
  const [entityOptions, setEntityOptions] = React.useState<
    RuleEntityOption[] | null
  >(null);
  const [providerRules, setProviderRules] = React.useState<
    ConnectorRule[] | null
  >(null);
  const [workspaceRules, setWorkspaceRules] = React.useState<ConnectorRule[]>(
    [],
  );

  React.useEffect(() => {
    let cancelled = false;
    void getConnectorCustomization({ provider }).then((result) => {
      if (cancelled) return;
      if (result.success) {
        setEntityOptions(result.data.entityOptions);
        setProviderRules(result.data.providerRules);
        setWorkspaceRules(result.data.workspaceRules);
      } else {
        toast.error(result.error);
        setEntityOptions([]);
        setProviderRules([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [provider]);

  const reload = () => {
    void getConnectorCustomization({ provider }).then((result) => {
      if (result.success) {
        setProviderRules(result.data.providerRules);
        setWorkspaceRules(result.data.workspaceRules);
      }
    });
  };

  const allowRules = (providerRules ?? []).filter(
    (rule) => rule.ruleType === "allow",
  );
  const denyRules = (providerRules ?? []).filter(
    (rule) => rule.ruleType === "deny",
  );

  if (!captureCapable) {
    return (
      <div className="space-y-6">
        <p className="max-w-xl rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          Salt can act on {connectorName}, but doesn&apos;t yet learn from it
          in the background — so there&apos;s nothing to customize here yet.
          Capture is coming as this connector is built out.
        </p>
        {workspaceRules.length > 0 ? (
          <WorkspaceRulesSection rules={workspaceRules} />
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {captureEnabled ? (
        <ConnectorScopeSection
          provider={provider}
          scope={scope}
          onChanged={onChanged}
        />
      ) : null}

      <RulesSection
        title="Always let in"
        blurb="Matching items skip the noise filters and reach you at full prominence."
        rules={allowRules}
        loading={providerRules === null}
        onRemoved={reload}
        provider={provider}
      />
      <RulesSection
        title="Keep out"
        blurb="Matching items are dropped before they reach your stream."
        rules={denyRules}
        loading={providerRules === null}
        onRemoved={reload}
        provider={provider}
      />

      {entityOptions && entityOptions.length > 0 ? (
        <AddRuleForm
          provider={provider}
          entityOptions={entityOptions}
          onAdded={reload}
        />
      ) : null}

      {workspaceRules.length > 0 ? (
        <WorkspaceRulesSection rules={workspaceRules} />
      ) : null}
    </div>
  );
}

function RuleRow({
  rule,
  onRemove,
}: {
  rule: ConnectorRule;
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
      ) : null}
    </li>
  );
}

function RulesSection({
  title,
  blurb,
  rules,
  loading,
  provider,
  onRemoved,
}: {
  title: string;
  blurb: string;
  rules: ConnectorRule[];
  loading: boolean;
  provider: string;
  onRemoved: () => void;
}) {
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  const remove = async (ruleId: string) => {
    setRemovingId(ruleId);
    const result = await removeConnectorRule({ provider, ruleId });
    setRemovingId(null);
    if (result.success) {
      onRemoved();
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
      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Loading…
        </p>
      ) : rules.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {rules.map((rule) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              onRemove={
                removingId === rule.id
                  ? undefined
                  : () => void remove(rule.id)
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function WorkspaceRulesSection({ rules }: { rules: ConnectorRule[] }) {
  return (
    <section className="space-y-2.5">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">
          Workspace rules
        </h3>
        <p className="text-xs leading-snug text-muted-foreground">
          These apply to every connector. Manage them from the intake stream.
        </p>
      </div>
      <ul className="space-y-1.5">
        {rules.map((rule) => (
          <RuleRow key={rule.id} rule={rule} />
        ))}
      </ul>
      <Link
        href="/sources?tab=activity"
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        Open Sources activity
        <ChevronRight className="size-3" />
      </Link>
    </section>
  );
}

function AddRuleForm({
  provider,
  entityOptions,
  onAdded,
}: {
  provider: string;
  entityOptions: RuleEntityOption[];
  onAdded: () => void;
}) {
  const [ruleType, setRuleType] = React.useState<"allow" | "deny">("allow");
  const [entityType, setEntityType] = React.useState<ConnectorRuleEntityType>(
    entityOptions[0].type,
  );
  const [entityKey, setEntityKey] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const activeOption =
    entityOptions.find((option) => option.type === entityType) ??
    entityOptions[0];

  const submit = async () => {
    const key = entityKey.trim();
    if (!key) return;
    setSaving(true);
    const result = await addConnectorRule({
      provider,
      ruleType,
      entityType,
      entityKey: key,
    });
    setSaving(false);
    if (result.success) {
      setEntityKey("");
      onAdded();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <section className="space-y-2.5">
      <h3 className="text-sm font-semibold text-foreground">Add a rule</h3>
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label="Rule type"
          className="inline-flex rounded-full border border-border/60 p-0.5"
        >
          {(
            [
              { value: "allow", label: "Always let in" },
              { value: "deny", label: "Keep out" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={ruleType === option.value}
              onClick={() => setRuleType(option.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                ruleType === option.value
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        {entityOptions.length > 1 ? (
          <div
            role="group"
            aria-label="Rule target"
            className="inline-flex rounded-full border border-border/60 p-0.5"
          >
            {entityOptions.map((option) => (
              <button
                key={option.type}
                type="button"
                aria-pressed={entityType === option.type}
                onClick={() => setEntityType(option.type)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition",
                  entityType === option.type
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={entityKey}
          onChange={(event) => setEntityKey(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void submit();
          }}
          placeholder={activeOption.placeholder}
          aria-label={`${activeOption.label} value`}
          className="h-9 w-full max-w-xs rounded-full border border-border/60 bg-background px-3.5 text-sm outline-none transition hover:border-border focus:ring-4 focus:ring-foreground/5"
        />
        <Button
          type="button"
          size="sm"
          className="rounded-full px-4"
          disabled={saving || entityKey.trim().length === 0}
          onClick={() => void submit()}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : "Add rule"}
        </Button>
      </div>
    </section>
  );
}
