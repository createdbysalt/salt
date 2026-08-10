"use server";

import { z } from "zod";
import { getTenantContext } from "@/app/_lib/tenancy";
import { getWorkspaceMemberOrNull } from "@/app/_lib/tenancy/guards";
import { getCaptureStreamPage, type CaptureStreamPage } from "../queries";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const CaptureStreamPageSchema = z
  .object({
    page: z.number().int().min(1),
    pageSize: z.union([z.literal(25), z.literal(50), z.literal(100)]),
    search: z.string().trim().max(200).optional(),
    state: z
      .enum(["all", "queued", "watching", "no-signal", "processing", "error"])
      .optional(),
    area: z
      .enum([
        "all",
        "email",
        "calendar",
        "billing",
        "storage",
        "messaging",
        "meetings",
        "crm",
        "projects",
      ])
      .optional(),
    dateFrom: z.string().regex(ISO_DATE).optional(),
    dateTo: z.string().regex(ISO_DATE).optional(),
  })
  .refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, {
    message: "dateFrom must be on or before dateTo",
  });

/**
 * Paged, filtered fetch for the Sources → Activity stream. Replaces the
 * cursor-based load-more action: filtering and search happen server-side so
 * they apply across all pages, and totalCount is exact.
 */
export async function getCaptureStreamPageAction(
  input: unknown,
): Promise<CaptureStreamPage> {
  const params = CaptureStreamPageSchema.parse(input);
  const { context } = await getTenantContext();
  const workspace = getWorkspaceMemberOrNull(context);
  if (!workspace) {
    throw new Error("Not signed in");
  }
  return getCaptureStreamPage(workspace.id, params);
}
