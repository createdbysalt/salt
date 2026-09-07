"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/app/_lib/tenancy";
import { getWorkspaceMemberOrNull } from "@/app/_lib/tenancy/guards";
import { sendLlm, workspaceSpend } from "@/app/_lib/ai/gpt";
import { getWorkspaceEntitlement } from "@/app/_lib/usage/entitlements";
import { resolveScanCaptureCap } from "@/app/_lib/usage/capture-scan-cap";
import { isComposioConfigured } from "@/app/_lib/composio/connections";
import { reconcileWorkspaceCaptures } from "../services/capture-reconciliation";
import {
  runDailyScan,
  type DailyScanResult,
} from "../services/intelligence";
import {
  runHeldIntentDiscovery,
  type HeldIntentDiscoveryResult,
} from "../services/held-intent-discovery";
import { runCareCapability } from "@/app/_features/memory/care";

function isNextRedirectError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.message === "NEXT_REDIRECT") return true;
  const digest = (error as Error & { digest?: string }).digest;
  return typeof digest === "string" && digest.includes("NEXT_REDIRECT");
}

function supabaseProjectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? "unknown";
}

function sessionRecoveryMessage(): string {
  const ref = supabaseProjectRef();
  const isStaging = ref === "<project-ref>";
  if (isStaging) {
    return "Not signed in for staging. Open /dev-login and sign in again (pnpm dev:staging:op uses the staging database).";
  }
  return "Not signed in. Open /dev-login or /signin and try again.";
}

function createLlmCall(workspaceId: string, userId: string) {
  return async (systemPrompt: string, userPrompt: string): Promise<string> => {
    const result = await sendLlm(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      workspaceSpend(workspaceId, userId),
      {
        routingKey: "insights",
        maxTokens: 1000,
        temperature: 0.3,
      }
    );
    return result || "{}";
  };
}

export interface CaptureSyncSummary {
  providers: string[];
  capturesCreated: number;
  failures: string[];
}

export interface CaptureSyncActionResult {
  success: boolean;
  sync?: CaptureSyncSummary;
  error?: string;
}

export interface SyncAndScanActionResult {
  success: boolean;
  sync?: CaptureSyncSummary | null;
  scan?: DailyScanResult;
  /** Batch cold-intent reads over held mail (Lane 1 backlog). */
  heldDiscovery?: HeldIntentDiscoveryResult;
  /** On-demand Memory Care runs (hygiene, records). */
  playbookRuns?: Record<string, { success: boolean; summary?: string }>;
  error?: string;
}

/**
 * Sync then scan — canonical capture pipeline.
 * 1. Reconcile ALL capture-enabled connectors (Gmail, Calendar, Stripe, etc.)
 * 2. Classify every capture in the lookback window that lacks a scan outcome
 */
export async function syncAndScanCaptures(options?: {
  lookbackDays?: number;
  rescan?: boolean;
}): Promise<SyncAndScanActionResult> {
  try {
    const { context } = await getTenantContext();
    const workspace = getWorkspaceMemberOrNull(context);

    if (!workspace) {
      return { success: false, error: sessionRecoveryMessage() };
    }

    const userId = context.userId!;
    const lookbackDays = options?.lookbackDays ?? 7;
    const lookbackHours = lookbackDays * 24;

    let sync: CaptureSyncSummary | null = null;
    const scanWarnings: string[] = [];

    if (isComposioConfigured()) {
      const reconciliation = await reconcileWorkspaceCaptures(workspace.id, {
        lookbackDays,
        // Long-tail connectors supplement deterministic signals with the
        // metered LLM extractor (Sources plan 5.4).
        llmCall: createLlmCall(workspace.id, userId),
      });

      sync = {
        providers: reconciliation.providers,
        capturesCreated: reconciliation.capturesCreated,
        failures: reconciliation.failures.map((f) => `${f.provider}: ${f.error}`),
      };

      if (reconciliation.failures.length > 0) {
        scanWarnings.push(
          `Sync failures: ${reconciliation.failures.map((f) => f.provider).join(", ")}`
        );
      }

      if (reconciliation.providers.length === 0) {
        scanWarnings.push(
          "No capture-enabled connectors found. Enable capture on a connector first."
        );
      }
    } else {
      scanWarnings.push(
        "Capture sync skipped: COMPOSIO_API_KEY is not set. Scanned existing captures only."
      );
    }

    // One model call per capture, so the ceiling comes from the workspace's
    // tier rather than from the size of its inbox.
    const entitlement = await getWorkspaceEntitlement(workspace.id);
    const maxEmails = resolveScanCaptureCap(
      entitlement.tier,
      entitlement.pricingVersion,
    );

    const scan = await runDailyScan(workspace.id, userId, {
      llmCall: createLlmCall(workspace.id, userId),
      lookbackHours,
      maxEmails,
      scanAll: true,
      rescan: options?.rescan ?? false,
    });

    if (scan.emailsProcessed >= maxEmails) {
      scanWarnings.push(
        `Scanned the ${maxEmails} most recent captures, the limit for the ${entitlement.tier} plan. ` +
          "Older captures in this window were not classified — run again later or shorten the lookback.",
      );
    }

    if (scanWarnings.length > 0) {
      scan.errors.unshift(...scanWarnings);
    }

    // Lane 1 backlog: the real-time intent read only fires on the webhook
    // path. Held senders the free DB criteria can't promote get the same
    // cheap, metered read here — Sync & Scan is the explicit "look now".
    const heldDiscovery = await runHeldIntentDiscovery(workspace.id).catch(
      (error) => {
        scan.errors.push(
          `held-discovery: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        return undefined;
      },
    );

    // On-demand Memory Care runs: hygiene findings and fill-rule sweeps
    // feed Watching immediately instead of waiting for the weekly schedule.
    const playbookRuns: SyncAndScanActionResult["playbookRuns"] = {};
    for (const capability of ["hygiene", "records"] as const) {
      const result = await runCareCapability(capability, {
        workspaceId: workspace.id,
        trigger: "manual",
        triggerSignal: "sync_and_scan",
      });
      const key = `memory-${capability}`;
      playbookRuns[key] = {
        success: result.success,
        summary: result.summary ?? result.error,
      };
      if (!result.success && result.error) {
        scan.errors.push(`${key}: ${result.error}`);
      }
    }

    revalidatePath("/plays");
    revalidatePath("/sources");

    return { success: true, sync, scan, heldDiscovery, playbookRuns };
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }
    console.error("Sync and scan failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Sync Captures — fetch from ALL capture-enabled connectors.
 * Prefer syncAndScanCaptures for the full pipeline.
 *
 * @deprecated Use syncAndScanCaptures instead
 */
export async function syncCapturesFromGmail(options?: {
  lookbackDays?: number;
}): Promise<CaptureSyncActionResult> {
  try {
    const { context } = await getTenantContext();
    const workspace = getWorkspaceMemberOrNull(context);

    if (!workspace) {
      return { success: false, error: sessionRecoveryMessage() };
    }

    if (!isComposioConfigured()) {
      return {
        success: false,
        error:
          "Capture sync requires Composio. Restart with pnpm dev:staging:op (COMPOSIO_API_KEY in .env.staging.1password).",
      };
    }

    const lookbackDays = options?.lookbackDays ?? 7;
    const reconciliation = await reconcileWorkspaceCaptures(workspace.id, {
      lookbackDays,
      llmCall: createLlmCall(workspace.id, context.userId!),
    });

    if (reconciliation.failures.length > 0 && reconciliation.capturesCreated === 0) {
      return {
        success: false,
        error: reconciliation.failures.map((f) => `${f.provider}: ${f.error}`).join("; "),
      };
    }

    revalidatePath("/plays");
    revalidatePath("/sources");

    return {
      success: true,
      sync: {
        providers: reconciliation.providers,
        capturesCreated: reconciliation.capturesCreated,
        failures: reconciliation.failures.map((f) => `${f.provider}: ${f.error}`),
      },
    };
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }
    console.error("Capture sync failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Run Intelligence Scan — classify existing capture_events only.
 * Does not fetch new mail from Gmail. Use syncCapturesFromGmail first.
 */
export async function runIntelligenceScan(options?: {
  lookbackHours?: number;
  maxEmails?: number;
  /** Process every capture in the lookback window (default true for manual scan). */
  scanAll?: boolean;
  dryRun?: boolean;
  rescan?: boolean;
}): Promise<{ success: boolean; result?: DailyScanResult; error?: string }> {
  try {
    const { context } = await getTenantContext();
    const workspace = getWorkspaceMemberOrNull(context);

    if (!workspace) {
      return { success: false, error: sessionRecoveryMessage() };
    }

    const userId = context.userId!;
    const lookbackHours = options?.lookbackHours ?? 168;
    const scanAll = options?.scanAll ?? true;

    const result = await runDailyScan(workspace.id, userId, {
      llmCall: createLlmCall(workspace.id, userId),
      lookbackHours,
      maxEmails: options?.maxEmails ?? 100,
      scanAll,
      dryRun: options?.dryRun ?? false,
      rescan: options?.rescan ?? false,
    });

    if (!options?.dryRun) {
      revalidatePath("/plays");
      revalidatePath("/sources");
    }

    return { success: true, result };
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }
    console.error("Intelligence scan failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
