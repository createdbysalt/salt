"use server";

import { getTenantContext } from "@/app/_lib/tenancy";
import {
  loadSourcesPageData,
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
