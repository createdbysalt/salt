"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/app/_lib/tenancy";
import { getWorkspaceMemberOrNull } from "@/app/_lib/tenancy/guards";
import { sendLlm } from "@/app/_lib/ai/gpt";
import { isComposioConfigured } from "@/app/_lib/composio/connections";
import { backfillGmailCaptures } from "../services/gmail-backfill";
import {
  runDailyScan,
  type DailyScanResult,
  type GmailSyncSummary,
} from "../services/intelligence";

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

function createLlmCall(userId: string) {
  return async (systemPrompt: string, userPrompt: string): Promise<string> => {
    const result = await sendLlm(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      userId,
      {
        routingKey: "insights",
        maxTokens: 1000,
        temperature: 0.3,
      }
    );
    return result || "{}";
  };
}

export interface CaptureSyncActionResult {
  success: boolean;
  sync?: GmailSyncSummary;
  error?: string;
}

export interface SyncAndScanActionResult {
  success: boolean;
  sync?: GmailSyncSummary | null;
  scan?: DailyScanResult;
  error?: string;
}

/**
 * Sync then scan — canonical capture pipeline.
 * 1. Pull new Gmail into capture_events (when Composio is configured)
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

    let sync: GmailSyncSummary | null = null;
    const scanWarnings: string[] = [];

    if (isComposioConfigured()) {
      const gmailSync = await backfillGmailCaptures(workspace.id, {
        lookbackDays,
        maxMessagesPerQuery: 200,
        includeSent: true,
        includeInbox: true,
        isBootstrap: false,
      });

      if (gmailSync.error) {
        scanWarnings.push(`Gmail sync: ${gmailSync.error}`);
      } else {
        sync = gmailSync.debug
          ? {
              capturesCreated: gmailSync.capturesCreated,
              messagesFetched: gmailSync.debug.messagesFetched,
              skippedNoise: gmailSync.debug.skippedNoise,
              duplicates: gmailSync.debug.duplicates,
            }
          : {
              capturesCreated: gmailSync.capturesCreated,
              messagesFetched: 0,
              skippedNoise: 0,
              duplicates: 0,
            };
      }
    } else {
      scanWarnings.push(
        "Gmail sync skipped: COMPOSIO_API_KEY is not set. Scanned existing captures only."
      );
    }

    const scan = await runDailyScan(workspace.id, userId, {
      llmCall: createLlmCall(userId),
      lookbackHours,
      scanAll: true,
      rescan: options?.rescan ?? false,
    });

    if (scanWarnings.length > 0) {
      scan.errors.unshift(...scanWarnings);
    }

    revalidatePath("/plays");

    return { success: true, sync, scan };
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
 * Sync Captures — fetch new Gmail messages into capture_events only.
 * Prefer syncAndScanCaptures for the full pipeline.
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
          "Gmail sync requires Composio. Restart with pnpm dev:staging:op (COMPOSIO_API_KEY in .env.staging.1password).",
      };
    }

    const lookbackDays = options?.lookbackDays ?? 7;
    const gmailSync = await backfillGmailCaptures(workspace.id, {
      lookbackDays,
      maxMessagesPerQuery: 200,
      includeSent: true,
      includeInbox: true,
      isBootstrap: false,
    });

    if (gmailSync.error) {
      return { success: false, error: gmailSync.error };
    }

    revalidatePath("/plays");

    return {
      success: true,
      sync: gmailSync.debug
        ? {
            capturesCreated: gmailSync.capturesCreated,
            messagesFetched: gmailSync.debug.messagesFetched,
            skippedNoise: gmailSync.debug.skippedNoise,
            duplicates: gmailSync.debug.duplicates,
          }
        : {
            capturesCreated: gmailSync.capturesCreated,
            messagesFetched: 0,
            skippedNoise: 0,
            duplicates: 0,
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
      llmCall: createLlmCall(userId),
      lookbackHours,
      maxEmails: options?.maxEmails ?? 100,
      scanAll,
      dryRun: options?.dryRun ?? false,
      rescan: options?.rescan ?? false,
    });

    if (!options?.dryRun) {
      revalidatePath("/plays");
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

/**
 * Run scan for a specific workspace (admin/cron use)
 */
export async function runWorkspaceScan(
  workspaceId: string,
  userId: string,
  options?: {
    lookbackHours?: number;
    maxEmails?: number;
    scanAll?: boolean;
  }
): Promise<DailyScanResult> {
  return runDailyScan(workspaceId, userId, {
    llmCall: createLlmCall(userId),
    lookbackHours: options?.lookbackHours ?? 24,
    maxEmails: options?.maxEmails ?? 100,
    scanAll: options?.scanAll ?? false,
  });
}
