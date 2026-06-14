import { createAdminClient } from "@/app/_lib/supabase/admin";
import { resolvePerson } from "../system-plays/person-resolver";
import { resolveOrg, linkPersonToOrg } from "../system-plays/org-resolver";
import {
  analyzeEmail,
  type EmailToAnalyze,
  type EmailAnalysis,
} from "./email-analyzer";
import type { FindingType } from "../../types/intelligence-findings";

/**
 * Daily Intelligence Scan
 *
 * Runs once daily per workspace:
 * 1. Fetch recent emails from capture_events
 * 2. For each email: resolve Person/Org, analyze with LLM
 * 3. Create intelligence_findings for actionable signals
 * 4. Route to needs_you or auto_handled based on confidence
 */

export interface DailyScanResult {
  workspaceId: string;
  emailsProcessed: number;
  findingsCreated: number;
  peopleResolved: number;
  errors: string[];
}

export interface DailyScanOptions {
  lookbackHours?: number;
  maxEmails?: number;
  dryRun?: boolean;
  llmCall: (systemPrompt: string, userPrompt: string) => Promise<string>;
}

const DEFAULT_LOOKBACK_HOURS = 24;
const DEFAULT_MAX_EMAILS = 100;
const HIGH_CONFIDENCE_THRESHOLD = 85;

export async function runDailyScan(
  workspaceId: string,
  userId: string,
  options: DailyScanOptions
): Promise<DailyScanResult> {
  const {
    lookbackHours = DEFAULT_LOOKBACK_HOURS,
    maxEmails = DEFAULT_MAX_EMAILS,
    dryRun = false,
    llmCall,
  } = options;

  const result: DailyScanResult = {
    workspaceId,
    emailsProcessed: 0,
    findingsCreated: 0,
    peopleResolved: 0,
    errors: [],
  };

  const supabase = createAdminClient();

  // 1. Fetch recent emails from capture_events
  const cutoff = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();

  const { data: emails, error: fetchError } = await supabase
    .from("capture_events")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("source", "gmail")
    .gte("created_at", cutoff)
    .is("processed_at", null)
    .order("created_at", { ascending: false })
    .limit(maxEmails);

  if (fetchError) {
    result.errors.push(`Failed to fetch emails: ${fetchError.message}`);
    return result;
  }

  if (!emails || emails.length === 0) {
    return result;
  }

  // 2. Process each email
  for (const rawEmail of emails) {
    try {
      result.emailsProcessed++;

      // Extract email metadata from payload
      const payload = rawEmail.payload as Record<string, unknown>;
      const email = extractEmailFromPayload(rawEmail.id, payload);

      if (!email) {
        continue;
      }

      // 2a. Resolve Person (create if meets criteria)
      const personResult = await resolvePerson(workspaceId, {
        email: email.from_email,
        name: email.from_name ?? undefined,
        signals: {
          is_bidirectional_thread: email.has_prior_thread,
          you_initiated: email.is_sent_by_user,
        },
      });

      if (personResult.is_new) {
        result.peopleResolved++;
      }

      // 2b. Resolve Org and link to Person
      if (personResult.person_id) {
        const orgResult = await resolveOrg(workspaceId, email.from_email);
        if (orgResult.org_id) {
          await linkPersonToOrg(workspaceId, personResult.person_id, orgResult.org_id);
        }
      }

      // 2c. Analyze email with LLM
      const analysis = await analyzeEmail(email, llmCall);

      if (!analysis || analysis.is_noise) {
        // Mark as processed but no findings
        if (!dryRun) {
          await supabase
            .from("capture_events")
            .update({ processed_at: new Date().toISOString() })
            .eq("id", rawEmail.id);
        }
        continue;
      }

      // 2d. Create findings
      for (const finding of analysis.findings) {
        if (finding.confidence < 50) continue; // Skip low-confidence

        const state = finding.confidence >= HIGH_CONFIDENCE_THRESHOLD
          ? "auto_handled"
          : "needs_you";

        if (!dryRun) {
          const { error: insertError } = await supabase
            .from("intelligence_findings")
            .insert({
              workspace_id: workspaceId,
              person_id: personResult.person_id,
              finding_type: finding.type as FindingType,
              title: finding.title,
              content: finding.content ?? null,
              evidence: finding.evidence_quote
                ? {
                    source_type: "email",
                    source_id: rawEmail.id,
                    quotes: [finding.evidence_quote],
                  }
                : null,
              confidence: finding.confidence,
              state,
            });

          if (insertError) {
            result.errors.push(`Failed to create finding: ${insertError.message}`);
          } else {
            result.findingsCreated++;
          }
        } else {
          result.findingsCreated++;
        }
      }

      // Update relationship type on Person if detected
      if (analysis.relationship_type && personResult.person_id && !dryRun) {
        await supabase
          .from("people")
          .update({ relationship_type: analysis.relationship_type })
          .eq("id", personResult.person_id)
          .is("relationship_type", null); // Only update if not already set
      }

      // Mark email as processed
      if (!dryRun) {
        await supabase
          .from("capture_events")
          .update({ processed_at: new Date().toISOString() })
          .eq("id", rawEmail.id);
      }
    } catch (error) {
      result.errors.push(
        `Error processing email: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return result;
}

function extractEmailFromPayload(
  id: string,
  payload: Record<string, unknown>
): EmailToAnalyze | null {
  try {
    // Handle Gmail API message format
    const headers = (payload.headers || []) as Array<{ name: string; value: string }>;
    const getHeader = (name: string) =>
      headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

    const fromHeader = getHeader("From");
    const fromMatch = fromHeader.match(/(?:(.+?)\s*<)?([^<>]+@[^<>]+)>?/);
    const fromName = fromMatch?.[1]?.trim() || null;
    const fromEmail = fromMatch?.[2]?.trim().toLowerCase() || fromHeader.toLowerCase();

    const toHeader = getHeader("To");
    const toEmails = toHeader
      .split(",")
      .map((t) => {
        const match = t.match(/([^<>]+@[^<>]+)/);
        return match?.[1]?.trim().toLowerCase();
      })
      .filter(Boolean) as string[];

    const subject = getHeader("Subject");
    const date = getHeader("Date");
    const threadId = (payload.threadId as string) || "";

    // Extract body
    let bodyText = "";
    const parts = (payload.payload as Record<string, unknown>)?.parts as Array<Record<string, unknown>> | undefined;
    if (parts) {
      for (const part of parts) {
        if (part.mimeType === "text/plain" && part.body) {
          const data = (part.body as Record<string, unknown>).data as string;
          if (data) {
            bodyText = Buffer.from(data, "base64").toString("utf-8");
            break;
          }
        }
      }
    }
    if (!bodyText) {
      bodyText = (payload.snippet as string) || "";
    }

    // Determine if this is a sent email
    const labelIds = (payload.labelIds as string[]) || [];
    const isSent = labelIds.includes("SENT");

    return {
      id,
      from_email: fromEmail,
      from_name: fromName,
      to_emails: toEmails,
      subject,
      snippet: (payload.snippet as string) || "",
      body_text: bodyText || null,
      sent_at: date || new Date().toISOString(),
      thread_id: threadId,
      is_sent_by_user: isSent,
      has_prior_thread: false, // Would need thread lookup to determine
    };
  } catch {
    return null;
  }
}
