import "server-only";

import { getConnectorsPageData } from "@/app/_features/connectors/queries";
import {
  getCaptureStreamPage,
  getSeededCaptureTriggerFilters,
  getWeeklyGateProofRows,
  hasCaptures,
} from "@/app/_features/capture/queries";
import { DEFAULT_CAPTURE_STREAM_PAGE_SIZE } from "@/app/_features/capture/stream-constants";
import { getCaptureCategoryMap } from "@/app/_lib/composio/capture-categories";
import {
  defaultPolicyForArea,
  renderDiscoveryCadenceLine,
  renderWhenItSyncs,
} from "@/app/_features/capture/adapters/default-policy";
import { createClient } from "@/app/_lib/supabase/server";
import { summarizeGateProofCounts } from "@/app/_features/capture/utils/gate-proof-counts";
import { getCaptureGatePolicy } from "@/app/_features/capture/actions/gate-policy";
import {
  CATEGORY_TO_AREA,
  CUSTOMIZE_AREA_ORDER,
  type CustomizeArea,
} from "@/app/_features/capture/adapters/rule-entities";
import { getRules } from "@/app/_features/capture/services/rules-manager";
import {
  parseSourcesTab,
  type SourcesTab,
} from "./sources-tab-routing";
import {
  EMPTY_CONNECTORS,
  type CustomizeTabData,
  type SourcesTabData,
} from "./sources-tab-data";

export type SourcesPageData = SourcesTabData;

export { parseSourcesTab };
export type { SourcesTab };

export function emptySourcesPageData(): SourcesPageData {
  return {
    connectors: EMPTY_CONNECTORS,
    streamCaptures: [],
    streamTotalCount: 0,
    streamCounts: null,
    hasCaptureData: false,
    workspaceId: null,
    customize: null,
  };
}

/**
 * The workspace's plan tier, for the email area's discovery-cadence line.
 * Null on error or missing row — the copy's fail-safe reads it as Starter.
 */
async function getWorkspaceTier(workspaceId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_subscriptions")
    .select("tier")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) {
    console.error("[sources] workspace tier query error:", error.message);
    return null;
  }
  return data?.tier ?? null;
}

/**
 * Sources → Customize (2026-08-10): intake policy organized by intake AREA
 * (Email, Messaging, Projects… — the same vocabulary as the Activity area
 * filter). Areas render only when they have ≥1 connected, capture-capable
 * account (non-capture connectors have nothing to customize). Seeded
 * upstream filters render live from connector_trigger_types through the
 * default-policy model — the transparency copy can never drift from the DB.
 */
async function loadCustomizeTabData(
  workspaceId: string,
): Promise<CustomizeTabData> {
  const [connectors, categoryMap, allRules, gatePolicy, proofRows, tier] =
    await Promise.all([
      getConnectorsPageData(),
      getCaptureCategoryMap(),
      getRules(workspaceId, { limit: 500 }),
      getCaptureGatePolicy(workspaceId),
      getWeeklyGateProofRows(workspaceId),
      getWorkspaceTier(workspaceId),
    ]);

  const resolveArea = (provider: string): CustomizeArea | null => {
    const category = categoryMap.get(provider);
    return category ? CATEGORY_TO_AREA[category] : null;
  };
  const proofByArea = summarizeGateProofCounts(proofRows, resolveArea);

  // Group connected, capture-capable accounts by intake area (engineering
  // categories fold in via CATEGORY_TO_AREA — documents → storage, …).
  const accountsByArea = new Map<CustomizeArea, CustomizeTabData["areas"][number]["accounts"]>();
  for (const definition of connectors?.catalog ?? []) {
    if (!definition.providerKey) continue;
    const status = connectors?.connectors[definition.id];
    const capture = connectors?.captureByConnector[definition.id];
    if (!status?.connected || !capture?.capable) continue;
    const category = categoryMap.get(definition.providerKey);
    if (!category) continue;
    const area = CATEGORY_TO_AREA[category];

    const accounts = accountsByArea.get(area) ?? [];
    accounts.push({
      provider: definition.providerKey,
      name: definition.name,
      label: status.label ?? null,
    });
    accountsByArea.set(area, accounts);
  }

  const seededFilters = await getSeededCaptureTriggerFilters(
    [...accountsByArea.values()].flatMap((accounts) =>
      accounts.map((account) => account.provider),
    ),
  );

  const areas = await Promise.all(
    CUSTOMIZE_AREA_ORDER.filter((area) => accountsByArea.has(area)).map(
      async (area) => {
        const accounts = accountsByArea.get(area) ?? [];
        const providers = new Set(accounts.map((account) => account.provider));
        return {
          area,
          accounts,
          policy: defaultPolicyForArea(
            area,
            seededFilters.filter((filter) => providers.has(filter.provider)),
          ),
          // The area's rules: area-scoped rows (provider NULL + area — written
          // from this view, covering every account in the area) plus legacy
          // provider-scoped rows for the area's connected providers.
          rules: allRules.filter(
            (rule) =>
              rule.area === area ||
              (rule.provider !== null && providers.has(rule.provider)),
          ),
          proof: proofByArea.get(area) ?? null,
          whenItSyncs: [
            ...accounts
              .map((account) => renderWhenItSyncs(account.provider))
              .filter((line): line is string => line !== null),
            // Discovery is Lane B work on the held email pool — its
            // tier-gated cadence belongs in the email area's rhythm.
            ...(area === "email" ? [renderDiscoveryCadenceLine(tier)] : []),
          ],
        };
      },
    ),
  );

  return {
    areas,
    // Everything not tied to one account: workspace-wide rules (both NULL)
    // plus area-scoped rules, which render here tagged with their area.
    workspaceRules: allRules.filter((rule) => rule.provider === null),
    gatePolicy,
  };
}

/**
 * Fetch only the data required for the active Sources tab.
 */
export async function loadSourcesPageData(options: {
  tab: SourcesTab;
  workspaceId: string | undefined;
}): Promise<SourcesPageData> {
  const { tab, workspaceId } = options;
  const base = emptySourcesPageData();

  if (tab === "connectors") {
    const connectors = await getConnectorsPageData();
    return {
      ...base,
      connectors: connectors ?? EMPTY_CONNECTORS,
      workspaceId: workspaceId ?? null,
    };
  }

  if (tab === "customize") {
    if (!workspaceId) {
      return { ...base, workspaceId: null };
    }
    const customize = await loadCustomizeTabData(workspaceId);
    return { ...base, workspaceId, customize };
  }

  if (workspaceId) {
    const [streamPage, hasCaptureData] = await Promise.all([
      getCaptureStreamPage(workspaceId, {
        page: 1,
        pageSize: DEFAULT_CAPTURE_STREAM_PAGE_SIZE,
      }),
      hasCaptures(workspaceId),
    ]);

    return {
      ...base,
      streamCaptures: streamPage.captures,
      streamTotalCount: streamPage.totalCount,
      streamCounts: streamPage.counts,
      hasCaptureData,
      workspaceId,
    };
  }

  return { ...base, workspaceId: workspaceId ?? null };
}
