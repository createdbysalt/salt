import type { ConnectorCategory, ExtractorResult } from "../types";
import type { Extractor, ExtractorContext } from "./base";
import { emptyResult } from "./base";
import { getConnectionStatus } from "../../connections";

export const stripeExtractor: Extractor = {
  category: "billing" as ConnectorCategory,
  supportedToolkits: ["stripe"],

  async extract(ctx: ExtractorContext): Promise<ExtractorResult> {
    const source = "stripe";

    if (!ctx.seed.email) {
      return emptyResult(source);
    }

    const connection = await getConnectionStatus("stripe", ctx.workspaceId);
    if (!connection.connected || !connection.composioConnectionId) {
      return emptyResult(source);
    }

    // TODO: Implement Stripe extraction
    // - Search customers by email
    // - Extract billing_email, address fields
    // - Infer relationship_type from payment history (has paid = client)
    // - Extract notes from customer metadata/description

    return emptyResult(source);
  },
};
