import "server-only";

import { getConnectorsPageData } from "@/app/_features/connectors/queries";
import {
  getCaptureStreamPage,
  getDiscoveryStatus,
  getSeededCaptureTriggerFilters,
  hasCaptures,
} from "@/app/_features/capture/queries";
import { getAdmissionDecisions } from "@/app/_features/memory/queries/admission-decisions";
import { DEFAULT_CAPTURE_STREAM_PAGE_SIZE } from "@/app/_features/capture/stream-constants";
import { getCaptureCategoryMap } from "@/app/_lib/composio/capture-categories";
import { defaultPolicyForCategory } from "@/app/_features/capture/adapters/default-policy";
import { CUSTOMIZE_CATEGORY_ORDER } from "@/app/_features/capture/adapters/rule-entities";
import { getRules } from "@/app/_features/capture/services/rules-manager";
import type { ConnectorCategory } from "@/app/_lib/composio/enrichment/types";
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
    keptOut: null,
    discovery: null,
    customize: null,
  };
}

/**
 * Sources → Customize (2026-08-10): intake policy organized by capture
 * category. Categories render only when they have ≥1 connected,
 * capture-capable account (non-capture connectors have nothing to
 * customize). Seeded upstream filters render live from
 * connector_trigger_types through the default-policy model — the
 * transparency copy can never drift from the DB.
 */
async function loadCustomizeTabData(
  workspaceId: string,
): Promise<CustomizeTabData> {
  const [connectors, categoryMap, allRules] = await Promise.all([
    getConnectorsPageData(),
    getCaptureCategoryMap(),
    getRules(workspaceId, { limit: 500 }),
  ]);

  // Group connected, capture-capable accounts by capture category.
  const accountsByCategory = new Map<ConnectorCategory, CustomizeTabData["categories"][number]["accounts"]>();
  for (const definition of connectors?.catalog ?? []) {
    if (!definition.providerKey) continue;
    const status = connectors?.connectors[definition.id];
    const capture = connectors?.captureByConnector[definition.id];
    if (!status?.connected || !capture?.capable) continue;
    const category = categoryMap.get(definition.providerKey);
    if (!category) continue;

    const accounts = accountsByCategory.get(category) ?? [];
    accounts.push({
      provider: definition.providerKey,
      name: definition.name,
      label: status.label ?? null,
      captureEnabled: capture.enabled,
      scope: capture.scope,
    });
    accountsByCategory.set(category, accounts);
  }

  const seededFilters = await getSeededCaptureTriggerFilters(
    [...accountsByCategory.values()].flatMap((accounts) =>
      accounts.map((account) => account.provider),
    ),
  );

  const categories = CUSTOMIZE_CATEGORY_ORDER.filter((category) =>
    accountsByCategory.has(category),
  ).map((category) => {
    const accounts = accountsByCategory.get(category) ?? [];
    const providers = new Set(accounts.map((account) => account.provider));
    return {
      category,
      accounts,
      policy: defaultPolicyForCategory(
        category,
        seededFilters.filter((filter) => providers.has(filter.provider)),
      ),
      rules: allRules.filter(
        (rule) => rule.provider !== null && providers.has(rule.provider),
      ),
    };
  });

  return {
    categories,
    workspaceRules: allRules.filter((rule) => rule.provider === null),
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
    const [streamPage, hasCaptureData, admissions, discovery] =
      await Promise.all([
        getCaptureStreamPage(workspaceId, {
          page: 1,
          pageSize: DEFAULT_CAPTURE_STREAM_PAGE_SIZE,
        }),
        hasCaptures(workspaceId),
        getAdmissionDecisions(workspaceId),
        getDiscoveryStatus(workspaceId),
      ]);

    return {
      ...base,
      streamCaptures: streamPage.captures,
      streamTotalCount: streamPage.totalCount,
      streamCounts: streamPage.counts,
      hasCaptureData,
      workspaceId,
      keptOut: {
        count: admissions.keptOutCount,
        sample: admissions.keptOutSample,
      },
      discovery,
    };
  }

  return { ...base, workspaceId: workspaceId ?? null };
}
