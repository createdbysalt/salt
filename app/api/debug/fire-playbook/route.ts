import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import {
  dispatchSignalTrigger,
  findPlaybooksForSignal,
  isPlaybookEnabled,
  type SignalTriggerContext,
} from "@/app/_features/plays/playbooks/trigger-dispatch";
import { getPlaybookBySlug } from "@/app/_features/plays/playbooks/schema/v2/discovery";
import {
  buildExecutionContextV2,
  executePlaybookV2,
} from "@/app/_features/plays/playbooks/schema/v2/executor";
import { resolveWorkspaceActor } from "@/app/_features/plays/services/workspace-actor";
import { getConnectedCategories } from "@/app/_lib/composio/category-fetcher";
import { resolveCapabilityTool } from "@/app/_lib/composio/capability-resolver";
import { getConnectionStatusAdmin } from "@/app/_lib/composio/connections";
import { getApprovedToolClassification } from "@/app/_lib/composio/classification-store";

/**
 * Manual dispatch harness (Phase 0 playbook loop verification).
 *
 * Dev-only. Runs inside the dev server process so it uses the same env
 * (Supabase, Composio, OpenAI) as the app.
 *
 * GET  /api/debug/fire-playbook
 *   Inspect: workspaces, connected categories, trust level, disabled
 *   playbooks, and recent play_runs.
 *
 * POST /api/debug/fire-playbook
 *   Fire a signal through dispatchSignalTrigger and return the full
 *   DispatchResult list (including skip reasons) plus any play_runs rows
 *   created for the workspace in the last 5 minutes.
 */

function devOnly(): NextResponse | null {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Development only" }, { status: 403 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const guard = devOnly();
  if (guard) return guard;

  const probe = request.nextUrl.searchParams.get("probe");
  const probeWorkspace = request.nextUrl.searchParams.get("workspaceId");
  if (probe === "env") {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
    return NextResponse.json({
      supabaseHost: url ? new URL(url).host : null,
    });
  }
  if (probe === "raw") {
    const name = request.nextUrl.searchParams.get("name") ?? "tool_capabilities";
    if (!/^[a-z_][a-z0-9_]*$/.test(name)) {
      return NextResponse.json({ error: "invalid table name" }, { status: 400 });
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const res = await fetch(`${url}/rest/v1/${name}?select=*&limit=3`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const text = await res.text();
    return NextResponse.json({
      table: name,
      status: res.status,
      body: text.slice(0, 2000),
    });
  }
  if (probe === "table") {
    const name = request.nextUrl.searchParams.get("name");
    if (!name || !/^[a-z_][a-z0-9_]*$/.test(name)) {
      return NextResponse.json({ error: "invalid table name" }, { status: 400 });
    }
    const admin = createAdminClient();
    const { count, error } = await admin
      .from(name as never)
      .select("*", { count: "exact", head: true });
    return NextResponse.json({
      table: name,
      rows: error ? null : (count ?? 0),
      error: error
        ? { message: error.message, code: error.code, details: error.details, hint: error.hint }
        : null,
    });
  }
  if (probe === "migrations") {    const admin = createAdminClient();
    const { data, error } = await admin
      .from("supabase_migrations.schema_migrations" as never)
      .select("version")
      .order("version", { ascending: false })
      .limit(50);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({
      latestMigrations: (data as Array<{ version: string }>).map((r) => r.version),
      seedApplied: (data as Array<{ version: string }>).some(
        (r) => r.version === "20260707160000"
      ),
    });
  }
  if (probe && probeWorkspace) {
    return probeCapability(probe, probeWorkspace);
  }

  const admin = createAdminClient();

  const { data: workspaces } = await admin
    .from("workspaces")
    .select("id, name, trust_level")
    .limit(10);

  const report = [];
  for (const ws of workspaces ?? []) {
    const connected = await getConnectedCategories(ws.id);

    const { data: integrations } = await admin
      .from("workspace_integrations")
      .select("provider, is_active, composio_connection_id")
      .eq("workspace_id", ws.id);

    const { data: disabled } = await admin
      .from("profile_playbook_settings")
      .select("blueprint_slug, enabled")
      .eq("workspace_id", ws.id)
      .eq("enabled", false);

    const { data: recentRuns } = await admin
      .from("play_runs")
      .select("id, state, title, created_at, source_context")
      .eq("workspace_id", ws.id)
      .order("created_at", { ascending: false })
      .limit(10);

    const { data: billingRecords } = await admin
      .from("billing_records")
      .select("id, number, status, amount_cents, amount_paid_cents")
      .eq("workspace_id", ws.id)
      .order("created_at", { ascending: false })
      .limit(5);

    report.push({
      workspaceId: ws.id,
      name: ws.name,
      trustLevel: ws.trust_level ?? "read_only (unset)",
      connectedCategories: connected.map((c) => ({
        category: c.category,
        providers: c.providers,
      })),
      integrations: (integrations ?? []).map((i) => ({
        provider: i.provider,
        isActive: i.is_active,
        hasComposioConnection: Boolean(i.composio_connection_id),
      })),
      disabledPlaybooks: (disabled ?? []).map((d) => d.blueprint_slug),
      recentRuns: (recentRuns ?? []).map((r) => ({
        id: r.id,
        state: r.state,
        title: r.title,
        createdAt: r.created_at,
        playbook:
          (r.source_context as Record<string, unknown> | null)
            ?.playbook_slug ?? null,
      })),
      billingRecords: billingRecords ?? [],
    });
  }

  return NextResponse.json({ workspaces: report });
}

/**
 * Diagnose why a capability does/doesn't resolve: the tool_capabilities
 * rows, per-provider connection status, per-tool classification, and the
 * final resolver verdict.
 */
async function probeCapability(capabilityKey: string, workspaceId: string) {
  const admin = createAdminClient();

  const { data: rows } = await admin
    .from("tool_capabilities")
    .select("tool_slug, provider_key, priority")
    .eq("capability_key", capabilityKey)
    .order("priority", { ascending: true });

  const candidates = [];
  for (const row of rows ?? []) {
    const status = await getConnectionStatusAdmin(row.provider_key, workspaceId);
    const policy = await getApprovedToolClassification(row.tool_slug);
    candidates.push({
      toolSlug: row.tool_slug,
      provider: row.provider_key,
      priority: row.priority,
      connected: status.connected,
      connectionId: status.composioConnectionId ? "present" : null,
      classification: policy
        ? { risk: policy.risk, requiresHumanConfirmation: policy.requiresHumanConfirmation }
        : null,
    });
  }

  const resolved = await resolveCapabilityTool(capabilityKey, workspaceId);

  const { count } = await admin
    .from("tool_capabilities")
    .select("*", { count: "exact", head: true });

  const { data: allKeys } = await admin
    .from("tool_capabilities")
    .select("capability_key")
    .limit(500);
  const distinctKeys = [...new Set((allKeys ?? []).map((r) => r.capability_key as string))].sort();

  return NextResponse.json({
    capabilityKey,
    workspaceId,
    candidateRows: candidates,
    tableTotals: { rows: count ?? 0, distinctCapabilityKeys: distinctKeys },
    resolved: resolved
      ? {
          toolSlug: resolved.toolSlug,
          provider: resolved.provider,
          risk: resolved.risk,
        }
      : null,
  });
}

const FireSchema = z.object({
  workspaceId: z.string().uuid(),
  signalKey: z.string().min(1),
  entityId: z.string().min(1).optional(),
  entitySurface: z
    .enum([
      "person",
      "organization",
      "work",
      "billing",
      "meeting",
      "resource",
      "workspace",
    ])
    .optional(),
  entityLabel: z.string().optional(),
  evidence: z.record(z.string(), z.unknown()).optional(),
});

const SeedSchema = z.object({
  action: z.literal("seed-capabilities"),
});

const DirectSchema = z.object({
  mode: z.literal("direct"),
  workspaceId: z.string().uuid(),
  playbookSlug: z.string().min(1),
  signalKey: z.string().optional(),
  entityId: z.string().optional(),
  entitySurface: z
    .enum([
      "person",
      "organization",
      "work",
      "billing",
      "meeting",
      "resource",
      "workspace",
    ])
    .optional(),
  entityLabel: z.string().optional(),
});

/**
 * Run a playbook through executePlaybookV2 directly (no dispatch, no
 * cooldown) and return the full ExecutionResultV2 — the X-ray for
 * diagnosing silent step failures.
 */
async function runDirect(input: z.infer<typeof DirectSchema>) {
  const parsed = getPlaybookBySlug(input.playbookSlug);
  if (!parsed) {
    return NextResponse.json(
      { error: `Playbook "${input.playbookSlug}" not found` },
      { status: 404 }
    );
  }

  const userId = await resolveWorkspaceActor(input.workspaceId);
  if (!userId) {
    return NextResponse.json(
      { error: "No workspace member to act as" },
      { status: 400 }
    );
  }

  const trigger = parsed.definition.trigger;
  const context = await buildExecutionContextV2(
    input.workspaceId,
    userId,
    {
      type: "signal",
      signalKey:
        input.signalKey ??
        (trigger?.type === "signal" ? trigger.signal : undefined),
      entityId: input.entityId,
      entitySurface: input.entitySurface,
      entityLabel: input.entityLabel,
    },
    parsed.definition.voice,
    undefined,
    input.playbookSlug
  );

  const result = await executePlaybookV2(parsed.definition, context);

  return NextResponse.json({
    playbook: input.playbookSlug,
    trustLevel: context.trustLevel,
    connectedCategories: [...context.connectedCategories],
    result,
  });
}

/** Idempotent re-seed of tool_capabilities (mirrors the repair migration). */
async function seedCapabilities() {
  const admin = createAdminClient();
  const rows = [
    { capability_key: "read_email", tool_slug: "GMAIL_FETCH_EMAILS", provider_key: "gmail", priority: 10, notes: "Primary email reader" },
    { capability_key: "send_message", tool_slug: "GMAIL_SEND_EMAIL", provider_key: "gmail", priority: 10 },
    { capability_key: "draft_message", tool_slug: "GMAIL_CREATE_EMAIL_DRAFT", provider_key: "gmail", priority: 10 },
    { capability_key: "read_contacts", tool_slug: "GMAIL_FETCH_EMAILS", provider_key: "gmail", priority: 50, notes: "Contacts surface via message senders until a dedicated tool is mapped" },
    { capability_key: "read_calendar", tool_slug: "GOOGLECALENDAR_EVENTS_LIST", provider_key: "googlecalendar", priority: 10 },
    { capability_key: "create_event", tool_slug: "GOOGLECALENDAR_CREATE_EVENT", provider_key: "googlecalendar", priority: 10 },
    { capability_key: "update_event", tool_slug: "GOOGLECALENDAR_UPDATE_EVENT", provider_key: "googlecalendar", priority: 10 },
    { capability_key: "read_bookings", tool_slug: "CAL_LIST_BOOKINGS", provider_key: "cal", priority: 10 },
    { capability_key: "read_files", tool_slug: "GOOGLEDRIVE_FIND_FILE", provider_key: "googledrive", priority: 10 },
    { capability_key: "read_files", tool_slug: "GOOGLEDRIVE_LIST_FILES", provider_key: "googledrive", priority: 20, notes: "Fallback: list when no query" },
    { capability_key: "read_payments", tool_slug: "STRIPE_LIST_CHARGES", provider_key: "stripe", priority: 10 },
    { capability_key: "read_invoices", tool_slug: "STRIPE_LIST_INVOICES", provider_key: "stripe", priority: 10 },
    { capability_key: "create_invoice", tool_slug: "STRIPE_CREATE_INVOICE", provider_key: "stripe", priority: 10 },
  ];

  const before = await admin
    .from("tool_capabilities")
    .select("*", { count: "exact", head: true });

  const { error } = await admin
    .from("tool_capabilities")
    .upsert(rows, { onConflict: "capability_key,tool_slug", ignoreDuplicates: true });

  const after = await admin
    .from("tool_capabilities")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({
    rowsBefore: before.count ?? 0,
    rowsAfter: after.count ?? 0,
    error: error?.message ?? null,
  });
}

export async function POST(request: NextRequest) {
  const guard = devOnly();
  if (guard) return guard;

  const body = await request.json();

  const seed = SeedSchema.safeParse(body);
  if (seed.success) {
    return seedCapabilities();
  }

  const direct = DirectSchema.safeParse(body);
  if (direct.success) {
    return runDirect(direct.data);
  }

  const parsed = FireSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const entitySurface = input.entitySurface ?? "workspace";
  const entityId =
    input.entityId ??
    (entitySurface === "workspace" ? input.workspaceId : undefined);

  if (!entityId) {
    return NextResponse.json(
      { error: "entityId required for non-workspace surfaces" },
      { status: 400 }
    );
  }

  // Pre-flight: which playbooks declare this signal, and are they enabled?
  const matching = findPlaybooksForSignal(input.signalKey);
  const enabledMap: Record<string, boolean> = {};
  for (const pb of matching) {
    enabledMap[pb.slug] = await isPlaybookEnabled(input.workspaceId, pb.slug);
  }

  const context: SignalTriggerContext = {
    workspaceId: input.workspaceId,
    signalKey: input.signalKey,
    entityId,
    entitySurface,
    entityLabel: input.entityLabel,
    evidence: {
      emission_type: "manual_harness",
      ...input.evidence,
    },
  };

  const firedAt = new Date();
  const results = await dispatchSignalTrigger(context);

  // Collect play_runs created for this workspace since we fired.
  const admin = createAdminClient();
  const { data: newRuns } = await admin
    .from("play_runs")
    .select(
      "id, state, title, preview, target_type, target_id, paused_at_step, approval_context, source_context, metadata, created_at"
    )
    .eq("workspace_id", input.workspaceId)
    .gte("created_at", firedAt.toISOString())
    .order("created_at", { ascending: false });

  const { data: activity } = await admin
    .from("activity_entries")
    .select("id, action, title, detail, metadata, created_at")
    .eq("workspace_id", input.workspaceId)
    .gte("created_at", firedAt.toISOString())
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({
    signal: input.signalKey,
    matchingPlaybooks: matching.map((p) => ({
      slug: p.slug,
      layer: p.layer,
      section: p.section,
      surface: p.surface ?? null,
      enabled: enabledMap[p.slug] ?? false,
    })),
    results,
    newPlayRuns: newRuns ?? [],
    activityEntries: activity ?? [],
  });
}
