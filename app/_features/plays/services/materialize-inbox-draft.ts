/**
 * Write the paused inbox draft (Gmail / Outlook) so "Open in Gmail" can
 * land on the letter Salt prepared, not an empty compose window.
 *
 * Does not approve or send. Approving later skips a second write.
 */

import {
  applyGmailAuthUser,
  extractArtifactUrl,
  inboxDraftToolFor,
  upsertInboxDraftArtifact,
  type DraftInboxLink,
} from "../lib/artifact-links";
import {
  applyPreparedInboxDraftArgs,
  prepareStoredDraft,
  type DraftSender,
} from "../lib/draft-preview";
import {
  collectPayLinksFromSources,
  type DraftPayLink,
} from "../lib/draft-payment-link";

/** Bump when inbox draft shaping changes so Open rewrites stale Gmail copies. */
export const INBOX_DRAFT_PREP_VERSION = 5;

export interface MaterializeInboxDraftRun {
  id: string;
  title: string;
  draftBody: string | null;
  approvalContext: {
    tool_slug: string;
    args: Record<string, unknown>;
    step_index: number;
    inbox_draft_written?: boolean;
  } | null;
  metadata: Record<string, unknown> | null;
  contextInputs?: Record<string, unknown> | null;
  targetId?: string | null;
}

export interface MaterializeInboxDraftDeps {
  loadRun(
    runId: string,
    workspaceId: string
  ): Promise<MaterializeInboxDraftRun | null>;
  executeTool(
    toolSlug: string,
    args: Record<string, unknown>,
    context: {
      workspaceId: string;
      actorUserId: string;
      approvedActions: readonly string[];
    }
  ): Promise<unknown>;
  saveRun(
    runId: string,
    workspaceId: string,
    patch: {
      metadata: Record<string, unknown>;
      approval_context: MaterializeInboxDraftRun["approvalContext"];
      draft_body?: string;
    }
  ): Promise<void>;
  meterExecution(
    workspaceId: string,
    playRunId: string,
    toolSlugs: string[]
  ): Promise<void>;
  loadSender?(userId: string): Promise<DraftSender>;
  loadInboxEmail?(workspaceId: string, toolSlug: string): Promise<string | null>;
  loadInvoicePayUrl?(
    workspaceId: string,
    targetId: string | null
  ): Promise<string | null>;
}

export type MaterializeInboxDraftResult =
  | { ok: true; url: string; label: string; draftBody: string }
  | { ok: false; error: string };

export type SyncPreparedDraftResult =
  | { ok: true; draftBody: string; subject: string }
  | { ok: false; error: string };

function payLinksForRun(
  run: MaterializeInboxDraftRun,
  extraUrl?: string | null
): DraftPayLink[] {
  return collectPayLinksFromSources({
    invoiceContext: run.contextInputs?.invoice_context,
    artifacts: run.metadata?.artifacts,
    verifyText: run.contextInputs?.verify_unpaid,
    extraUrls: extraUrl ? [extraUrl] : [],
  });
}

function preparedLetter(
  run: MaterializeInboxDraftRun,
  sender: DraftSender,
  payLinks: readonly DraftPayLink[] = []
): { subject: string; body: string } {
  const args = run.approvalContext?.args ?? {};
  const rawBody =
    (run.draftBody?.trim() ? run.draftBody : null) ??
    (typeof args.body === "string" ? args.body : "");
  return prepareStoredDraft({
    subject: typeof args.subject === "string" ? args.subject : null,
    body: rawBody,
    senderName: sender.senderName,
    emailSignature: sender.emailSignature,
    payLinks,
  });
}

function withPreparedArgs(
  approval: NonNullable<MaterializeInboxDraftRun["approvalContext"]>,
  prepared: { subject: string; body: string }
): NonNullable<MaterializeInboxDraftRun["approvalContext"]> {
  return {
    ...approval,
    args: {
      ...approval.args,
      subject: prepared.subject,
      body: prepared.body,
    },
  };
}

function existingDraftUrl(
  metadata: Record<string, unknown> | null
): string | null {
  const stored = metadata?.inbox_draft_url;
  if (typeof stored === "string" && stored.length > 0) return stored;
  const artifacts = metadata?.artifacts;
  if (!Array.isArray(artifacts)) return null;
  for (const item of artifacts) {
    if (!item || typeof item !== "object") continue;
    const artifact = item as { appId?: unknown; url?: unknown };
    if (
      (artifact.appId === "google" || artifact.appId === "outlook") &&
      typeof artifact.url === "string" &&
      artifact.url.length > 0 &&
      !/[?&]view=cm\b/.test(artifact.url)
    ) {
      return artifact.url;
    }
  }
  return null;
}

function isCurrentInboxDraftPrep(
  metadata: Record<string, unknown> | null,
  letter: string
): boolean {
  const written =
    typeof metadata?.inbox_draft_letter === "string"
      ? metadata.inbox_draft_letter
      : null;
  return (
    metadata?.inbox_draft_prepared === true &&
    metadata?.inbox_draft_prep_version === INBOX_DRAFT_PREP_VERSION &&
    (written === null || written === letter)
  );
}

function inboxLabel(toolSlug: string): DraftInboxLink["label"] {
  return toolSlug === "OUTLOOK_CREATE_DRAFT" ? "Outlook" : "Gmail";
}

function inboxAppId(toolSlug: string): string {
  return toolSlug === "OUTLOOK_CREATE_DRAFT" ? "outlook" : "google";
}

async function pinInboxUrl(
  url: string,
  toolSlug: string,
  workspaceId: string,
  deps: Pick<MaterializeInboxDraftDeps, "loadInboxEmail">
): Promise<string> {
  if (toolSlug !== "GMAIL_CREATE_EMAIL_DRAFT") return url;
  const email = (await deps.loadInboxEmail?.(workspaceId, toolSlug)) ?? null;
  return applyGmailAuthUser(url, email);
}

export async function syncPreparedDraftBody(
  input: { playRunId: string; workspaceId: string; userId: string },
  deps: Pick<
    MaterializeInboxDraftDeps,
    "loadRun" | "saveRun" | "loadSender" | "loadInvoicePayUrl"
  >
): Promise<SyncPreparedDraftResult> {
  const run = await deps.loadRun(input.playRunId, input.workspaceId);
  if (!run) return { ok: false, error: "Play not found" };

  const approval = run.approvalContext;
  if (!approval?.tool_slug || !inboxDraftToolFor(approval.tool_slug)) {
    return { ok: false, error: "This play has no inbox draft to open" };
  }

  const sender = (await deps.loadSender?.(input.userId)) ?? {};
  const extraUrl = await deps.loadInvoicePayUrl?.(input.workspaceId, run.targetId ?? null);
  const prepared = preparedLetter(run, sender, payLinksForRun(run, extraUrl));
  if (!prepared.body) return { ok: false, error: "This play has no letter to update" };

  if (run.draftBody === prepared.body) {
    return { ok: true, draftBody: prepared.body, subject: prepared.subject };
  }

  await deps.saveRun(input.playRunId, input.workspaceId, {
    metadata: run.metadata ?? {},
    approval_context: withPreparedArgs(approval, prepared),
    draft_body: prepared.body,
  });

  return { ok: true, draftBody: prepared.body, subject: prepared.subject };
}

export async function materializeInboxDraft(
  input: {
    playRunId: string;
    workspaceId: string;
    userId: string;
    draftBody?: string | null;
  },
  deps: MaterializeInboxDraftDeps
): Promise<MaterializeInboxDraftResult> {
  const run = await deps.loadRun(input.playRunId, input.workspaceId);
  if (!run) return { ok: false, error: "Play not found" };
  if (input.draftBody?.trim()) {
    run.draftBody = input.draftBody;
  }

  const approval = run.approvalContext;
  const draftTool = approval?.tool_slug
    ? inboxDraftToolFor(approval.tool_slug)
    : null;
  if (!approval?.tool_slug || !draftTool) {
    return { ok: false, error: "This play has no inbox draft to open" };
  }

  const sender = (await deps.loadSender?.(input.userId)) ?? {};
  const extraUrl = await deps.loadInvoicePayUrl?.(input.workspaceId, run.targetId ?? null);
  const payLinks = payLinksForRun(run, extraUrl);
  const prepared = preparedLetter(run, sender, payLinks);
  const already = existingDraftUrl(run.metadata);
  if (already && isCurrentInboxDraftPrep(run.metadata, prepared.body)) {
    const url = await pinInboxUrl(
      already,
      draftTool,
      input.workspaceId,
      deps
    );
    if (run.draftBody !== prepared.body || url !== already) {
      await deps.saveRun(input.playRunId, input.workspaceId, {
        metadata: {
          ...(run.metadata ?? {}),
          inbox_draft_url: url,
        },
        approval_context: withPreparedArgs(approval, prepared),
        draft_body: prepared.body,
      });
    }
    return {
      ok: true,
      url,
      label: inboxLabel(draftTool),
      draftBody: prepared.body,
    };
  }

  const args = applyPreparedInboxDraftArgs(
    { ...approval.args },
    prepared.body || run.draftBody,
    sender,
    draftTool,
    payLinks
  );

  let response: unknown;
  try {
    response = await deps.executeTool(draftTool, args, {
      workspaceId: input.workspaceId,
      actorUserId: input.userId,
      approvedActions: [draftTool],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create the inbox draft";
    return { ok: false, error: message };
  }

  const extracted = extractArtifactUrl(draftTool, response);
  if (!extracted) {
    return { ok: false, error: "The inbox did not return a link to the draft" };
  }
  const url = await pinInboxUrl(
    extracted,
    draftTool,
    input.workspaceId,
    deps
  );

  const artifacts = upsertInboxDraftArtifact(
    Array.isArray(run.metadata?.artifacts)
      ? [...(run.metadata.artifacts as unknown[])]
      : [],
    {
      appId: inboxAppId(draftTool),
      label: `Draft in ${inboxLabel(draftTool)}`,
      url,
    }
  );

  const metadata = {
    ...(run.metadata ?? {}),
    artifacts,
    inbox_draft_url: url,
    inbox_draft_letter: prepared.body,
    inbox_draft_prepared: true,
    inbox_draft_prep_version: INBOX_DRAFT_PREP_VERSION,
  };
  const approvalContext = {
    ...withPreparedArgs(approval, prepared),
    inbox_draft_written: true,
  };

  await deps.saveRun(input.playRunId, input.workspaceId, {
    metadata,
    approval_context: approvalContext,
    draft_body: prepared.body,
  });
  await deps.meterExecution(input.workspaceId, input.playRunId, [
    draftTool,
  ]);

  return {
    ok: true,
    url,
    label: inboxLabel(draftTool),
    draftBody: prepared.body,
  };
}
