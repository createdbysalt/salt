import type { ConnectorCategory, ExtractorResult } from "../types";
import type { Extractor, ExtractorContext } from "./base";
import { emptyResult } from "./base";
import { getConnectionStatusAdmin } from "../../connections";

export const calendarExtractor: Extractor = {
  category: "calendar" as ConnectorCategory,
  supportedToolkits: ["googlecalendar", "outlook_calendar", "cal"],

  async extract(ctx: ExtractorContext): Promise<ExtractorResult> {
    const source = "calendar";

    if (!ctx.seed.email) {
      return emptyResult(source);
    }

    const connection = await getConnectionStatusAdmin("googlecalendar", ctx.workspaceId);
    if (!connection.connected || !connection.composioConnectionId) {
      return emptyResult(source);
    }

    // TODO: Implement calendar extraction
    // - Search events with attendee matching seed.email
    // - Extract timezone from event times
    // - Extract organization from attendee domain patterns
    // - Extract notes from event descriptions/titles

    return emptyResult(source);
  },
};
