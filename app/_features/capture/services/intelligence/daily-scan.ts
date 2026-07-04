import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { CaptureSourceType, ExtractedData } from "../../types";
import { extractEmailToAnalyze } from "../extract-capture-email";
import { resolvePerson } from "../system-plays/person-resolver";
import { resolveOrg, linkPersonToOrg } from "../system-plays/org-resolver";
import type { EmailAnalysis, EmailToAnalyze } from "./email-analyzer";
import {
  filterActionableMemoryProposals,
  parseMemoryProposals,
  type MemoryProposal,
} from "../../types/memory-proposals";
import {
  classifyEmailSender,
  filterMemoryProposalsForSender,
} from "./email-sender-context";
import {
  loadKnownWorkspaceEntities,
  resolveMemoryProposals,
} from "./entity-resolver";
import {
  FINDING_TYPE_LABELS,
  type FindingType,
} from "../../types/intelligence-findings";
import {
  getPaymentPayerHint,
  isPaymentRailEmail,
  resolvePaymentPayerPerson,
} from "./finding-target";
import { classifyCapture } from "./capture-classifier";
import {
  createScopedMemoryLoader,
  buildMemoryContextBlock,
} from "./scoped-memory-context";
import { persistCaptureIntelligenceOutcome } from "./capture-intelligence-persistence";
import {
  readIntelligenceMeta,
  shouldReanalyzeCapture,
} from "./capture-intelligence-outcome";
import { repairVendorFindings } from "./repair-vendor-findings";
import { loadSenderProfileRegistry } from "../../queries/sender-profiles";
import { learnVendorFromClassification } from "./sender-profile-learn";
import type { SenderProfileRegistry } from "../../types/sender-profiles";
import { routeMeFactProposals } from "@/app/_features/me/services/route-fact-proposals";
import {
  createRiskPlayRun,
  createRoutingPlayRun,
} from "@/app/_features/plays/services/create-keeper-play-run";

/**
 * Daily Intelligence Scan
 *
 * Runs once daily per workspace:
 * 1. Fetch recent emails from capture_events
 * 2. For each email: resolve Person/Org, classify with shared noise gate + LLM
 * 3. Create intelligence_findings for actionable signals
 * 4. Route to needs_you or auto_handled based on confidence
 */

export interface GmailSyncSummary {
  capturesCreated: number;
  messagesFetched: number;
  skippedNoise: number;
  duplicates: number;
}

export interface DailyScanResult {
  workspaceId: string;
  emailsProcessed: number;
  findingsCreated: number;
  peopleResolved: number;
  /** Vendor/subscription findings cleaned up without re-running LLM. */
  findingsDismissedAsVendor?: number;
  findingsMemoryRepaired?: number;
  errors: string[];
  gmailSync?: GmailSyncSummary;
}

export interface DailyScanOptions {
  lookbackHours?: number;
  maxEmails?: number;
  /** When true, paginate through every capture in the lookback window (ignores maxEmails cap). */
  scanAll?: boolean;
  dryRun?: boolean;
  /** Re-analyze captures that already have intelligence metadata (dev/manual scan). */
  rescan?: boolean;
  llmCall: (systemPrompt: string, userPrompt: string) => Promise<string>;
}

const DEFAULT_LOOKBACK_HOURS = 24;
const DEFAULT_MAX_EMAILS = 100;
const SCAN_ALL_BATCH_SIZE = 100;
const HIGH_CONFIDENCE_THRESHOLD = 85;
/** Minimum confidence to create any finding from scan */
export const MIN_FINDING_CONFIDENCE = 70;
/** Minimum confidence for needs_routing when sender is unknown */
export const NEEDS_ROUTING_MIN_CONFIDENCE = 75;
/** Lower floor when actionable memory proposals exist */
export const MIN_FINDING_CONFIDENCE_WITH_MEMORY = 65;

const NEEDS_ROUTING_FINDING_TYPES = new Set<FindingType>([
  "revenue_buying",
  "revenue_closing",
  "revenue_upsell",
  "revenue_risk",
  "pending_question",
  "pending_deliverable",
]);

interface CaptureEventRow {
  id: string;
  source_type: CaptureSourceType;
  raw_payload: Record<string, unknown>;
  extracted_data: ExtractedData;
}

type ScoredFinding = EmailAnalysis["findings"][number] & { confidence: number };

function isSentCapture(row: CaptureEventRow): boolean {
  if (row.extracted_data?.type === "message") {
    return (row.extracted_data.labels ?? []).includes("SENT");
  }
  const labelIds = (row.raw_payload?.labelIds as string[] | undefined) ?? [];
  return labelIds.includes("SENT");
}

/** Inbound mail carries buying intent / reply-needed signals; scan it first. */
function sortCapturesInboundFirst(rows: CaptureEventRow[]): CaptureEventRow[] {
  return [...rows].sort((a, b) => {
    const aSent = isSentCapture(a);
    const bSent = isSentCapture(b);
    if (aSent === bSent) return 0;
    return aSent ? 1 : -1;
  });
}

function collectFindingIdsByCaptureId(
  findings: Array<{ id: string; evidence: unknown }> | null
): Map<string, string> {
  const map = new Map<string, string>();
  for (const finding of findings ?? []) {
    const evidence = finding.evidence as { source_id?: string } | null;
    if (evidence?.source_id) {
      map.set(evidence.source_id, finding.id);
    }
  }
  return map;
}

async function fetchCapturesInLookback(
  supabase: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  cutoff: string,
  options: { scanAll: boolean; maxEmails: number }
): Promise<{ rows: CaptureEventRow[]; error?: string }> {
  const baseQuery = () =>
    supabase
      .from("capture_events")
      .select("id, source_type, raw_payload, extracted_data")
      .eq("workspace_id", workspaceId)
      .eq("source_type", "gmail")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false });

  if (!options.scanAll) {
    const { data, error } = await baseQuery().limit(options.maxEmails);
    if (error) {
      return { rows: [], error: error.message };
    }
    return { rows: (data ?? []) as CaptureEventRow[] };
  }

  const rows: CaptureEventRow[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await baseQuery().range(
      offset,
      offset + SCAN_ALL_BATCH_SIZE - 1
    );
    if (error) {
      return { rows: [], error: error.message };
    }
    if (!data?.length) break;
    rows.push(...(data as CaptureEventRow[]));
    if (data.length < SCAN_ALL_BATCH_SIZE) break;
    offset += SCAN_ALL_BATCH_SIZE;
  }
  return { rows };
}

function summarizeSignals(analysis: EmailAnalysis): string {
  const labels = analysis.findings.map((f) => FINDING_TYPE_LABELS[f.type as FindingType]);
  return [...new Set(labels)].join(", ");
}

function boostFindingConfidence(
  finding: EmailAnalysis["findings"][number],
  context: { knownPerson: boolean; bidirectionalThread: boolean }
): ScoredFinding {
  let confidence = finding.confidence;
  if (context.knownPerson) confidence += 10;
  if (context.bidirectionalThread) confidence += 5;
  return {
    ...finding,
    confidence: Math.min(100, confidence),
  };
}

function filterActionableFindings(
  findings: EmailAnalysis["findings"],
  context: { knownPerson: boolean; bidirectionalThread: boolean },
  memoryProposals: MemoryProposal[] = []
): ScoredFinding[] {
  const minConfidence =
    memoryProposals.length > 0
      ? MIN_FINDING_CONFIDENCE_WITH_MEMORY
      : MIN_FINDING_CONFIDENCE;

  const scored = findings
    .map((finding) => boostFindingConfidence(finding, context))
    .filter((finding) => finding.confidence >= minConfidence);

  if (scored.length > 0 || memoryProposals.length === 0) {
    return scored;
  }

  return [
    {
      type: "pending_deliverable",
      title: "Suggested Memory updates",
      content: "Salt found structural signals worth saving to Memory.",
      confidence: Math.max(
        ...memoryProposals.map((p) => p.confidence),
        MIN_FINDING_CONFIDENCE_WITH_MEMORY
      ),
    },
  ];
}

function buildEvidenceMetadata(
  email: EmailToAnalyze,
  analysis: EmailAnalysis,
  memoryProposals: MemoryProposal[],
  senderRegistry?: SenderProfileRegistry
): Record<string, unknown> {
  const sender = classifyEmailSender(
    {
      from_email: email.from_email,
      from_name: email.from_name,
      subject: email.subject,
      body_text: email.body_text,
      snippet: email.snippet,
    },
    { registry: senderRegistry }
  );
  return {
    from_email: email.from_email,
    from_name: email.from_name,
    thread_id: email.thread_id,
    sender_kind: sender.kind,
    vendor_name: sender.vendorName,
    memory_proposals: memoryProposals,
    underlying_findings: analysis.findings.map((f) => ({
      type: f.type,
      title: f.title,
      confidence: f.confidence,
    })),
  };
}

function hasStoredMemoryProposals(evidence: unknown): boolean {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    return false;
  }
  const metadata = (evidence as { metadata?: unknown }).metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return false;
  }
  const raw = (metadata as { memory_proposals?: unknown }).memory_proposals;
  return filterActionableMemoryProposals(parseMemoryProposals(raw)).length > 0;
}

async function patchExistingFindingMemoryIfMissing(args: {
  findingId: string;
  email: EmailToAnalyze;
  analysis: EmailAnalysis;
  memoryProposals: MemoryProposal[];
  dryRun: boolean;
  supabase: ReturnType<typeof createAdminClient>;
  senderRegistry?: SenderProfileRegistry;
}): Promise<boolean> {
  const {
    findingId,
    email,
    analysis,
    memoryProposals,
    dryRun,
    supabase,
    senderRegistry,
  } = args;
  if (memoryProposals.length === 0) return false;

  const { data: row, error } = await supabase
    .from("intelligence_findings")
    .select("evidence")
    .eq("id", findingId)
    .single();

  if (error || !row) return false;
  if (hasStoredMemoryProposals(row.evidence)) return false;

  const evidence =
    row.evidence && typeof row.evidence === "object" && !Array.isArray(row.evidence)
      ? (row.evidence as Record<string, unknown>)
      : {};

  const metadata =
    evidence.metadata &&
    typeof evidence.metadata === "object" &&
    !Array.isArray(evidence.metadata)
      ? (evidence.metadata as Record<string, unknown>)
      : {};

  const updatedEvidence = {
    ...evidence,
    metadata: {
      ...metadata,
      ...buildEvidenceMetadata(email, analysis, memoryProposals, senderRegistry),
    },
  };

  if (dryRun) return true;

  const { error: updateError } = await supabase
    .from("intelligence_findings")
    .update({ evidence: updatedEvidence })
    .eq("id", findingId);

  if (updateError) {
    console.error(
      `[daily-scan] Failed to patch memory proposals on finding ${findingId}:`,
      updateError.message
    );
    return false;
  }

  return true;
}

function qualifiesForNeedsRouting(
  findings: ScoredFinding[],
  memoryProposals: MemoryProposal[] = []
): boolean {
  if (memoryProposals.length > 0) {
    return true;
  }
  if (findings.length === 0) return false;
  const maxConfidence = Math.max(...findings.map((f) => f.confidence));
  if (maxConfidence < NEEDS_ROUTING_MIN_CONFIDENCE) return false;
  return findings.some((f) => NEEDS_ROUTING_FINDING_TYPES.has(f.type as FindingType));
}

export async function runDailyScan(
  workspaceId: string,
  userId: string,
  options: DailyScanOptions
): Promise<DailyScanResult> {
  const {
    lookbackHours = DEFAULT_LOOKBACK_HOURS,
    maxEmails = DEFAULT_MAX_EMAILS,
    scanAll = false,
    dryRun = false,
    rescan = false,
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

  const cutoff = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();

  const { rows: emails, error: fetchError } = await fetchCapturesInLookback(
    supabase,
    workspaceId,
    cutoff,
    { scanAll, maxEmails }
  );

  if (fetchError) {
    const hint =
      fetchError.includes("capture_events")
        ? " Capture tables are missing on this Supabase project — use pnpm dev:staging:op for Plays intelligence."
        : "";
    result.errors.push(`Failed to fetch emails: ${fetchError}.${hint}`);
    return result;
  }

  if (emails.length === 0) {
    result.errors.push(
      `No Gmail captures in the last ${lookbackHours}h for this workspace. Use Sync Captures after connecting Gmail at /connections.`
    );
    return result;
  }

  const { data: existingFindings, error: findingsError } = await supabase
    .from("intelligence_findings")
    .select("id, evidence")
    .eq("workspace_id", workspaceId);

  if (findingsError) {
    result.errors.push(`Failed to load existing findings: ${findingsError.message}`);
  }

  const findingIdsByCaptureId = collectFindingIdsByCaptureId(existingFindings);

  const orderedEmails = sortCapturesInboundFirst(emails);
  const knownEntities = await loadKnownWorkspaceEntities(supabase, workspaceId);
  const senderRegistry = await loadSenderProfileRegistry(supabase, workspaceId);
  const scopedMemory = createScopedMemoryLoader(supabase, workspaceId, userId);

  for (const rawEmail of orderedEmails) {
    const existingMeta = readIntelligenceMeta(rawEmail.extracted_data);
    const linkedFindingId = findingIdsByCaptureId.get(rawEmail.id);

    if (!shouldReanalyzeCapture(existingMeta, { rescan })) {
      if (linkedFindingId) {
        result.emailsProcessed++;
        await persistCaptureIntelligenceOutcome(
          supabase,
          rawEmail.id,
          "finding_created",
          { findingId: linkedFindingId, dryRun }
        );
      }
      continue;
    }

    try {
      result.emailsProcessed++;

      const email = extractEmailToAnalyze(
        rawEmail.id,
        rawEmail.raw_payload,
        rawEmail.extracted_data,
        {
          has_prior_thread:
            /^re:/i.test(
              (rawEmail.extracted_data?.type === "message"
                ? rawEmail.extracted_data.subject
                : "") ?? ""
            ) ||
            Boolean(
              rawEmail.extracted_data?.type === "message" &&
                rawEmail.extracted_data.thread_id
            ),
        }
      );

      if (!email) {
        result.errors.push(`Could not extract email metadata for capture ${rawEmail.id}`);
        await persistCaptureIntelligenceOutcome(
          supabase,
          rawEmail.id,
          "scan_error",
          { dryRun }
        );
        continue;
      }

      const fromPaymentRail = isPaymentRailEmail(email.from_email);
      const paymentPayerHint = getPaymentPayerHint(email);

      let personId: string | undefined;
      let orgId: string | undefined;
      let knownPerson = false;

      if (fromPaymentRail) {
        personId = await resolvePaymentPayerPerson(
          workspaceId,
          email,
          paymentPayerHint
        );
        knownPerson = Boolean(personId);
      } else {
        const personResult = await resolvePerson(workspaceId, {
          email: email.from_email,
          name: email.from_name ?? undefined,
          signals: {
            is_bidirectional_thread: email.has_prior_thread,
            you_initiated: email.is_sent_by_user,
          },
        });

        personId = personResult.person_id;
        knownPerson = Boolean(personId && !personResult.is_new);

        if (personResult.is_new && personId) {
          result.peopleResolved++;
        }

        const orgResult = await resolveOrg(workspaceId, email.from_email);
        orgId = orgResult.org_id;

        if (personId && orgId) {
          await linkPersonToOrg(workspaceId, personId, orgId);
        }
      }

      const memoryItems = await scopedMemory.forEntity({ personId, orgId });

      const classification = await classifyCapture(rawEmail, {
        llmCall,
        knownPerson,
        bidirectionalThread: email.has_prior_thread && !email.is_sent_by_user,
        senderRegistry,
        memoryContext: buildMemoryContextBlock(memoryItems),
      });

      if (!classification || classification.isNoise || !classification.analysis) {
        await persistCaptureIntelligenceOutcome(
          supabase,
          rawEmail.id,
          "no_signal",
          { dryRun }
        );
        continue;
      }

      const analysis = classification.analysis;
      const rawMemoryProposals = filterActionableMemoryProposals(
        analysis.memory_proposals ?? []
      );

      // Route `me`-surface facts straight into the operator memory review queue.
      // Only from messages the user authored; nothing is trusted until confirmed.
      if (!dryRun && email.is_sent_by_user) {
        const meProposals = rawMemoryProposals.filter((p) => p.surface === "me");
        if (meProposals.length > 0) {
          try {
            await routeMeFactProposals({
              workspaceId,
              userId,
              proposals: meProposals,
              captureId: rawEmail.id,
              admin: supabase,
            });
          } catch (meError) {
            console.error("[daily-scan] Failed to route me facts:", meError);
          }
        }
      }
      const senderContext = classifyEmailSender(
        {
          from_email: email.from_email,
          from_name: email.from_name,
          subject: email.subject,
          body_text: email.body_text,
          snippet: email.snippet,
        },
        { registry: senderRegistry }
      );
      const memoryProposals = filterMemoryProposalsForSender(
        resolveMemoryProposals(rawMemoryProposals, knownEntities, {
          fromEmail: email.from_email,
          fromName: email.from_name,
        }),
        senderContext
      );

      await learnVendorFromClassification({
        supabase,
        workspaceId,
        fromEmail: email.from_email,
        sender: senderContext,
        dryRun,
      });
      const analysisWithMemory: EmailAnalysis = {
        ...analysis,
        memory_proposals: memoryProposals,
      };

      const actionableFindings = filterActionableFindings(
        analysis.findings,
        {
          knownPerson,
          bidirectionalThread: email.has_prior_thread && !email.is_sent_by_user,
        },
        memoryProposals
      );

      if (actionableFindings.length === 0 && memoryProposals.length === 0) {
        await persistCaptureIntelligenceOutcome(
          supabase,
          rawEmail.id,
          "no_signal",
          { dryRun }
        );
        continue;
      }

      const existingFindingId = findingIdsByCaptureId.get(rawEmail.id);
      if (existingFindingId) {
        const patched = await patchExistingFindingMemoryIfMissing({
          findingId: existingFindingId,
          email,
          analysis: analysisWithMemory,
          memoryProposals,
          dryRun,
          supabase,
          senderRegistry,
        });
        if (patched) {
          result.findingsCreated++;
        }
        await persistCaptureIntelligenceOutcome(
          supabase,
          rawEmail.id,
          "finding_created",
          { findingId: existingFindingId, dryRun }
        );
        continue;
      }

      const analysisWithBoosted = {
        ...analysisWithMemory,
        findings: actionableFindings,
      };

      if (!personId && !orgId) {
        if (!qualifiesForNeedsRouting(actionableFindings, memoryProposals)) {
          await persistCaptureIntelligenceOutcome(
            supabase,
            rawEmail.id,
            "no_signal",
            { dryRun }
          );
          continue;
        }

        const findingId = await createNeedsRoutingFinding({
          workspaceId,
          captureId: rawEmail.id,
          email,
          analysis: analysisWithBoosted,
          memoryProposals,
          paymentPayerHint,
          dryRun,
          supabase,
          result,
          senderRegistry,
        });
        await persistCaptureIntelligenceOutcome(
          supabase,
          rawEmail.id,
          findingId ? "finding_created" : "no_signal",
          { findingId: findingId ?? undefined, dryRun }
        );
        continue;
      }

      const findingId = await createFindingsFromAnalysis({
        workspaceId,
        captureId: rawEmail.id,
        email,
        personId,
        orgId,
        analysis: analysisWithBoosted,
        memoryProposals,
        dryRun,
        supabase,
        result,
        forceNeedsYou: fromPaymentRail && !personId,
        senderRegistry,
      });
      await persistCaptureIntelligenceOutcome(
        supabase,
        rawEmail.id,
        findingId ? "finding_created" : "no_signal",
        { findingId: findingId ?? undefined, dryRun }
      );

      if (analysis.relationship_type && personId && !dryRun) {
        await supabase
          .from("people")
          .update({ relationship_type: analysis.relationship_type })
          .eq("id", personId)
          .is("relationship_type", null);
      }
    } catch (error) {
      result.errors.push(
        `Error processing email: ${error instanceof Error ? error.message : String(error)}`
      );
      await persistCaptureIntelligenceOutcome(
        supabase,
        rawEmail.id,
        "scan_error",
        { dryRun }
      );
    }
  }

  const repair = await repairVendorFindings(workspaceId, supabase, {
    dryRun,
    senderRegistry,
  });
  result.findingsDismissedAsVendor = repair.findingsDismissed;
  result.findingsMemoryRepaired = repair.findingsUpdated;

  return result;
}

async function createNeedsRoutingFinding(args: {
  workspaceId: string;
  captureId: string;
  email: EmailToAnalyze;
  analysis: EmailAnalysis;
  memoryProposals: MemoryProposal[];
  paymentPayerHint: ReturnType<typeof getPaymentPayerHint>;
  dryRun: boolean;
  supabase: ReturnType<typeof createAdminClient>;
  result: DailyScanResult;
  senderRegistry?: SenderProfileRegistry;
}): Promise<string | null> {
  const {
    workspaceId,
    captureId,
    email,
    analysis,
    memoryProposals,
    paymentPayerHint,
    dryRun,
    result,
  } = args;

  const findingConfidences = analysis.findings.map((f) => f.confidence);
  const proposalConfidences = memoryProposals.map((p) => p.confidence);
  const confidence = Math.max(
    ...(findingConfidences.length ? findingConfidences : [0]),
    ...(proposalConfidences.length ? proposalConfidences : [NEEDS_ROUTING_MIN_CONFIDENCE])
  );
  const senderLabel = email.from_name?.trim() || email.from_email;
  const signalSummary = summarizeSignals(analysis);

  const title = paymentPayerHint
    ? `Route payment from ${paymentPayerHint.name}`
    : memoryProposals.length > 0 && analysis.findings.length === 0
      ? `Memory suggestions: ${email.subject || senderLabel}`
      : `Route to a profile: ${email.subject || senderLabel}`;

  const preview = paymentPayerHint
    ? `Payment detected for ${paymentPayerHint.name}, but they aren't linked in Memory yet. Choose or create the right person.`
    : memoryProposals.length > 0 && analysis.findings.length === 0
      ? `Salt suggested ${memoryProposals.length} Memory update(s) from this email. Choose or create the right profile first.`
      : `Salt noticed ${signalSummary.toLowerCase()} from ${senderLabel}, but isn't sure which person or org this belongs to yet.`;

  if (dryRun) {
    result.findingsCreated++;
    return "dry-run-finding";
  }

  // Route to play_runs instead of intelligence_findings (Phase 3)
  const playRunResult = await createRoutingPlayRun({
    workspaceId,
    title,
    preview,
    confidence,
    sourceUrl: null,
    triggerLabel: "From email",
    captureId,
    evidenceQuotes: analysis.findings
      .map((f) => f.evidence_quote)
      .filter((q): q is string => Boolean(q)),
    fromEmail: email.from_email,
    fromName: email.from_name,
    paymentPayerHint: paymentPayerHint?.name ?? null,
  });

  if (!playRunResult.ok) {
    result.errors.push(`Failed to create routing play run: ${playRunResult.error}`);
    return null;
  }

  result.findingsCreated++;
  return playRunResult.playRunId;
}

async function createFindingsFromAnalysis(args: {
  workspaceId: string;
  captureId: string;
  email: EmailToAnalyze;
  personId?: string;
  orgId?: string;
  analysis: EmailAnalysis;
  memoryProposals: MemoryProposal[];
  dryRun: boolean;
  supabase: ReturnType<typeof createAdminClient>;
  result: DailyScanResult;
  forceNeedsYou?: boolean;
  senderRegistry?: SenderProfileRegistry;
}): Promise<string | null> {
  const {
    workspaceId,
    captureId,
    email,
    personId,
    orgId,
    analysis,
    memoryProposals,
    dryRun,
    supabase,
    result,
    forceNeedsYou = false,
    senderRegistry,
  } = args;

  if (!personId && !orgId) {
    return null;
  }

  let firstFindingId: string | null = null;
  const minConfidence =
    memoryProposals.length > 0
      ? MIN_FINDING_CONFIDENCE_WITH_MEMORY
      : MIN_FINDING_CONFIDENCE;

  const targetLabel = email.from_name?.trim() || email.from_email;

  for (const finding of analysis.findings) {
    if (finding.confidence < minConfidence) continue;

    // Route revenue_risk to play_runs (Phase 3)
    if (finding.type === "revenue_risk") {
      if (dryRun) {
        result.findingsCreated++;
        firstFindingId ??= "dry-run-finding";
        continue;
      }

      const riskResult = await createRiskPlayRun({
        workspaceId,
        personId: personId ?? null,
        orgId: personId ? null : (orgId ?? null),
        targetLabel,
        title: finding.title,
        signal: finding.content ?? finding.title,
        recommendation: null,
        confidence: finding.confidence,
        sourceUrl: null,
        triggerLabel: "From email",
        captureId,
        evidenceQuotes: finding.evidence_quote ? [finding.evidence_quote] : [],
      });

      if (!riskResult.ok) {
        result.errors.push(`Failed to create risk play run: ${riskResult.error}`);
      } else {
        result.findingsCreated++;
        firstFindingId ??= riskResult.playRunId;
      }
      continue;
    }

    // Other finding types still go to intelligence_findings (interim)
    const state =
      forceNeedsYou ||
      finding.confidence < HIGH_CONFIDENCE_THRESHOLD ||
      memoryProposals.length > 0
        ? "needs_you"
        : "auto_handled";

    const metadata = buildEvidenceMetadata(
      email,
      analysis,
      memoryProposals,
      senderRegistry
    );

    if (!dryRun) {
      const { data: inserted, error: insertError } = await supabase
        .from("intelligence_findings")
        .insert({
        workspace_id: workspaceId,
        person_id: personId ?? null,
        org_id: personId ? null : (orgId ?? null),
        finding_type: finding.type as FindingType,
        title: finding.title,
        content: finding.content ?? null,
        evidence: {
          source_type: "email",
          source_id: captureId,
          quotes: finding.evidence_quote ? [finding.evidence_quote] : undefined,
          metadata,
        },
        confidence: finding.confidence,
        state,
      })
        .select("id")
        .single();

      if (insertError) {
        result.errors.push(`Failed to create finding: ${insertError.message}`);
      } else {
        result.findingsCreated++;
        firstFindingId ??= inserted?.id ?? null;
      }
    } else {
      result.findingsCreated++;
      firstFindingId ??= "dry-run-finding";
    }
  }

  return firstFindingId;
}
