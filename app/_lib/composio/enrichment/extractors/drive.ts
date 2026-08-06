import type { ConnectorCategory, ExtractorResult } from "../types";
import type { Extractor, ExtractorContext } from "./base";
import { emptyResult } from "./base";
import { getConnectionStatusAdmin } from "../../connections";

export const driveExtractor: Extractor = {
  category: "storage" as ConnectorCategory,
  supportedToolkits: ["googledrive", "dropbox", "onedrive", "box"],

  async extract(ctx: ExtractorContext): Promise<ExtractorResult> {
    const source = "drive";

    const connection = await getConnectionStatusAdmin("googledrive", ctx.workspaceId);
    if (!connection.connected || !connection.composioConnectionId) {
      return emptyResult(source);
    }

    // TODO: Implement Drive extraction based on entity type
    // For person: search files shared with or mentioning the person
    // For org: search files in folders named after org or domain
    // For work: search files mentioning project name
    // For file: get metadata, sharing info, related files
    // For meeting: search files shared around meeting time
    // For billing: search invoices, contracts, receipts

    // Extraction would:
    // 1. Use GOOGLEDRIVE_LIST_FILES with query
    // 2. Get file metadata (name, size, created, modified, shared_with)
    // 3. Extract context notes from file names and folder structure
    // 4. For documents, potentially extract text content

    return emptyResult(source);
  },
};
