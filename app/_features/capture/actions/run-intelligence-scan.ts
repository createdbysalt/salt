"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/app/_lib/tenancy";
import { getWorkspaceMemberOrNull } from "@/app/_lib/tenancy/guards";
import { sendLlm } from "@/app/_lib/ai/gpt";
import { runDailyScan, type DailyScanResult } from "../services/intelligence";

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

/**
 * Run Intelligence Scan — Server Action
 *
 * Triggers the daily intelligence scan for the current workspace.
 * Can be called manually from admin UI or via scheduled cron.
 */
export async function runIntelligenceScan(options?: {
  lookbackHours?: number;
  maxEmails?: number;
  dryRun?: boolean;
}): Promise<{ success: boolean; result?: DailyScanResult; error?: string }> {
  try {
    const { context } = await getTenantContext();
    const workspace = getWorkspaceMemberOrNull(context);

    if (!workspace) {
      return { success: false, error: sessionRecoveryMessage() };
    }

    const userId = context.userId!;

    // LLM call wrapper using OpenRouter
    const llmCall = async (systemPrompt: string, userPrompt: string): Promise<string> => {
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

    const result = await runDailyScan(workspace.id, userId, {
      llmCall,
      lookbackHours: options?.lookbackHours ?? 24,
      maxEmails: options?.maxEmails ?? 100,
      dryRun: options?.dryRun ?? false,
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
  }
): Promise<DailyScanResult> {
  const llmCall = async (systemPrompt: string, userPrompt: string): Promise<string> => {
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

  return runDailyScan(workspaceId, userId, {
    llmCall,
    lookbackHours: options?.lookbackHours ?? 24,
    maxEmails: options?.maxEmails ?? 100,
  });
}
