"use server";

import { getTenantContext } from "@/app/_lib/tenancy";
import { getWorkspaceMemberOrNull } from "@/app/_lib/tenancy/guards";
import {
  getToolkitBrowserData,
  type ToolkitBrowserToolkit,
} from "../toolkit-browser";

export type BrowseToolkitResult =
  | { ok: true; toolkits: ToolkitBrowserToolkit[] }
  | { ok: false; message: string };

/**
 * Live toolkit browser for the playbook authoring path: the workspace's
 * connected apps with their approved actions and compact input schemas.
 */
export async function browseConnectedToolkitAction(): Promise<BrowseToolkitResult> {
  try {
    const { context } = await getTenantContext();
    const member = getWorkspaceMemberOrNull(context);
    if (!member) {
      return { ok: false, message: "Sign in to browse your connected apps." };
    }
    const toolkits = await getToolkitBrowserData(member.id);
    return { ok: true, toolkits };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not load connected apps.",
    };
  }
}
