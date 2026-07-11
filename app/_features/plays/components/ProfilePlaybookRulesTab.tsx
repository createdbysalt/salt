"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ProfileFillRule } from "@/app/_features/plays/playbooks/records-engine/types";
import {
  formatProfileRuleCondition,
  formatProfileRuleOutcome,
  profileFieldLabel,
} from "@/app/_features/plays/utils/profile-rule-display";
import { cn } from "@repo/utils";

type ProfilePlaybookRulesTabProps = {
  rulesByField: Record<string, ProfileFillRule[]>;
  autoApplyThreshold: number;
  domainRulesText: string | null;
};

const DOMAIN_RULE_SECTIONS = [
  "Admission Policy",
  "Entity Taxonomy",
  "Identity Resolution And Dedupe",
  "Field Completion Matrix",
  "Negative Examples",
  "Confidence Policy",
] as const;

const markdownComponents: Components = {
  h2: ({ children }) => (
    <h3 className="text-base font-semibold text-foreground mt-8 mb-3 first:mt-0">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="text-sm font-semibold text-foreground mt-6 mb-2">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="mb-3 text-sm leading-relaxed text-foreground/75">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 space-y-1.5 pl-5 list-disc text-sm leading-relaxed text-foreground/75 marker:text-muted-foreground/60">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 space-y-1.5 pl-5 list-decimal text-sm leading-relaxed text-foreground/75 marker:text-muted-foreground/60">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-medium text-foreground">{children}</strong>,
  code: ({ children }) => (
    <code className="rounded bg-muted/60 px-1.5 py-0.5 text-[13px] text-foreground">{children}</code>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-2xl border border-border/60">
      <table className="min-w-full text-left text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/50 text-foreground">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-border/60 px-3 py-2 font-semibold">{children}</th>
  ),
  td: ({ children }) => (
    <td className="align-top border-b border-border/40 px-3 py-2 text-muted-foreground last:border-b-0">
      {children}
    </td>
  ),
};

function extractMarkdownSection(markdown: string, title: string): string | null {
  const pattern = new RegExp(
    `(?:^|\\n)(## ${escapeRegExp(title)}\\n[\\s\\S]*?)(?=\\n##\\s|$)`,
  );
  const match = markdown.match(pattern);
  return match?.[1]?.trim() ?? null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractDomainRules(markdown: string | null): string | null {
  if (!markdown) return null;
  const sections = DOMAIN_RULE_SECTIONS.flatMap((title) => {
    const section = extractMarkdownSection(markdown, title);
    return section ? [section] : [];
  });
  return sections.length > 0 ? sections.join("\n\n") : null;
}

export function ProfilePlaybookRulesTab({
  rulesByField,
  autoApplyThreshold,
  domainRulesText,
}: ProfilePlaybookRulesTabProps) {
  const fields = Object.entries(rulesByField);
  const ruleCount = fields.reduce((sum, [, rules]) => sum + rules.length, 0);
  const domainRules = extractDomainRules(domainRulesText);

  if (ruleCount === 0 && !domainRules) {
    return (
      <p className="text-sm text-muted-foreground">
        No fill rules loaded yet. Seed the playbook registry or check the authored source.
      </p>
    );
  }

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h2 className="font-display text-2xl tracking-tight text-foreground">
          Decision rules
        </h2>
        <p className="text-sm text-foreground/75 leading-relaxed">
          These are the policies Salt uses to decide what qualifies, what gets skipped, what waits for
          review, and which executable field rules can run.
        </p>
      </div>

      {domainRules ? (
        <section>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {domainRules}
          </ReactMarkdown>
        </section>
      ) : null}

      {ruleCount > 0 ? (
        <section className="space-y-5">
          <div>
            <h3 className="text-base font-semibold text-foreground">Executable field rules</h3>
            <p className="mt-1 text-sm text-foreground/75 leading-relaxed">
              Keeper checks these rules from top to bottom for each field, and the first match wins.
              Auto-apply rules run on their own. Accumulate rules gather evidence over time until
              confident. Ask first rules always wait for your approval.
            </p>
          </div>

          {fields.map(([field, rules]) => (
            <section key={field} className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground">
                {profileFieldLabel(field as ProfileFillRule["field"])}
              </h4>

              <div className="space-y-3">
                {rules.map((rule, index) => (
                  <RuleRow
                    key={rule.id}
                    rule={rule}
                    position={index + 1}
                    autoApplyThreshold={autoApplyThreshold}
                  />
                ))}
              </div>
            </section>
          ))}
        </section>
      ) : null}

      <p className="text-xs text-muted-foreground border-t border-border/50 pt-4">
        First match wins · Auto-apply at {autoApplyThreshold}%+ confidence · Accumulate gathers evidence over time · Ask first always requires approval
      </p>
    </div>
  );
}

function RuleRow({
  rule,
  position,
  autoApplyThreshold,
}: {
  rule: ProfileFillRule;
  position: number;
  autoApplyThreshold: number;
}) {
  return (
    <div className="flex gap-3">
      <span className="text-sm font-semibold tabular-nums text-muted-foreground/70 pt-0.5 w-4 shrink-0 text-right">
        {position}
      </span>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="text-sm text-foreground">
            <span className="text-muted-foreground">When </span>
            {formatProfileRuleCondition(rule)}
            <span className="text-muted-foreground"> → </span>
            <span className="font-medium">{formatProfileRuleOutcome(rule)}</span>
          </p>
          <RuleBadge field={rule.field} confidence={rule.confidence} threshold={autoApplyThreshold} />
        </div>
        <p className="text-xs text-muted-foreground">{rule.because}</p>
      </div>
    </div>
  );
}

type RuleExecutionPath = "auto_apply" | "accumulate" | "ask_first";

const ASK_FIRST_FIELDS = ["industry", "industry_parent", "preferred_channel", "work_type", "billing_model", "business_model", "pricing_model"];

function getRuleExecutionPath(field: string, confidence: number, threshold: number): RuleExecutionPath {
  if (ASK_FIRST_FIELDS.includes(field)) return "ask_first";
  if (confidence >= threshold) return "auto_apply";
  return "accumulate";
}

function RuleBadge({ field, confidence, threshold }: { field: string; confidence: number; threshold: number }) {
  const path = getRuleExecutionPath(field, confidence, threshold);

  const styles: Record<RuleExecutionPath, { bg: string; text: string; label: string }> = {
    auto_apply: { bg: "bg-violet/10", text: "text-violet", label: "Auto-apply" },
    accumulate: { bg: "bg-amber-500/10", text: "text-amber-600", label: "Accumulate" },
    ask_first: { bg: "bg-flame/10", text: "text-flame", label: "Ask first" },
  };

  const { bg, text, label } = styles[path];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        bg,
        text,
      )}
    >
      {label}
    </span>
  );
}
