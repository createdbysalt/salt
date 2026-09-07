import "server-only";

/**
 * Gate preview for paused runs — the consent-honesty layer.
 *
 * Four independent gates can block a play (step approval, tool
 * classification, workspace trust, email mode), and before 2026-09-06 the
 * approval card implied one consent covered all of them. The user found out
 * otherwise via a post-approval failure — the worst moment to break the
 * promise an approval product makes.
 *
 * This service evaluates gates 2–4 read-only for a paused run's pending tool
 * and returns the verdict the card renders BEFORE the click: what approving
 * will actually do, or what's blocking it and where to fix it.
 *
 * It reuses the gate's own inputs (`getApprovedToolClassification`,
 * `getWorkspaceConnectorPolicy`, the capability-config email mappings) and
 * never re-implements policy — if the gate's rules change, the preview
 * follows. `check-run-preconditions.test.ts` asserts the preview agrees
 * with `assertComposioToolAllowed` per state.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getApprovedToolClassification } from "@/app/_lib/composio/classification-store";
import { getComposioProviderForToolSlug } from "@/app/_features/connectors/connector-capabilities";
import { getWorkspaceConnectorPolicy } from "@/app/_features/connectors/queries";
import {
  getEmailProviderCapability,
  getProviderForSendTool,
  isSendEmailTool,
} from "@/app/_lib/composio/capability-config";
import { MEMORY_NOTE_TOOL_SLUG } from "./write-memory-note";

export type RunPreconditionKind =
  /** Approving executes the pending tool as shown on the card. */
  | "will_execute"
  /** Email provider is in draft mode — approving creates a draft instead. */
  | "will_draft"
  /** Classification disabled/rejected (drift re-review) or never classified. */
  | "blocked_classification"
  /** Workspace trust is read-only; the connector can't act. */
  | "blocked_trust"
  /** Send tool with no draft fallback while the provider is in draft mode. */
  | "blocked_email_mode";

export interface RunPreconditionVerdict {
  kind: RunPreconditionKind;
  /** Short card copy: "Will send via Gmail" / "Pending security re-review". */
  summary: string;
  /** Longer line for the detail modal. */
  detail: string;
  /** Settings deep-link that resolves a blocked/will_draft state. */
  fixHref?: string;
  fixLabel?: string;
  /** The tool that will actually execute — the draft slug on fallback. */
  effectiveToolSlug: string;
  /** Provider label when known ("Gmail", "Outlook"). */
  providerLabel?: string;
}

/**
 * Distinguish "pending security re-review" (drift-disabled / rejected) from
 * "never classified" for the blocked copy. Read-only status check — the
 * allow/deny decision itself comes from `getApprovedToolClassification`.
 */
async function readClassificationStatus(
  toolSlug: string,
): Promise<"disabled" | "rejected" | "approved" | "missing"> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("tool_classifications")
      .select("status")
      .eq("tool_slug", toolSlug)
      .maybeSingle();
    const status = data?.status as string | undefined;
    if (status === "disabled" || status === "rejected" || status === "approved") {
      return status;
    }
    return "missing";
  } catch {
    // A status-read failure must not break the preview — say "missing" and
    // let the copy stay generic.
    return "missing";
  }
}

export async function checkRunPreconditions(input: {
  workspaceId: string;
  /** Resolved pending tool: inboxSendToolFor(approval.tool_slug) ?? approval.tool_slug. */
  toolSlug: string;
  /** Target label for the memory-note verdict copy ("Acme MSA 2026.pdf"). */
  targetLabel?: string | null;
}): Promise<RunPreconditionVerdict> {
  const { workspaceId, toolSlug } = input;

  // The memory-note sentinel never touches the connector gate — the resume
  // path writes through the canonical note path.
  if (toolSlug === MEMORY_NOTE_TOOL_SLUG) {
    return {
      kind: "will_execute",
      summary: `Will file the note on ${input.targetLabel ?? "the record"}`,
      detail:
        "Approving writes the note to Memory through Salt's protected note path. Nothing leaves the app.",
      effectiveToolSlug: toolSlug,
    };
  }

  // Gate 2: tool classification (drift-disabled hard-denies by design).
  const policy = await getApprovedToolClassification(toolSlug);
  if (!policy) {
    const status = await readClassificationStatus(toolSlug);
    const underReview = status === "disabled" || status === "rejected";
    return {
      kind: "blocked_classification",
      summary: underReview
        ? "Pending security re-review"
        : "Connector tool not yet classified",
      detail: underReview
        ? `${toolSlug} changed upstream and is being re-reviewed before Salt can run it again. This is a system state, not something your approval can override — it clears as soon as the review lands.`
        : `${toolSlug} has no security classification yet, so Salt can't run it. It clears when the connector catalog classifies the tool.`,
      effectiveToolSlug: toolSlug,
    };
  }
  if (policy.risk === "destructive") {
    return {
      kind: "blocked_classification",
      summary: "Never executable",
      detail: `${toolSlug} is classified destructive — Salt never runs it, approved or not.`,
      effectiveToolSlug: toolSlug,
    };
  }

  // Gates 3–4 only apply to mutating tools (reads skip the trust ladder).
  if (policy.risk === "mutating") {
    const connectorPolicy = await getWorkspaceConnectorPolicy(workspaceId);

    // Gate 3: workspace trust (one Settings switch, applied per provider).
    const provider = getComposioProviderForToolSlug(toolSlug);
    const trust = provider
      ? connectorPolicy.trustByProvider[provider]
      : undefined;
    if (trust !== "act_with_approval" && trust !== "trust") {
      return {
        kind: "blocked_trust",
        summary: "Connector is set to Read only",
        detail: `${providerLabel(provider)} can read but not act. Switch the connector trust to "Ask" or "Trust" to let this play run.`,
        fixHref: "/settings/plays",
        fixLabel: "Open Plays settings",
        effectiveToolSlug: toolSlug,
        providerLabel: providerLabel(provider),
      };
    }

    // Gate 4: email mode. Draft mode is not a blocker — the resume path
    // falls back to creating a draft, so the verdict is will_draft.
    if (isSendEmailTool(toolSlug)) {
      const emailProvider = getProviderForSendTool(toolSlug);
      const cap = emailProvider
        ? getEmailProviderCapability(emailProvider)
        : undefined;
      const mode = emailProvider
        ? connectorPolicy.emailModeByProvider?.[emailProvider]
        : undefined;
      if (mode !== "send") {
        if (cap?.draftTool) {
          return {
            kind: "will_draft",
            summary: `Will create a draft — ${cap.label} is in draft mode`,
            detail: `${cap.label} is in draft mode, so approving creates a draft instead of sending. Switch to Send mode to send email directly.`,
            fixHref: "?settings=connectors",
            fixLabel: `Open ${cap.label} settings`,
            effectiveToolSlug: cap.draftTool,
            providerLabel: cap.label,
          };
        }
        return {
          kind: "blocked_email_mode",
          summary: `${cap?.label ?? "Email"} is in draft mode`,
          detail: `${cap?.label ?? "This email provider"} is in draft mode and has no draft fallback for this action. Switch to Send mode to send.`,
          fixHref: "?settings=connectors",
          fixLabel: "Open connector settings",
          effectiveToolSlug: toolSlug,
          providerLabel: cap?.label,
        };
      }
      return {
        kind: "will_execute",
        summary: `Will send via ${cap?.label ?? "email"}`,
        detail: `Approving sends the email through ${cap?.label ?? "the connected inbox"}.`,
        effectiveToolSlug: toolSlug,
        providerLabel: cap?.label,
      };
    }
  }

  return {
    kind: "will_execute",
    summary: `Will run ${toolSlug}`,
    detail: "Approving executes this step immediately.",
    effectiveToolSlug: toolSlug,
    providerLabel: providerLabel(getComposioProviderForToolSlug(toolSlug)),
  };
}

function providerLabel(provider: string | null | undefined): string | undefined {
  if (!provider) return undefined;
  return (
    getEmailProviderCapability(provider)?.label ??
    provider.charAt(0).toUpperCase() + provider.slice(1)
  );
}
