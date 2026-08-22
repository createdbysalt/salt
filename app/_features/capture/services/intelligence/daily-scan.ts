import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { Json } from "@/app/_lib/supabase/database.types";
import type { CaptureSourceType, ExtractedData } from "../../types";
import { extractEmailToAnalyze } from "../extract-capture-email";
import {
  hydrateGmailCaptureBody,
  hydrateGmailCaptureFields,
} from "../hydrate-capture";
import { resolvePerson } from "@/app/_features/memory/records/person-resolver";
import { resolveOrg, linkPersonToOrg } from "@/app/_features/memory/records/org-resolver";
import type { EmailAnalysis, EmailToAnalyze } from "./email-analyzer";
import { classifyEmailSender } from "./email-sender-context";
import { type FindingType } from "../../types/intelligence-findings";
import {
  getPaymentPayerHint,
  isPaymentRailEmail,
  resolvePaymentPayerPerson,
} from "./finding-target";
import { classifyCapture } from "./capture-classifier";
import { createScopedMemoryLoader, buildMemoryContextBlock } from "./scoped-memory-context";
import { getCustomizePromptBlock } from "@/app/_features/memory/customize/queries";
import { persistCaptureIntelligenceOutcome } from "./capture-intelligence-persistence";
import {
  readIntelligenceMeta,
  shouldReanalyzeCapture,
  type CaptureIntelligenceMeta,
} from "./capture-intelligence-outcome";
import { repairVendorFindings } from "./repair-vendor-findings";
import { EMAIL_SCAN_SOURCE_TYPES } from "../../adapters/categories/email";
import { loadSenderProfileRegistry } from "../../queries/sender-profiles";
import { learnVendorFromClassification } from "./sender-profile-learn";
import { captureVendorSubscription } from "./subscription-capture";
import { loadGatePolicy } from "../gates/load-gate-policy";
import type { ResolvedGatePolicy } from "../gates/gate-policy";
import type { SenderProfileRegistry } from "../../types/sender-profiles";
import { extractAndPersistNotes } from "./persist-extracted-notes";
import type { NoteExtractionInput } from "./note-extractor";
import { parseSignatureFromBody } from "@/app/_features/memory/evidence/classifier";
import { applyFieldExtractions } from "./apply-field-extractions";

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
  /** LLM field extractions auto-applied to Memory (confidence >= threshold). */
  fieldsApplied: number;
  /** LLM field extractions accumulated as pending evidence (Watching). */
  fieldsAccumulated: number;
  /** Vendor/subscription findings cleaned up without re-running LLM. */
  findingsDismissedAsVendor?: number;
  findingsMemoryRepaired?: number;
  /** Vendor receipts turned into payable billing_records (Subscriptions). */
  subscriptionsCaptured?: number;
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

const NEEDS_ROUTING_FINDING_TYPES = new Set<FindingType>([
  "revenue_buying",
  "revenue_closing",
  "revenue_upsell",
  "revenue_risk",
  "pending_question",
  "pending_deliverable",
]);

export interface CaptureEventRow {
  id: string;
  source_type: CaptureSourceType;
  source_external_id: string | null;
  raw_payload: Record<string, unknown>;
  extracted_data: ExtractedData;
}

type JsonObject = { [key: string]: Json | undefined };

/**
 * capture_events.source_type is TEXT (Sources plan 5.2), so scan source types
 * no longer need filtering to a frozen enum — any provider key is queryable.
 */
const EMAIL_SOURCE_TYPES: readonly CaptureSourceType[] = EMAIL_SCAN_SOURCE_TYPES;

/** DB row → scan domain row; one boundary cast on the Json payload value. */
function toCaptureEventRow(row: {
  id: string;
  source_type: CaptureSourceType;
  source_external_id: string | null;
  raw_payload: Json;
  extracted_data: Json;
}): CaptureEventRow {
  return {
    id: row.id,
    source_type: row.source_type,
    source_external_id: row.source_external_id,
    raw_payload:
      row.raw_payload && typeof row.raw_payload === "object" && !Array.isArray(row.raw_payload)
        ? row.raw_payload
        : {},
    extracted_data: row.extracted_data as unknown as ExtractedData,
  };
}

/** Cap provider fetches per scan run — hydration is a bounded assist. */
const MAX_HYDRATIONS_PER_RUN = 25;

type ScoredFinding = EmailAnalysis["findings"][number] & { confidence: number };

function isSentCapture(row: CaptureEventRow): boolean {
  if (row.extracted_data?.type === "message") {
    return (row.extracted_data.labels ?? []).includes("SENT");
  }
  // Category email adapters write a flat shape with isSentByUser (no `type`).
  const adapterExtracted = row.extracted_data as {
    isSentByUser?: unknown;
    labels?: unknown;
  } | null;
  if (adapterExtracted?.isSentByUser === true) return true;
  if (Array.isArray(adapterExtracted?.labels) && adapterExtracted.labels.includes("SENT")) {
    return true;
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
      .select("id, source_type, source_external_id, raw_payload, extracted_data")
      .eq("workspace_id", workspaceId)
      .in("source_type", EMAIL_SOURCE_TYPES)
      // Held rows (Memory-first pool) are thin and unenriched by design —
      // scanning them would spend LLM budget on mail the user can't see.
      // Gate-noise rows are excluded too (Phase 6): the gate's noise verdict
      // is final — fetching them would only burn rows the per-row policy
      // (shouldReanalyzeCapture) would skip anyway.
      .or("gate_action.is.null,gate_action.not.in.(drop,held,noise)");

  // Backlog first: rows that never reached a terminal outcome (no
  // intelligence meta, or scan_error) stay reachable at ANY age. The
  // created_at window bounds re-analysis of fresh mail — it must not strand
  // unscanned rows, or one bad run (or a Retry click on an old row) leaves
  // them outside every future scan. Backlog gets first claim on the budget,
  // oldest first; recent mail that doesn't fit today is still inside the
  // window tomorrow.
  const { data: backlogData, error: backlogError } = await baseQuery()
    .or(
      "extracted_data->>intelligence.is.null,extracted_data->intelligence->>outcome.eq.scan_error"
    )
    .order("created_at", { ascending: true })
    .limit(options.maxEmails);

  if (backlogError) {
    return { rows: [], error: backlogError.message };
  }

  const backlog = (backlogData ?? []).map(toCaptureEventRow);
  const backlogIds = new Set(backlog.map((row) => row.id));
  const remaining = options.maxEmails - backlog.length;
  if (remaining <= 0) {
    return { rows: backlog };
  }

  const recentQuery = () =>
    baseQuery()
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false });

  let recent: CaptureEventRow[];
  if (!options.scanAll) {
    const { data, error } = await recentQuery().limit(remaining);
    if (error) {
      return { rows: [], error: error.message };
    }
    recent = (data ?? []).map(toCaptureEventRow);
  } else {
    const collected = await collectCapturePages(async (from, to) => {
      const { data, error } = await recentQuery().range(from, to);
      return { data: data ? data.map(toCaptureEventRow) : null, error: error?.message };
    }, remaining);
    if (collected.error) return { rows: [], error: collected.error };
    recent = collected.rows;
  }

  return {
    rows: [...backlog, ...recent.filter((row) => !backlogIds.has(row.id))],
  };
}

/**
 * Page through captures up to a hard row ceiling.
 *
 * Exported for test: every row this returns costs one model call in the scan
 * loop, and this was once a `while (true)` that ignored `maxEmails` entirely —
 * so a single click classified every capture in the lookback window, priced by
 * the size of the user's inbox rather than by anything Salt chose. The ceiling
 * is the point of the function, and it needs a test that fails if the loop
 * ever becomes unbounded again.
 */
export async function collectCapturePages(
  fetchPage: (
    from: number,
    to: number
  ) => Promise<{ data: CaptureEventRow[] | null; error?: string }>,
  maxRows: number,
  batchSize: number = SCAN_ALL_BATCH_SIZE
): Promise<{ rows: CaptureEventRow[]; error?: string }> {
  const rows: CaptureEventRow[] = [];
  let offset = 0;

  while (offset < maxRows) {
    // Narrow the final page so the ceiling is exact rather than rounded up to
    // the next batch.
    const pageSize = Math.min(batchSize, maxRows - offset);
    const { data, error } = await fetchPage(offset, offset + pageSize - 1);

    if (error) return { rows: [], error };
    if (!data?.length) break;

    rows.push(...data);
    // A short page means the source is exhausted.
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return { rows };
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
  context: { knownPerson: boolean; bidirectionalThread: boolean }
): ScoredFinding[] {
  return findings
    .map((finding) => boostFindingConfidence(finding, context))
    .filter((finding) => finding.confidence >= MIN_FINDING_CONFIDENCE);
}

function buildEvidenceMetadata(
  email: EmailToAnalyze,
  analysis: EmailAnalysis,
  senderRegistry?: SenderProfileRegistry
): JsonObject {
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
    underlying_findings: analysis.findings.map((f) => ({
      type: f.type,
      title: f.title,
      confidence: f.confidence,
    })),
  };
}

function qualifiesForNeedsRouting(findings: ScoredFinding[]): boolean {
  if (findings.length === 0) return false;
  const maxConfidence = Math.max(...findings.map((f) => f.confidence));
  if (maxConfidence < NEEDS_ROUTING_MIN_CONFIDENCE) return false;
  return findings.some((f) => NEEDS_ROUTING_FINDING_TYPES.has(f.type as FindingType));
}

/**
 * Shared per-workspace scan pipeline state. `runDailyScan` builds this once
 * per run; the Gmail backfill (Sources plan 3.4) builds it once per backfill
 * to analyze admitted captures inline on their transient bodies.
 */
export interface ScanPipelineContext {
  supabase: ReturnType<typeof createAdminClient>;
  workspaceId: string;
  userId: string;
  dryRun: boolean;
  rescan: boolean;
  llmCall: DailyScanOptions["llmCall"];
  result: DailyScanResult;
  findingIdsByCaptureId: Map<string, string>;
  senderRegistry: SenderProfileRegistry;
  /** Workspace intake gate policy — governs vendor subscription capture. */
  gatePolicy: ResolvedGatePolicy;
  scopedMemory: ReturnType<typeof createScopedMemoryLoader>;
  /**
   * Track A (Phase M4): the workspace's active Memory customizations, loaded
   * once per run and passed to every classification. Null when the load
   * failed — scans proceed without the block rather than failing.
   */
  customizeContext: string | null;
  /**
   * Per-run provider-fetch budget for body hydration. Null disables
   * hydration — the inline backfill path already carries the transient body
   * and must not pay for a second fetch.
   */
  hydration: { used: number; max: number } | null;
}

export async function createScanPipelineContext(options: {
  workspaceId: string;
  userId: string;
  llmCall: DailyScanOptions["llmCall"];
  dryRun?: boolean;
  rescan?: boolean;
  enableHydration?: boolean;
  result?: DailyScanResult;
  findingIdsByCaptureId?: Map<string, string>;
  supabase?: ReturnType<typeof createAdminClient>;
}): Promise<ScanPipelineContext> {
  const supabase = options.supabase ?? createAdminClient();
  const [senderRegistry, scopedMemory, customizeContext, gatePolicy] =
    await Promise.all([
      loadSenderProfileRegistry(supabase, options.workspaceId),
      createScopedMemoryLoader(supabase, options.workspaceId, options.userId),
      // Track A (Phase M4): one load per run; a failure degrades to no
      // customization rather than failing the scan.
      getCustomizePromptBlock(options.workspaceId).catch(() => null),
      loadGatePolicy(supabase, options.workspaceId),
    ]);
  return {
    supabase,
    workspaceId: options.workspaceId,
    userId: options.userId,
    dryRun: options.dryRun ?? false,
    rescan: options.rescan ?? false,
    llmCall: options.llmCall,
    result: options.result ?? {
      workspaceId: options.workspaceId,
      emailsProcessed: 0,
      findingsCreated: 0,
      peopleResolved: 0,
      fieldsApplied: 0,
      fieldsAccumulated: 0,
      errors: [],
    },
    findingIdsByCaptureId: options.findingIdsByCaptureId ?? new Map(),
    senderRegistry,
    gatePolicy,
    scopedMemory,
    customizeContext,
    hydration: options.enableHydration ? { used: 0, max: MAX_HYDRATIONS_PER_RUN } : null,
  };
}

/**
 * Run one capture through the intelligence pipeline: extract, optionally
 * hydrate the body, resolve person/org, classify, then persist findings
 * and the ledger outcome.
 *
 * Shared by the daily scan and the Gmail backfill's inline analysis (3.4).
 * The backfill passes an in-memory row whose extracted_data carries the
 * transient full body — persistence here only ever merges outcome metadata
 * into the stored (thin) row, so the body never reaches the database.
 */
export async function processCaptureForScan(
  ctx: ScanPipelineContext,
  rawEmail: CaptureEventRow
): Promise<void> {
  const {
    supabase,
    workspaceId,
    dryRun,
    rescan,
    llmCall,
    result,
    findingIdsByCaptureId,
    senderRegistry,
    scopedMemory,
    customizeContext,
  } = ctx;

  const existingMeta = readIntelligenceMeta(rawEmail.extracted_data);
  const linkedFindingId = findingIdsByCaptureId.get(rawEmail.id);

  if (!shouldReanalyzeCapture(existingMeta, { rescan })) {
    if (linkedFindingId) {
      result.emailsProcessed++;
      await persistCaptureIntelligenceOutcome(supabase, rawEmail.id, "finding_created", {
        findingId: linkedFindingId,
        dryRun,
      });
    }
    return;
  }

  try {
    result.emailsProcessed++;

    // Legacy MessageExtractedData rows treat any thread_id as prior thread;
    // adapter-shape rows (Outlook et al.) always carry a conversation id, so
    // rely on their explicit is_reply flag and subject instead.
    const adapterShape = rawEmail.extracted_data as {
      subject?: unknown;
      is_reply?: unknown;
    } | null;
    const subjectForReply =
      rawEmail.extracted_data?.type === "message"
        ? (rawEmail.extracted_data.subject ?? "")
        : typeof adapterShape?.subject === "string"
          ? adapterShape.subject
          : "";

    const hasPriorThread =
      /^re:/i.test(subjectForReply) ||
      adapterShape?.is_reply === true ||
      Boolean(rawEmail.extracted_data?.type === "message" && rawEmail.extracted_data.thread_id);

    let email = extractEmailToAnalyze(
      rawEmail.id,
      rawEmail.raw_payload,
      rawEmail.extracted_data,
      { has_prior_thread: hasPriorThread }
    );

    // Some backfill rows rest without any sender field (the backfill couldn't
    // parse one at write time) — extraction can never succeed from the stored
    // envelope alone. Hydrate through the source pointer before giving up:
    // the provider's full message carries the From header. Bounded by the
    // same per-run hydration budget as body hydration.
    const hydration = ctx.hydration;
    if (!email && hydration && hydration.used < hydration.max) {
      hydration.used++;
      const fields = await hydrateGmailCaptureFields(workspaceId, rawEmail);
      if (fields) {
        email = {
          id: rawEmail.id,
          ...fields,
          has_prior_thread: hasPriorThread || /^re:/i.test(fields.subject),
        };
      }
    }

    if (!email) {
      result.errors.push(`Could not extract email metadata for capture ${rawEmail.id}`);
      await persistCaptureIntelligenceOutcome(supabase, rawEmail.id, "scan_error", { dryRun });
      return;
    }

    // Envelope captures store only a snippet — hydrate the full body
    // transiently through the source pointer (3.7), bounded per run.
    // Falls back to the snippet when hydration declines or fails.
    // Null budget (inline backfill path) disables hydration entirely.
    if (!email.body_text && hydration && hydration.used < hydration.max) {
      hydration.used++;
      const hydratedBody = await hydrateGmailCaptureBody(workspaceId, rawEmail);
      if (hydratedBody) {
        email.body_text = hydratedBody;
      }
    }

    const fromPaymentRail = isPaymentRailEmail(email.from_email);
    const paymentPayerHint = getPaymentPayerHint(email);

    let personId: string | undefined;
    let orgId: string | undefined;
    let knownPerson = false;

    if (fromPaymentRail) {
      personId = await resolvePaymentPayerPerson(workspaceId, email, paymentPayerHint);
      knownPerson = Boolean(personId);
    } else {
      // Signature heuristics: free enrichment (phone/company/title) parsed
      // from the email body tail — routed through confidence-gated tools.
      const signatureHints =
        !email.is_sent_by_user && email.body_text ? parseSignatureFromBody(email.body_text) : {};

      const personResult = await resolvePerson(workspaceId, {
        email: email.from_email,
        name: email.from_name ?? undefined,
        signals: {
          is_bidirectional_thread: email.has_prior_thread,
          you_initiated: email.is_sent_by_user,
        },
        sourceType: "email",
        sourceCaptureId: rawEmail.id,
        enrichment: {
          phone: signatureHints.phone,
          company: signatureHints.company,
          title: signatureHints.title,
          contactAt: email.sent_at || undefined,
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
      customizeContext,
    });

    if (!classification || classification.isNoise || !classification.analysis) {
      await persistCaptureIntelligenceOutcome(supabase, rawEmail.id, "no_signal", { dryRun });
      return;
    }

    const analysis = classification.analysis;

    // LLM field extractions → confidence-gated Memory writes. Sender
    // fields only (received mail), never payment rails or vendor senders.
    if (
      !dryRun &&
      !email.is_sent_by_user &&
      !fromPaymentRail &&
      (personId || orgId) &&
      analysis.field_extractions?.length
    ) {
      try {
        const extractionResult = await applyFieldExtractions({
          workspaceId,
          captureId: rawEmail.id,
          personId,
          orgId,
          extractions: analysis.field_extractions,
        });
        result.fieldsApplied += extractionResult.applied;
        result.fieldsAccumulated += extractionResult.accumulated;
      } catch (extractionError) {
        console.error("[daily-scan] Field extraction apply failed:", extractionError);
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

    await learnVendorFromClassification({
      supabase,
      workspaceId,
      fromEmail: email.from_email,
      sender: senderContext,
      dryRun,
    });

    // Vendor receipts are spend, not relationships: when the workspace
    // tracks subscriptions (default), turn the receipt into a payable
    // billing record instead of discarding the signal.
    if (
      senderContext.kind === "vendor_saas" &&
      senderContext.vendorName &&
      ctx.gatePolicy.email.trackSubscriptions === "tracked"
    ) {
      try {
        const outcome = await captureVendorSubscription({
          supabase,
          workspaceId,
          captureId: rawEmail.id,
          vendorName: senderContext.vendorName,
          email: {
            subject: email.subject,
            body_text: email.body_text,
            snippet: email.snippet,
            sent_at: email.sent_at ?? null,
          },
          dryRun,
        });
        if (outcome === "created") {
          result.subscriptionsCaptured = (result.subscriptionsCaptured ?? 0) + 1;
        }
      } catch (subError) {
        console.error("[daily-scan] subscription capture failed:", subError);
      }
    }
    const actionableFindings = filterActionableFindings(
      analysis.findings,
      {
        knownPerson,
        bidirectionalThread: email.has_prior_thread && !email.is_sent_by_user,
      }
    );

    if (actionableFindings.length === 0) {
      await persistCaptureIntelligenceOutcome(supabase, rawEmail.id, "no_signal", { dryRun });
      return;
    }

    const existingFindingId = findingIdsByCaptureId.get(rawEmail.id);
    if (existingFindingId) {
      await persistCaptureIntelligenceOutcome(supabase, rawEmail.id, "finding_created", {
        findingId: existingFindingId,
        dryRun,
      });
      return;
    }

    const analysisWithBoosted: EmailAnalysis = {
      ...analysis,
      findings: actionableFindings,
    };

    if (!personId && !orgId) {
      if (!qualifiesForNeedsRouting(actionableFindings)) {
        await persistCaptureIntelligenceOutcome(supabase, rawEmail.id, "no_signal", { dryRun });
        return;
      }

      const routing = await routeUnknownSenderSignal({
        workspaceId,
        captureId: rawEmail.id,
        email,
        analysis: analysisWithBoosted,
        paymentPayerHint,
        dryRun,
        supabase,
        result,
        senderRegistry,
      });
      await persistCaptureIntelligenceOutcome(supabase, rawEmail.id, routing.outcome, {
        findingId: routing.findingId ?? undefined,
        dryRun,
      });
      return;
    }

    const findingId = await createFindingsFromAnalysis({
      workspaceId,
      captureId: rawEmail.id,
      email,
      personId,
      orgId,
      analysis: analysisWithBoosted,
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

    // Extract notes from email content (entity learning)
    if (!dryRun && (personId || orgId)) {
      try {
        const anchorEntity = personId
          ? { type: "person" as const, id: personId, name: email.from_name ?? email.from_email }
          : {
              type: "organization" as const,
              id: orgId!,
              name: email.from_name ?? email.from_email,
            };

        const extractionInput: NoteExtractionInput = {
          sourceType: "email",
          sourceId: rawEmail.id,
          content: [email.subject, email.body_text ?? email.snippet].filter(Boolean).join("\n\n"),
          subject: email.subject,
          anchorEntity,
          relatedEntities: orgId && personId ? { orgId } : undefined,
        };

        const entityNames = new Map<string, string>();
        if (personId) entityNames.set(personId, email.from_name ?? email.from_email);
        if (orgId) entityNames.set(orgId, email.from_name ?? "Organization");

        await extractAndPersistNotes(extractionInput, entityNames, workspaceId);
      } catch (noteError) {
        // Don't fail the scan if note extraction fails
        result.errors.push(
          `Note extraction warning: ${noteError instanceof Error ? noteError.message : String(noteError)}`
        );
      }
    }

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
    await persistCaptureIntelligenceOutcome(supabase, rawEmail.id, "scan_error", { dryRun });
  }
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
    fieldsApplied: 0,
    fieldsAccumulated: 0,
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
    const hint = fetchError.includes("capture_events")
      ? " Capture tables are missing on this Supabase project — use pnpm dev:staging:op for Plays intelligence."
      : "";
    result.errors.push(`Failed to fetch emails: ${fetchError}.${hint}`);
    return result;
  }

  if (emails.length === 0) {
    result.errors.push(
      `No email captures in the last ${lookbackHours}h for this workspace. Use Sync Captures after connecting an email account at /sources.`
    );
    return result;
  }

  // Bounded to the scan window (2.10): a finding can only reference captures
  // that existed when it was created, and every capture in this scan was
  // created after `cutoff` — so findings older than the cutoff cannot link
  // to them. Without this filter the load grew with workspace age on every
  // scan, unbounded.
  const { data: existingFindings, error: findingsError } = await supabase
    .from("intelligence_findings")
    .select("id, evidence")
    .eq("workspace_id", workspaceId)
    .gte("created_at", cutoff);

  if (findingsError) {
    result.errors.push(`Failed to load existing findings: ${findingsError.message}`);
  }

  const ctx = await createScanPipelineContext({
    workspaceId,
    userId,
    llmCall,
    dryRun,
    rescan,
    enableHydration: true,
    result,
    findingIdsByCaptureId: collectFindingIdsByCaptureId(existingFindings),
    supabase,
  });

  const orderedEmails = sortCapturesInboundFirst(emails);
  for (const rawEmail of orderedEmails) {
    await processCaptureForScan(ctx, rawEmail);
  }

  const repair = await repairVendorFindings(workspaceId, supabase, {
    dryRun,
    senderRegistry: ctx.senderRegistry,
  });
  result.findingsDismissedAsVendor = repair.findingsDismissed;
  result.findingsMemoryRepaired = repair.findingsUpdated;

  return result;
}

export interface UnknownSenderRoutingResult {
  /** Ledger outcome to stamp on the capture (never `finding_created` with a fake id). */
  outcome: CaptureIntelligenceMeta["outcome"];
  findingId: string | null;
}

export interface UnknownSenderRoutingArgs {
  workspaceId: string;
  captureId: string;
  email: EmailToAnalyze;
  analysis: EmailAnalysis;
  paymentPayerHint: ReturnType<typeof getPaymentPayerHint>;
  dryRun: boolean;
  supabase: ReturnType<typeof createAdminClient>;
  result: DailyScanResult;
  senderRegistry?: SenderProfileRegistry;
}

/**
 * Handle an unknown-sender capture that carries signals.
 *
 * Plays canon Phase 2: create NOTHING — no play_runs row and no replacement
 * record. The held-sender / relationship-discovery pool the same cron runs
 * already covers unknown-sender surfacing; the retired "route-signal" play
 * only produced an invisible ghost card. The capture gets the honest
 * `signal_unrouted` outcome instead of `finding_created` with a foreign
 * play_runs id stuffed into extracted_data.intelligence.finding_id, which
 * made Sources Activity claim a confirmed finding the user could never see.
 *
 * Exported for test.
 */
export async function routeUnknownSenderSignal(
  _args: UnknownSenderRoutingArgs
): Promise<UnknownSenderRoutingResult> {
  // Signal found, sender unrouted — record that truth and stop.
  // No findingsCreated increment: nothing was created.
  return { outcome: "signal_unrouted", findingId: null };
}

/**
 * Persist actionable findings for a resolved person/org.
 *
 * Plays canon Phase 2: revenue_risk lands in intelligence_findings like every
 * other finding type (the retired "client-risk" play_run detour produced only
 * invisible ghost cards), with state stamped `needs_you` explicitly so it
 * renders in HQ "Heads up" and feeds people/orgs health scoring.
 *
 * Exported for test.
 */
export async function createFindingsFromAnalysis(args: {
  workspaceId: string;
  captureId: string;
  email: EmailToAnalyze;
  personId?: string;
  orgId?: string;
  analysis: EmailAnalysis;
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

  for (const finding of analysis.findings) {
    if (finding.confidence < MIN_FINDING_CONFIDENCE) continue;

    // revenue_risk is stamped `needs_you` explicitly regardless of
    // confidence. The generic rule would auto-handle at >= 85, but risk must
    // always get human attention — it can never silently auto-handle.
    const state =
      finding.type === "revenue_risk" ||
      forceNeedsYou ||
      finding.confidence < HIGH_CONFIDENCE_THRESHOLD
        ? "needs_you"
        : "auto_handled";

    const metadata = buildEvidenceMetadata(email, analysis, senderRegistry);

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
