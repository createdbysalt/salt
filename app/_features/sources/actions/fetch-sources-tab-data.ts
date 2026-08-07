"use server";

import { getTenantContext } from "@/app/_lib/tenancy";
import {
  loadSourcesPageData,
  parseSourcesTab,
  type SourcesTab,
} from "../load-sources-page-data";
import type { SourcesTabData } from "../sources-tab-data";

export async function fetchSourcesTabData(input: {
  tab: SourcesTab;
}): Promise<SourcesTabData> {
  const { context } = await getTenantContext();
  const workspaceId = context.workspace?.id;

  return loadSourcesPageData({ tab: input.tab, workspaceId });
}

export async function fetchSourcesTabDataFromSearchParams(searchParams: {
  tab?: string | null;
}): Promise<SourcesTabData> {
  const tab = parseSourcesTab(searchParams.tab ?? null);
  return fetchSourcesTabData({ tab });
}
