import { z } from "zod";

export interface AIInsight {
  statement: string;
  supporting_data: Record<string, unknown>;
  recommended_action: string;
  deep_link: string;
}

export const AIInsightSchema = z.object({
  statement: z.string().min(1),
  supporting_data: z.record(z.string(), z.unknown()),
  recommended_action: z.string().min(1),
  deep_link: z.string().regex(/^\/[a-zA-Z0-9/_-]*$/),
});

export const AIInsightsArraySchema = z.array(AIInsightSchema).max(10);
